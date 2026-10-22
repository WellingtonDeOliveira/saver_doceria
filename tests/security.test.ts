import { test } from "node:test";
import assert from "node:assert/strict";
import { harness } from "./harness";
test("lista administrativa permite somente e-mails exatos e mantém validação de origem", async () => {
  const h = await harness({
    adminEmails: " owner@example.com, Sarah@example.com ",
  });
  try {
    for (const email of [
      "owner@example.com",
      "sarah@example.com",
      "SARAH@example.com",
    ]) {
      const token = await h.token(email);
      assert.equal(
        (await h.request("/index.html", "GET", undefined, { token })).status,
        200,
      );
      assert.equal(
        (await h.request("/api/categories", "POST", { name: email }, { token }))
          .status,
        201,
      );
      assert.equal(
        (
          await h.request(
            "/api/categories",
            "POST",
            { name: "CSRF" },
            { token, origin: "https://evil.test" },
          )
        ).status,
        403,
      );
    }
    for (const email of [
      "intruder@example.com",
      "sarah@example.com.evil.test",
      "not-sarah@example.com",
    ]) {
      const token = await h.token(email);
      for (const path of [
        "/",
        "/admin.js",
        "/api/clients",
        "/api/orders",
        "/api/backup",
      ]) {
        assert.equal(
          (await h.request(path, "GET", undefined, { token })).status,
          403,
        );
      }
    }
  } finally {
    await h.dispose();
  }
});

test("lista administrativa sem identidades válidas falha fechada", async () => {
  const h = await harness({ adminEmails: " , , " });
  try {
    assert.equal((await h.request("/api/session")).status, 503);
  } finally {
    await h.dispose();
  }
});
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
