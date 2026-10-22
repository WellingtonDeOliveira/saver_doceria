import { test } from "node:test";
import assert from "node:assert/strict";
import { harness } from "./harness";

test("www redireciona ao HTTPS principal preservando caminho e consulta", async () => {
  const h = await harness();
  try {
    for (const method of ["GET", "HEAD"]) {
      const response = await h.publicWorker.fetch(
        "https://www.saverdoceria.com.br/doces?categoria=caixas&origem=menu",
        { method, redirect: "manual" },
      );
      assert.equal(response.status, 308);
      assert.equal(
        response.headers.get("Location"),
        "https://saverdoceria.com.br/doces?categoria=caixas&origem=menu",
      );
    }
    const staging = await h.publicWorker.fetch(
      "https://public.test/api/catalog",
    );
    assert.equal(staging.status, 200);
    assert.equal(staging.headers.get("Location"), null);
  } finally {
    await h.dispose();
  }
});
