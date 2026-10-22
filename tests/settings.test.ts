import { test } from "node:test";
import assert from "node:assert/strict";
import { harness } from "./harness";

test("configurações exigem autorização, validam e persistem sem expor auditoria pública", async () => {
  const h = await harness();
  try {
    const input = {
      name: "Doceria <b>da Ana</b>",
      whatsapp: "5511999998888",
      greeting: "Olá!",
      notice: "Retirada até 18h",
      version: 1,
    };
    assert.equal(
      (await h.request("/api/settings", "PUT", input, { token: null })).status,
      401,
    );
    assert.equal(
      (await h.request("/api/settings", "PUT", { ...input, whatsapp: "12" }))
        .status,
      400,
    );
    const saved = await h.request("/api/settings", "PUT", input);
    assert.equal(saved.status, 200, await saved.clone().text());
    assert.equal(
      ((await (await h.request("/api/settings")).json()) as any).notice,
      input.notice,
    );
    assert.equal((await h.request("/api/settings", "PUT", input)).status, 409);
    const publicSettings = (await (
      await h.publicWorker.fetch("http://localhost:8787/api/settings")
    ).json()) as any;
    assert.equal(publicSettings.name, input.name);
    assert.equal(publicSettings.updated_by, undefined);
    assert.equal(publicSettings.version, undefined);
  } finally {
    await h.dispose();
  }
});
