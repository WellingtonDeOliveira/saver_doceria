import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { harness, sweet } from "./harness";
test("fotos novas são validadas, substituídas com fallback e protegidas da limpeza quando referenciadas", async () => {
  const h = await harness();
  try {
    const c = (await (
      await h.request("/api/categories", "POST", { name: "Doces" })
    ).json()) as any;
    let p = (await (
      await h.request("/api/products", "POST", sweet(c.id))
    ).json()) as any;
    const png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#B9475F" },
    })
      .png()
      .toBuffer();
    const upload = async (
      bytes: Uint8Array = png,
      mime = "image/png",
      fail = false,
    ) =>
      h.admin.fetch("http://localhost:8788/api/media", {
        method: "POST",
        headers: {
          Origin: "http://localhost:8788",
          "Cf-Access-Jwt-Assertion": h.auth,
          "Content-Type": mime,
          ...(fail ? { "X-Test-KV-Failure": "put" } : {}),
        },
        body: bytes,
      });
    assert.equal(
      (await upload(new TextEncoder().encode("<svg/>"), "image/svg+xml"))
        .status,
      415,
    );
    assert.equal((await upload(new Uint8Array([1, 2, 3]))).status, 400);
    const withoutPixels: Buffer[] = [png.subarray(0, 8)];
    for (let offset = 8; offset < png.length;) {
      const length = png.readUInt32BE(offset),
        end = offset + length + 12;
      if (png.toString("ascii", offset + 4, offset + 8) !== "IDAT")
        withoutPixels.push(png.subarray(offset, end));
      offset = end;
    }
    assert.equal(
      (await upload(Buffer.concat(withoutPixels))).status,
      400,
      "PNG sem dados de pixels deve ser recusado",
    );
    const badCrc = Buffer.from(png);
    badCrc[badCrc.length - 1] ^= 1;
    assert.equal(
      (await upload(badCrc)).status,
      400,
      "PNG com CRC inválido deve ser recusado",
    );
    assert.equal((await upload(new Uint8Array(256 * 1024 + 1))).status, 413);
    for (const [mime, bytes] of [
      ["image/jpeg", await sharp(png).jpeg().toBuffer()],
      ["image/webp", await sharp(png).webp().toBuffer()],
    ] as const) {
      const valid = await upload(bytes, mime);
      assert.equal(valid.status, 201);
      const staged = (await valid.json()) as { id: string };
      assert.equal(
        (await h.request(`/api/media/${staged.id}`, "DELETE")).status,
        200,
      );
    }
    const firstResponse = await upload();
    assert.equal(firstResponse.status, 201);
    const first = (await firstResponse.json()) as any;
    assert.equal(
      (await h.publicWorker.fetch(`https://public.test/media/${first.id}`))
        .status,
      404,
    );
    assert.equal((await h.publicWorker.fetch(first.preview_url)).status, 200);
    let attach = await h.request(`/api/products/${p.id}/photo`, "PUT", {
      media_id: first.id,
      version: p.version,
    });
    assert.equal(attach.status, 200);
    p = await attach.json();
    const firstImage = await h.publicWorker.fetch(
      `https://public.test/media/${first.id}`,
    );
    assert.equal(firstImage.headers.get("Content-Type"), "image/png");
    assert.equal((await upload(png, "image/png", true)).status, 503);
    assert.equal(
      ((await (await h.request(`/api/products/${p.id}`)).json()) as any)
        .media_id,
      first.id,
    );
    const second = (await (await upload()).json()) as any;
    await h.db
      .prepare(
        `CREATE TRIGGER fail_photo_save BEFORE UPDATE OF media_id ON products BEGIN SELECT RAISE(ABORT,'simulated storage failure'); END`,
      )
      .run();
    assert.equal(
      (
        await h.request(`/api/products/${p.id}/photo`, "PUT", {
          media_id: second.id,
          version: p.version,
        })
      ).status,
      503,
    );
    assert.equal(
      ((await (await h.request(`/api/products/${p.id}`)).json()) as any)
        .media_id,
      first.id,
    );
    await h.db.prepare("DROP TRIGGER fail_photo_save").run();
    const stale = await h.request(`/api/products/${p.id}/photo`, "PUT", {
      media_id: second.id,
      version: 1,
    });
    assert.equal(stale.status, 409);
    assert.equal(
      ((await (await h.request(`/api/products/${p.id}`)).json()) as any)
        .media_id,
      first.id,
    );
    const secondBytes = await h.photos.get(second.id, "arrayBuffer");
    await h.photos.delete(second.id); // External KV boundary: propagation has not reached this location.
    assert.equal(
      (
        await h.request(`/api/products/${p.id}/photo`, "PUT", {
          media_id: second.id,
          version: p.version,
        })
      ).status,
      425,
    );
    await h.photos.put(second.id, secondBytes!);
    attach = await h.request(`/api/products/${p.id}/photo`, "PUT", {
      media_id: second.id,
      version: p.version,
    });
    assert.equal(attach.status, 200);
    p = await attach.json();
    assert.notEqual(p.media_id, first.id);
    await h.photos.delete(second.id);
    const fallback = await h.publicWorker.fetch(
      `https://public.test/media/${second.id}`,
    );
    assert.equal(fallback.status, 200);
    assert.equal(fallback.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(Buffer.from(await fallback.arrayBuffer()), png);
    assert.equal(
      (await h.request(`/api/media/${first.id}`, "DELETE")).status,
      409,
    );
    assert.equal(
      (await h.request(`/api/media/${second.id}`, "DELETE")).status,
      409,
    );
    const orphan = (await (await upload()).json()) as any;
    assert.equal(
      (await h.request(`/api/media/${orphan.id}`, "DELETE")).status,
      200,
    );
    assert.equal((await h.publicWorker.fetch(orphan.preview_url)).status, 404);
    await h.photos.put(second.id, secondBytes!);
    const { stock, media_id, ...fields } = p;
    assert.equal(
      (
        await h.request(`/api/products/${p.id}`, "PATCH", {
          ...fields,
          published: false,
          archived: true,
        })
      ).status,
      200,
    );
    assert.equal(
      (await h.publicWorker.fetch(`https://public.test/media/${second.id}`))
        .status,
      404,
    );
    assert.equal(
      (await h.request(`/api/media/${second.id}/preview`)).status,
      200,
    );
    assert.equal(
      (
        await h.request(`/api/media/${second.id}/preview`, "GET", undefined, {
          token: null,
        })
      ).status,
      401,
    );
  } finally {
    await h.dispose();
  }
});
