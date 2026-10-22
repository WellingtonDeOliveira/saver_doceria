import type { Env } from "./env";
import { HttpError, json } from "./http";

export const backupTables = [
  "categories",
  "media",
  "products",
  "clients",
  "orders",
  "stock_movements",
  "order_revisions",
  "settings",
] as const;
export async function exportBackup(
  request: Request,
  env: Env,
  mediaId?: string,
) {
  if (request.method !== "GET") throw new HttpError(405, "Ação não permitida.");
  if (mediaId) {
    const media = await env.DB.prepare(
      "SELECT mime,state FROM media WHERE id=?",
    )
      .bind(mediaId)
      .first<{ mime: string; state: string }>();
    if (!media || media.state === "deleting")
      throw new HttpError(404, "Foto não encontrada.");
    const bytes = await env.PHOTOS.get(mediaId, "arrayBuffer");
    if (!bytes)
      throw new HttpError(
        425,
        "Foto ainda indisponível para backup. Tente novamente.",
      );
    return new Response(bytes, {
      headers: {
        "Content-Type": media.mime,
        "Cache-Control": "private, no-store",
      },
    });
  }
  const results = await env.DB.batch(
    backupTables.map((table) =>
      env.DB.prepare(`SELECT * FROM ${table} ORDER BY rowid`),
    ),
  );
  const data = {
    format: 1,
    created_at: new Date().toISOString(),
    tables: Object.fromEntries(
      backupTables.map((name, index) => [name, results[index].results]),
    ),
  };
  const encoded = JSON.stringify(data);
  if (new TextEncoder().encode(encoded).length > 8 * 1024 * 1024)
    throw new HttpError(
      413,
      "Backup excede 8 MiB de dados. Exporte D1 pelo Wrangler em janela de manutenção conforme o procedimento.",
    );
  return json(data);
}
