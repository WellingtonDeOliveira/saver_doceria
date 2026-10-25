import { test, expect } from "@playwright/test";

test("detalhes, contador e etapas no celular e desktop", async ({
  page,
  request,
}) => {
  const admin = "http://localhost:8798";
  const headers = { Origin: admin };
  const category = await (
    await request.post(`${admin}/api/categories`, {
      headers,
      data: { name: "Doces artesanais" },
    })
  ).json();
  await request.post(`${admin}/api/products`, {
    headers,
    data: {
      category_id: category.id,
      name: "Brigadeiro de colher",
      presentation: "Pote de 150 g",
      description:
        "Chocolate cremoso com granulado. Preparado artesanalmente para adoçar seu dia.",
      price_cents: 1800,
      initial_stock: 10,
      published: true,
    },
  });
  await page.goto("http://localhost:8797");
  await page
    .getByRole("button", {
      name: "Ver detalhes de Brigadeiro de colher · Pote de 150 g",
    })
    .click();
  const details = page.getByRole("dialog", {
    name: "Brigadeiro de colher",
    exact: true,
  });
  await expect(details).toContainText("Chocolate cremoso com granulado");
  await page.screenshot({ path: ".wrangler/product-details-mobile.png" });
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(page.locator("#product-feedback")).toContainText("adicionado");
  await page.getByRole("button", { name: "Ver carrinho", exact: true }).click();
  await expect(page.locator("#cart-count")).toHaveText("1");
  await expect(
    page.locator(".checkout-steps [aria-current=step]"),
  ).toContainText("Carrinho");
  await page
    .getByLabel("Quantidade de Brigadeiro de colher · Pote de 150 g")
    .fill("2");
  await page
    .getByLabel("Quantidade de Brigadeiro de colher · Pote de 150 g")
    .press("Tab");
  await expect(page.locator("#cart-count")).toHaveText("2");
  await expect(page.locator("#cart-total")).toContainText("36,00");
  const cartBounds = await page.locator("#cart-dialog").boundingBox();
  expect(cartBounds!.y).toBeGreaterThanOrEqual(0);
  expect(cartBounds!.y + cartBounds!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  await page.screenshot({ path: ".wrangler/cart-mobile.png" });
  await page
    .getByRole("button", { name: "Confirmar carrinho", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator("#customer-step")).toBeVisible();
  await page.getByLabel("Seu nome", { exact: true }).fill("Cliente de teste");
  await page.getByLabel("Seu celular com DDD").fill("123");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator("#customer-step")).toBeVisible();
  await page.getByLabel("Seu celular com DDD").fill("(11) 98888-7777");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator("#pickup-note")).toBeVisible();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator("#order-summary")).toContainText(
    "Cliente de teste",
  );
  await expect(page.locator("#order-summary")).toContainText("36,00");
  await expect(page.locator(".checkout-steps .complete")).toHaveCount(3);
  await page.screenshot({ path: ".wrangler/checkout-review-mobile.png" });
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page.getByLabel("Seu nome", { exact: true })).toHaveValue(
    "Cliente de teste",
  );
  await page.getByRole("button", { name: "Fechar carrinho" }).click();
  await expect(
    page.getByRole("button", { name: "Abrir carrinho, 2 itens", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: ".wrangler/catalog-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Abrir carrinho/ }).click();
  await page.screenshot({ path: ".wrangler/checkout-desktop.png" });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole("button", { name: /Abrir carrinho/ }).click();
  expect(
    await page
      .locator("#cart-dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
