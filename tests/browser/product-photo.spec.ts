import { test, expect } from "@playwright/test";
import sharp from "sharp";

for (const width of [390, 1280]) {
  test(`foto no cadastro em ${width}px: selecionar antes de salvar e persistir`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const category = await (
      await request.post("http://localhost:8798/api/categories", {
        headers: { Origin: "http://localhost:8798" },
        data: { name: `Fotos ${width}` },
      })
    ).json();
    await page.goto("http://localhost:8798");
    await page.getByRole("button", { name: "Novo produto" }).click();
    await expect(page.getByLabel("Selecionar foto")).toBeEnabled();
    const buffer = await sharp({
      create: { width: 2000, height: 1800, channels: 3, background: "#B9475F" },
    })
      .png()
      .toBuffer();
    await page
      .getByLabel("Selecionar foto")
      .setInputFiles({ name: "doce.png", mimeType: "image/png", buffer });
    await expect(page.locator("#photo-info")).toContainText("envio");
    await page.getByLabel("Nome *", { exact: true }).fill(`Doce foto ${width}`);
    await page.getByLabel("Apresentação *", { exact: true }).fill("Unidade");
    await page.getByLabel("Preço (R$)").fill("5,00");
    await page
      .getByRole("combobox", { name: "Categoria *", exact: true })
      .selectOption(category.id);
    await page.getByLabel("Estoque inicial").fill("1");
    await page.getByRole("button", { name: "Salvar produto" }).click();
    await expect(page.locator("#notice")).toHaveText("Produto e foto salvos.");
    const products = await (
      await request.get("http://localhost:8798/api/products")
    ).json();
    const product = products.find((p: any) => p.name === `Doce foto ${width}`);
    expect(product.media_id).toBeTruthy();
    await page.reload();
    await page
      .locator("#product-rows tr")
      .filter({ hasText: `Doce foto ${width}` })
      .getByRole("button", { name: "Editar", exact: true })
      .click();
    await expect(page.getByAltText("Prévia da foto")).toBeVisible();
    await expect
      .poll(() =>
        page
          .getByAltText("Prévia da foto")
          .evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
  });
}

test("falha ao enviar foto preserva o cadastro e permite tentar novamente sem duplicar", async ({
  page,
  request,
}) => {
  const category = await (
    await request.post("http://localhost:8798/api/categories", {
      headers: { Origin: "http://localhost:8798" },
      data: { name: "Foto com falha" },
    })
  ).json();
  await page.goto("http://localhost:8798");
  await page.getByRole("button", { name: "Novo produto" }).click();
  await page
    .getByLabel("Nome *", { exact: true })
    .fill("Doce com nova tentativa");
  await page.getByLabel("Apresentação *", { exact: true }).fill("Unidade");
  await page.getByLabel("Preço (R$)").fill("5,00");
  await page
    .getByRole("combobox", { name: "Categoria *", exact: true })
    .selectOption(category.id);
  await page.getByLabel("Estoque inicial").fill("2");
  const buffer = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "pink" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Selecionar foto")
    .setInputFiles({ name: "doce.png", mimeType: "image/png", buffer });
  await expect(page.locator("#photo-info")).toContainText("envio");
  await page.route(
    "**/api/products/*/photo",
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Falha temporária." }),
      }),
    { times: 1 },
  );
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect(page.locator("#notice")).toContainText(
    "Produto salvo, mas a foto não foi salva",
  );
  await expect(
    page.getByRole("heading", { name: "Editar produto" }),
  ).toBeVisible();
  await expect(page.getByAltText("Prévia da foto")).toBeVisible();
  await page.getByRole("button", { name: "Enviar e substituir foto" }).click();
  await expect(page.locator("#notice")).toHaveText("Foto salva.");
  const products = await (
    await request.get("http://localhost:8798/api/products")
  ).json();
  const saved = products.filter(
    (p: any) => p.name === "Doce com nova tentativa",
  );
  expect(saved).toHaveLength(1);
  expect(saved[0].media_id).toBeTruthy();
  expect(saved[0].stock).toBe(2);
});
