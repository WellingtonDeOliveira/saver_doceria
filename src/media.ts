import { imageSize } from "image-size";
import type { Env } from "./env";
import { product, visibleProductSql } from "./catalog";
import { body, boundedBody, HttpError, integer, json, text } from "./http";
import { validatePng } from "./png";

const MAX_BYTES = 256 * 1024;
interface Media {
  id: string;
  mime: string;
  bytes: number;
  token: string;
  previous_id: string | null;
  state: string;
}
const reachable = `WITH RECURSIVE used(id) AS (
  SELECT media_id FROM products WHERE media_id IS NOT NULL
  UNION SELECT m.previous_id FROM media m JOIN used u ON m.id=u.id WHERE m.previous_id IS NOT NULL
)`;

async function validateImage(bytes: Uint8Array, mime: string) {
  try {
    const size = imageSize(bytes);
    const expected: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    if (
      size.type !== expected[mime] ||
      !size.width ||
      !size.height ||
      size.width > 1600 ||
      size.height > 1600
    )
      throw new Error();
    if (
      mime === "image/jpeg" &&
      (bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9)
    )
      throw new Error();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (mime === "image/webp" && view.getUint32(4, true) + 8 !== bytes.length)
      throw new Error();
    if (mime === "image/png") {
      await validatePng(bytes, size.width, size.height);
    }
  } catch {
    throw new HttpError(
      400,
      "Imagem inválida. Use JPEG, PNG ou WebP de até 1600 × 1600 pixels.",
    );
  }
}

export async function upload(request: Request, env: Env, actor: string) {
  const mime = request.headers.get("Content-Type") ?? "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
    throw new HttpError(415, "Use uma foto JPEG, PNG ou WebP.");
  const bytes = await boundedBody(request, MAX_BYTES);
  await validateImage(bytes, mime);
  const id = crypto.randomUUID(),
    token = crypto.randomUUID();
  // Reserve metadata first so quota/database failures cannot create untracked KV objects.
  await env.DB.prepare(
    "INSERT INTO media(id,mime,bytes,token,created_by) VALUES(?,?,?,?,?)",
  )
    .bind(id, mime, bytes.length, token, actor)
    .run();
  await env.PHOTOS.put(id, bytes);
  return json(
    {
      id,
      bytes: bytes.length,
      preview_url: `${env.PUBLIC_ORIGIN}/media/${id}?token=${token}`,
    },
    201,
  );
}

export async function attachPhoto(
  request: Request,
  env: Env,
  actor: string,
  id: string,
) {
  if (request.method !== "PUT") throw new HttpError(405, "Ação não permitida.");
  const data = await body(request),
    mediaId = text(data.media_id, "Foto"),
    version = integer(data.version, "Versão", 1);
  const current = await product(env, id);
  if (current.version !== version)
    throw new HttpError(
      409,
      "Produto alterado. Recarregue antes de trocar a foto.",
    );
  const image = await env.DB.prepare(
    "SELECT * FROM media WHERE id=? AND state='staged'",
  )
    .bind(mediaId)
    .first<Media>();
  if (!image)
    throw new HttpError(
      409,
      "Foto indisponível ou já utilizada. Envie a foto novamente.",
    );
  if (!(await env.PHOTOS.get(mediaId, "arrayBuffer")))
    throw new HttpError(
      425,
      "A foto ainda está sendo distribuída. A foto anterior continua salva. Tente novamente em instantes.",
    );
  const results = await env.DB.batch([
    env.DB.prepare(
      `UPDATE media SET state='active',product_id=?,previous_id=(SELECT media_id FROM products WHERE id=?)
      WHERE id=? AND state='staged' AND EXISTS(SELECT 1 FROM products WHERE id=? AND version=?)`,
    ).bind(id, id, mediaId, id, version),
    env.DB.prepare(
      `UPDATE products SET media_id=?,version=version+1,updated_by=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id=? AND version=? AND EXISTS(SELECT 1 FROM media WHERE id=? AND state='active' AND product_id=?)`,
    ).bind(mediaId, actor, id, version, mediaId, id),
  ]);
  if (!results[1].meta.changes)
    throw new HttpError(
      409,
      "Produto ou foto alterados em outra aba. Recarregue.",
    );
  return json(await product(env, id));
}

