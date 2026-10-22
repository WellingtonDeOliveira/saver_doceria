import { test } from "node:test";
import assert from "node:assert/strict";
import { harness, sweet } from "./harness";
test("entrada, saída e correção são atômicas, justificadas e idempotentes, inclusive após arquivar", async () => {
  const h = await harness();
  try {
    const c = (await (
      await h.request("/api/categories", "POST", { name: "Doces" })
    ).json()) as any;
    let p = (await (
      await h.request(
        "/api/products",
        "POST",
        sweet(c.id, { initial_stock: 2 }),
      )
    ).json()) as any;
    const current = async () =>
      (await (await h.request(`/api/products/${p.id}`)).json()) as any;
    const move = async (
      kind: string,
      quantity: number,
      key: string,
      reason = "",
      version = p.version,
    ) =>
      h.request(
        `/api/products/${p.id}/stock`,
        "POST",
        { kind, quantity, reason, version },
        { key },
      );
    assert.equal((await move("exit", 3, "insufficient")).status, 409);
    assert.equal((await current()).stock, 2);
    assert.equal((await move("entry", 1.5, "fraction")).status, 400);
    const version = p.version;
    assert.equal((await move("exit", 2, "sell")).status, 201);
    p = await current();
    assert.equal(p.stock, 0);
    assert.equal(
      (
        (await (
          await h.publicWorker.fetch("https://public.test/api/catalog")
        ).json()) as any
      ).products.length,
      0,
    );
    assert.equal((await move("exit", 2, "sell", "", version)).status, 200);
    assert.equal((await move("entry", 2, "sell")).status, 409);
    assert.equal((await move("correction", 4, "no-reason")).status, 400);
    assert.equal((await move("physical_return", 1, "return")).status, 400);
    assert.equal(
      (await move("entry", 5, "production", "Produção")).status,
      201,
    );
    p = await current();
    assert.equal(p.stock, 5);
    assert.equal(
      (await move("correction", 3, "count", "Contagem física")).status,
      201,
    );
    p = await current();
    assert.equal(p.stock, 3);
    const races = await Promise.all([
      move("exit", 3, "race-a"),
      move("exit", 3, "race-b"),
    ]);
    assert.deepEqual(races.map((r) => r.status).sort(), [201, 409]);
    p = await current();
    assert.equal(p.stock, 0);
    const { stock, media_id, ...edit } = p;
    assert.equal(
      (
        await h.request(`/api/products/${p.id}`, "PATCH", {
          ...edit,
          published: !!p.published,
          archived: true,
        })
      ).status,
      200,
    );
    const history = (await (
      await h.request(`/api/products/${p.id}/stock`)
    ).json()) as any[];
    assert.equal(history.length, 5);
    assert.equal(history.find((m) => m.kind === "correction").before_stock, 5);
    assert.equal(history.find((m) => m.kind === "correction").after_stock, 3);
  } finally {
    await h.dispose();
  }
});
