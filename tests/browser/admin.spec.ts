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