export async function servePhoto(request: Request, env: Env, id: string) {
  let image = await env.DB.prepare(
    "SELECT * FROM media WHERE id=? AND state!='deleting'",
  )
    .bind(id)
    .first<Media>();
  if (!image) throw new HttpError(404, "Foto não encontrada.");
  const preview =
    new URL(request.url).searchParams.get("token") === image.token &&
    image.state === "staged";
  if (
    !preview &&
    !(await env.DB.prepare(
      `SELECT 1 FROM products p JOIN categories c ON c.id=p.category_id
    WHERE p.media_id=? AND ${visibleProductSql}`,
    )
      .bind(id)
      .first())
  )
    throw new HttpError(404, "Foto não encontrada.");
  return imageResponse(request, env, image, id, preview);
}

export async function previewPhoto(request: Request, env: Env, id: string) {
  const image = await env.DB.prepare(
    "SELECT * FROM media WHERE id=? AND state!='deleting'",
  )
    .bind(id)
    .first<Media>();
  if (!image) throw new HttpError(404, "Foto não encontrada.");
  return imageResponse(request, env, image, id, true);
}

async function imageResponse(
  request: Request,
  env: Env,
  image: Media | null,
  id: string,
  preview: boolean,
) {
  const seen = new Set<string>();
  while (image && !seen.has(image.id)) {
    seen.add(image.id);
    const bytes = await env.PHOTOS.get(image.id, "arrayBuffer");
    if (bytes)
      return new Response(request.method === "HEAD" ? null : bytes, {
        headers: {
          "Content-Type": image.mime,
          "Cache-Control":
            preview || image.id !== id ? "no-store" : "public, max-age=300",
          "X-Content-Type-Options": "nosniff",
        },
      });
    image = image.previous_id
      ? await env.DB.prepare("SELECT * FROM media WHERE id=?")
          .bind(image.previous_id)
          .first<Media>()
      : null;
  }
  throw new HttpError(
    425,
    "Foto em distribuição. Tente novamente em instantes.",
  );
}

async function deleteOrphan(env: Env, id: string) {
  const claimed = await env.DB.prepare(
    `${reachable} UPDATE media SET state='deleting' WHERE id=? AND id NOT IN (SELECT id FROM used)`,
  )
    .bind(id)
    .run();
  if (!claimed.meta.changes) {
    if (
      !(await env.DB.prepare("SELECT id FROM media WHERE id=?")
        .bind(id)
        .first())
    )
      throw new HttpError(404, "Foto não encontrada.");
    throw new HttpError(
      409,
      "Foto ainda referenciada por um produto ou como alternativa de propagação.",
    );
  }
  await env.PHOTOS.delete(id);
  await env.DB.prepare("DELETE FROM media WHERE id=? AND state='deleting'")
    .bind(id)
    .run();
}
export async function cleanMedia(request: Request, env: Env, id?: string) {
  if (id && request.method === "DELETE") {
    await deleteOrphan(env, id);
    return json({ deleted: 1 });
  }
  if (!id && request.method === "POST") {
    const orphans = await env.DB.prepare(
      `${reachable} SELECT id FROM media WHERE id NOT IN(SELECT id FROM used)
      AND (created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day') OR state='deleting') LIMIT 50`,
    ).all<{ id: string }>();
    let deleted = 0;
    for (const row of orphans.results) {
      try {
        await deleteOrphan(env, row.id);
        deleted++;
      } catch (error) {
        if (!(error instanceof HttpError && error.status === 409)) throw error;
      }
    }
    return json({ deleted });
  }
  throw new HttpError(405, "Ação não permitida.");
}
