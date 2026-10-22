import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { chromium, expect } from "@playwright/test";
import { harness, sweet } from "./harness";
import { restoreBackup } from "../scripts/restore-backup";

test("backup executável restaura cliente, pedido revisado, saldos e fotos substituídas sem reaplicar efeitos", async () => {
  const h = await harness(),
    restored = await harness();
  const directory = await mkdtemp(join(tmpdir(), "saver-restore-"));
  let serveRestored = false;
  const server = createServer(async (req, res) => {
    const target = serveRestored ? restored : h;
    const worker =
      serveRestored && req.headers.host?.startsWith("127.0.0.1:")
        ? target.publicWorker
        : target.admin;
    const response = await worker.fetch(`http://localhost:8788${req.url}`, {
      headers: {
        "Cf-Access-Jwt-Assertion": serveRestored
          ? target.auth
          : String(req.headers["cf-access-jwt-assertion"] || ""),
      },
    });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  try {
    const c = (await (
      await h.request("/api/categories", "POST", { name: "Backup" })
    ).json()) as any;
    let p = (await (
      await h.request("/api/products", "POST", sweet(c.id))
    ).json()) as any;
    const photo = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "#B9475F" },
    })
      .png()
      .toBuffer();
    for (let i = 0; i < 2; i++) {
      const uploaded = (await (
        await h.admin.fetch("http://localhost:8788/api/media", {
          method: "POST",
          headers: {
            Origin: "http://localhost:8788",
            "Cf-Access-Jwt-Assertion": h.auth,
            "Content-Type": "image/png",
          },
          body: photo,
        })
      ).json()) as any;
      const response = await h.request(`/api/products/${p.id}/photo`, "PUT", {
        media_id: uploaded.id,
        version: p.version,
      });
      assert.equal(response.status, 200, await response.clone().text());
      p = await response.json();
    }
    await h.request("/api/settings", "PUT", {
      name: "Saver",
      whatsapp: "5511999998888",
      version: 1,
    });
    const response = await h.publicWorker.fetch(
      "http://localhost:8787/api/orders",
      {
        method: "POST",
        headers: {
          Origin: "http://localhost:8787",
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          name: "Ana backup",
          phone: "11999997777",
          mode: "pickup",
          items: [{ id: p.id, quantity: 2, price_cents: 1800 }],
        }),
      },
    );
    const { reference } = (await response.json()) as any;
    const action = async (name: string, version: number) => {
      const result = await h.request(
        `/api/orders/${reference}/${name}`,
        "POST",
        { version },
        { key: crypto.randomUUID() },
      );
      assert.equal(result.status, 200, await result.clone().text());
    };
    await action("confirm", 1);
    const edit = await h.request(
      `/api/orders/${reference}`,
      "PATCH",
      { version: 2, items: [{ id: p.id, quantity: 3, price_cents: 1500 }] },
      { key: crypto.randomUUID() },
    );
    assert.equal(edit.status, 200);
    await action("cancel", 3);
    await action("reopen", 4);
    await action("confirm", 5);
    assert.equal(
      (await h.request("/api/backup", "GET", undefined, { token: null }))
        .status,
      401,
    );
    assert.equal(
      (await h.publicWorker.fetch("http://localhost:8787/api/backup")).status,
      404,
    );
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as { port: number }).port;
    const backupDir = join(directory, "private");
    await promisify(execFile)(
      process.execPath,
      ["scripts/backup.mjs", `http://localhost:${port}`, backupDir],
      { env: { ...process.env, CF_ACCESS_JWT: h.auth }, windowsHide: true },
    );
    const report = await restoreBackup(
      backupDir,
      restored.db as unknown as D1Database,
      restored.photos as unknown as KVNamespace,
    );
    assert.deepEqual(report, { photos: 2, orders: 1, clients: 1 });
    const saved = (await (
      await restored.request(`/api/orders/${reference}`)
    ).json()) as any;
    assert.equal(saved.version, 6);
    assert.equal(saved.state, "confirmed");
    assert.equal(saved.revisions.length, 5);
    assert.equal(saved.original.total_cents, 3600);
    assert.equal(saved.snapshot.total_cents, 4500);
    const product = (await (
      await restored.request(`/api/products/${p.id}`)
    ).json()) as any;
    assert.equal(product.stock, 5);
    assert.equal(product.media_id, p.media_id);
    const bytes = await restored.publicWorker.fetch(
      `http://localhost:8787/media/${p.media_id}`,
    );
    assert.deepEqual(Buffer.from(await bytes.arrayBuffer()), photo);
    const clients = (await (
      await restored.request("/api/clients?phone=11999997777")
    ).json()) as any[];
    assert.equal(clients[0].name, "Ana backup");
    const history = (await (
      await restored.request(`/api/products/${p.id}/stock`)
    ).json()) as any[];
    assert.equal(history.length, 5);
    if (process.env.SAVER_BACKUP_BROWSER === "1") {
      serveRestored = true;
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage({
          viewport: { width: 390, height: 844 },
          isMobile: true,
        });
        await page.goto(`http://localhost:${port}/#clientes`);
        await page.getByLabel("Celular do cliente").fill("11999997777");
        await page
          .getByRole("button", { name: "Buscar cliente", exact: true })
          .click();
        await page.getByRole("link", { name: new RegExp(reference) }).click();
        await expect(
          page.getByRole("heading", {
            name: `Pedido ${reference}`,
            exact: true,
          }),
        ).toBeVisible();
        await expect(page.locator("#order-detail")).toContainText("R$ 45,00");
        await page.screenshot({
          path: ".wrangler/restored-order-mobile.png",
          fullPage: true,
        });
        await page
          .getByRole("link", { name: "Configurações", exact: true })
          .click();
        const downloadEvent = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Baixar backup completo", exact: true })
          .click();
        const downloaded = await downloadEvent;
        const inlineBackup = join(directory, "inline-backup.json");
        await downloaded.saveAs(inlineBackup);
        const again = await harness();
        try {
          const report = await restoreBackup(
            inlineBackup,
            again.db as unknown as D1Database,
            again.photos as unknown as KVNamespace,
          );
          assert.equal(report.photos, 2);
          assert.equal(
            (
              (await (
                await again.request(`/api/products/${p.id}`)
              ).json()) as any
            ).stock,
            5,
          );
        } finally {
          await again.dispose();
        }
        await page.goto(`http://127.0.0.1:${port}/`);
        await expect(
          page.getByAltText("Brigadeiro", { exact: true }),
        ).toBeVisible();
        await page.screenshot({
          path: ".wrangler/restored-catalog-mobile.png",
          fullPage: true,
        });
      } finally {
        await browser.close();
      }
    }
    const done = await restored.request(
      `/api/orders/${reference}/complete`,
      "POST",
      { version: 6 },
      { key: crypto.randomUUID() },
    );
    assert.equal(done.status, 200);
    assert.equal(
      ((await (await restored.request(`/api/products/${p.id}`)).json()) as any)
        .stock,
      5,
    );
    await assert.rejects(
      restoreBackup(
        backupDir,
        restored.db as unknown as D1Database,
        restored.photos as unknown as KVNamespace,
      ),
      /banco vazio/,
    );
    const manifest = JSON.parse(
      await readFile(join(backupDir, "manifest.json"), "utf8"),
    );
    await writeFile(
      join(backupDir, "photos", `${manifest.photos[0].id}.bin`),
      "corrupt",
    );
    await assert.rejects(
      restoreBackup(
        backupDir,
        h.db as unknown as D1Database,
        h.photos as unknown as KVNamespace,
      ),
      /corrompida/,
    );
  } finally {
    server.close();
    await h.dispose();
    await restored.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
