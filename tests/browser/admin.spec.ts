import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("celular: cadastro, manutenção pelo teclado, estoque e prévia/troca da foto", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://localhost:8798");
  await page.getByRole("link", { name: "Categorias", exact: true }).click();
  await page.getByLabel("Nome da nova categoria").fill("Doces");
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await expect(page.getByRole("status").first()).toHaveText(
    "Categoria criada.",
  );
  await page.getByRole("link", { name: "Produtos", exact: true }).click();
  await page.getByRole("button", { name: "Novo produto" }).click();
  await page.getByLabel("Nome *", { exact: true }).fill("Brigadeiro");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Caixa com 6");
  await page.getByLabel("Preço (R$)").fill("18,00");
  await page
    .getByRole("combobox", { name: "Categoria *", exact: true })
    .selectOption({ label: "Doces" });
  await page.getByLabel("Estoque inicial").fill("8");
  await page.getByLabel("Mostrar no cardápio").check();
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect(
    page.getByRole("heading", { name: "Editar produto" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("link", { name: "Produtos", exact: true }).click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByLabel("Nome *", { exact: true })).toHaveValue(
    "Brigadeiro",
  );
  const publicPage = await context.newPage();
  await publicPage.goto("http://localhost:8797");
  await expect(
    publicPage.getByRole("heading", { name: "Brigadeiro" }),
  ).toBeVisible();
  await expect(publicPage.getByText("R$ 18,00")).toBeVisible();
  const photo = await sharp({
    create: { width: 2000, height: 1800, channels: 3, background: "#B9475F" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Selecionar foto")
    .setInputFiles({ name: "doce.png", mimeType: "image/png", buffer: photo });
  await expect(page.locator("#photo-info")).toContainText("envio");
  await expect(page.getByAltText("Prévia da foto")).toBeVisible();
  await page.getByRole("button", { name: "Enviar e substituir foto" }).click();
  await expect(page.locator("#notice")).toHaveText("Foto salva.");
  await publicPage.reload();
  await expect(
    publicPage.getByAltText("Brigadeiro", { exact: true }),
  ).toBeVisible();
  const firstSrc = await publicPage
    .getByAltText("Brigadeiro", { exact: true })
    .getAttribute("src");
  await page
    .getByLabel("Selecionar foto")
    .setInputFiles({ name: "nova.png", mimeType: "image/png", buffer: photo });
  await page.getByRole("button", { name: "Enviar e substituir foto" }).click();
  await expect(page.locator("#notice")).toHaveText("Foto salva.");
  await expect(page.locator("#save-photo")).toBeHidden();
  await publicPage.reload();
  await expect(
    publicPage.getByAltText("Brigadeiro", { exact: true }),
  ).not.toHaveAttribute("src", firstSrc!);
  await publicPage.screenshot({
    path: ".wrangler/catalog-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Preço (R$)").fill("20,50");
  await page.getByLabel("Mostrar no cardápio").uncheck();
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect(page.locator("#notice")).toContainText("Produto salvo");
  await publicPage.reload();
  await expect(
    publicPage.getByText("Estamos preparando novos doces.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Mostrar no cardápio").check();
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect(page.locator("#notice")).toContainText("Produto salvo");
  await page.getByRole("link", { name: "Estoque", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Produto", exact: true })
    .selectOption({ label: "Brigadeiro · Caixa com 6 (saldo 8)" });
  await page
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("exit");
  await page.getByLabel("Quantidade", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(page.locator("#notice")).toHaveText("Movimentação registrada.");
  await expect(page.locator("#history")).toContainText("8 → 0");
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", { name: "Brigadeiro" }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("entry");
  await page.getByLabel("Quantidade", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(page.locator("#history")).toContainText("0 → 3");
  await page.screenshot({ path: ".wrangler/stock-mobile.png", fullPage: true });
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", { name: "Brigadeiro" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Categorias", exact: true }).click();
  await page.getByLabel("Nome da categoria", { exact: true }).fill("Caixas");
  await page.getByLabel("Ativa", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Salvar", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#notice")).toHaveText("Categoria salva.");
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", { name: "Brigadeiro" }),
  ).toHaveCount(0);
  await page.getByLabel("Ativa", { exact: true }).check();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.locator("#notice")).toHaveText("Categoria salva.");
  await page.getByRole("link", { name: "Produtos", exact: true }).click();
  await page.getByRole("button", { name: "Duplicar", exact: true }).click();
  await page.getByLabel("Estoque inicial").fill("0");
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect(page.locator("#notice")).toContainText("Produto salvo");
  await expect(page.getByLabel("Mostrar no cardápio")).not.toBeChecked();
  await expect(page.locator("#current-stock")).toContainText("0");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});

test("celular: atalhos visíveis, filtros recolhíveis e cartões sem rolagem lateral", async ({
  page,
  request,
}) => {
  const admin = "http://localhost:8798";
  const headers = { Origin: admin };
  const category = await (
    await request.post(`${admin}/api/categories`, {
      headers,
      data: { name: "Cartões mobile" },
    })
  ).json();
  await request.post(`${admin}/api/products`, {
    headers,
    data: {
      category_id: category.id,
      name: "Trufa artesanal de chocolate com recheio especial para comemorações",
      presentation: "Caixa com doze unidades de sabores variados",
      price_cents: 4800,
      initial_stock: 8,
      published: false,
    },
  });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(admin);
    await expect(page.locator("#notice")).toBeHidden();
    const nav = page.getByRole("navigation", { name: "Painel" });
    for (const label of [
      "Produtos",
      "Categorias",
      "Estoque",
      "Pedidos",
      "Clientes",
      "Configurações",
    ]) {
      const bounds = await nav
        .getByRole("link", { name: label, exact: true })
        .boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
    }
    await expect(
      page.getByLabel("Buscar produto", { exact: true }),
    ).toBeHidden();
    await page.getByText("Buscar e filtrar produtos", { exact: true }).click();
    await page
      .getByLabel("Buscar produto", { exact: true })
      .fill("Trufa artesanal de chocolate");
    await page.getByRole("button", { name: "Filtrar", exact: true }).click();
    await expect(page.locator("#product-rows tr")).toHaveCount(1);
    await page.getByText("Buscar e filtrar produtos", { exact: true }).click();
    await expect(page.getByRole("cell", { name: /R\$\s*48,00/ })).toBeVisible();
    await expect(
      page.getByRole("cell", { name: /^Estoque\s*8$/ }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    if (width === 390)
      await page.screenshot({
        path: ".wrangler/admin-cards-mobile.png",
        fullPage: true,
      });
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await expect(page.getByLabel("Nome *", { exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page
      .getByRole("link", { name: "Configurações", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Configurações da loja" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Pedidos", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Pedidos", exact: true }),
    ).toBeVisible();
  }
});
