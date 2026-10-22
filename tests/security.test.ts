import { test } from "node:test";
import assert from "node:assert/strict";
import { harness } from "./harness";
test("Access valida assinatura, emissor, audiência, validade, e-mail e origem em todas as rotas", async () => {
  const h = await harness();
  try {
    for (const token of [
      null,
      "fake",
      await h.token("intruder@example.com"),
      await h.token(undefined, { issuer: "https://evil.test" }),
      await h.token(undefined, { audience: "public" }),
      await h.token(undefined, { expired: true }),
    ]) {
      assert.ok(
        [401, 403].includes(
          (
            await h.request(
              "/api/categories",
              "POST",
              { name: "Intruso" },
              { token },
            )
          ).status,
        ),
      );
      assert.ok(
        [401, 403].includes(
          (await h.request("/index.html", "GET", undefined, { token })).status,
        ),
      );
    }
    assert.equal(
      (
        await h.request(
          "/api/categories",
          "POST",
          { name: "CSRF" },
          { origin: "https://evil.test" },
        )
      ).status,
      403,
    );
    assert.deepEqual(await (await h.request("/api/categories")).json(), []);
    assert.equal(
      (
        await h.publicWorker.fetch("https://public.test/api/products", {
          method: "POST",
          body: "{}",
        })
      ).status,
      405,
    );
  } finally {
    await h.dispose();
  }
});
