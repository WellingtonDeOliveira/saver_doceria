import { test, expect } from "@playwright/test";

test("celular: configurações, carrinho persistente, revisão, entrega manual, WhatsApp e ciclo administrativo", async ({
  page,
  context,
  request,
}) => {
  const admin = "http://localhost:8798";
  const headers = { Origin: admin };
  const category = await (
    await request.post(`${admin}/api/categories`, {
      headers,
      data: { name: "Checkout" },
    })
  ).json();
  const p = await (
    await request.post(`${admin}/api/products`, {
      headers,
      data: {
        category_id: category.id,
        name: "Trufa checkout",
        presentation: "Unidade",
        price_cents: 500,
        initial_stock: 10,
        published: true,
      },
    })
  ).json();
  await page.goto(admin);
  await page.getByRole("link", { name: "Configurações", exact: true }).click();
  await page
    .getByLabel("Nome da loja", { exact: true })
    .fill("Saver <b>Teste</b>");
  await page.getByLabel("WhatsApp com 55 e DDD").fill("5511999998888");
  await page
    .getByLabel("Aviso público")
    .fill("Entrega a combinar <script>alert(1)</script>");
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(page.locator("#notice")).toHaveText("Configurações salvas.");
  const publicPage = await context.newPage();
  await publicPage.goto("http://localhost:8797");
  await expect(publicPage.locator("#store-name")).toHaveText(
    "Saver <b>Teste</b>",
  );
  await expect(publicPage.locator("#store-notice script")).toHaveCount(0);
  await publicPage
    .getByRole("button", {
      name: "Adicionar Trufa checkout · Unidade",
      exact: true,
    })
    .click();
  await publicPage.reload();
  await expect(
    publicPage.getByLabel("Quantidade de Trufa checkout · Unidade"),
  ).toHaveValue("1");
  const { stock, media_id, ...fields } = p;
  await request.patch(`${admin}/api/products/${p.id}`, {
    headers,
    data: { ...fields, published: true, archived: false, price_cents: 600 },
  });
  await publicPage
    .getByRole("button", { name: "Revisar carrinho", exact: true })
    .click();
  await expect(publicPage.locator("#cart-status")).toContainText(
    "preço atualizado",
  );
  await expect(publicPage.locator("#checkout")).toBeHidden();
  await publicPage
    .getByRole("button", { name: "Aceitar alterações do carrinho" })
    .click();
  await publicPage
    .getByRole("button", { name: "Revisar carrinho", exact: true })
    .click();
  await publicPage
    .getByLabel("Seu nome", { exact: true })
    .fill("Cliente móvel");
  await publicPage.getByLabel("Seu celular com DDD").fill("11988887777");
  await publicPage
    .getByRole("combobox", { name: "Modalidade", exact: true })
    .selectOption("delivery");
  await publicPage.route("https://viacep.com.br/**", (route) => route.abort());
  await publicPage.getByLabel("CEP", { exact: true }).fill("01001000");
  await publicPage.getByRole("button", { name: "Buscar CEP" }).click();
  await expect(publicPage.locator("#cep-status")).toContainText("manualmente");
  await publicPage.getByLabel("Rua", { exact: true }).fill("Praça da Sé");
  await publicPage.getByLabel("Número ou s/n", { exact: true }).fill("s/n");
  await publicPage.getByLabel("Bairro", { exact: true }).fill("Sé");
  await publicPage.getByLabel("Cidade", { exact: true }).fill("São Paulo");
  await publicPage.getByLabel("UF", { exact: true }).fill("SP");
  await publicPage
    .getByRole("button", { name: "Registrar solicitação" })
    .click();
  await expect(publicPage.locator("#order-result")).toBeVisible();
  const url = await publicPage
    .getByRole("link", { name: "Abrir WhatsApp", exact: true })
    .getAttribute("href");
  expect(url).toContain("https://wa.me/5511999998888?");
  expect(decodeURIComponent(url!)).toContain("frete a combinar");
  const reference = (
    await publicPage.locator("#order-reference").innerText()
  ).replace("Referência: ", "");
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await page.getByLabel("Celular do cliente").fill("11988887777");
  await page
    .getByRole("button", { name: "Buscar cliente", exact: true })
    .click();
  await page.getByRole("link", { name: new RegExp(reference) }).click();
  await expect(
    page.getByRole("heading", { name: `Pedido ${reference}`, exact: true }),
  ).toBeVisible();
  await page.getByLabel("Quantidade negociada").fill("2");
  await page.getByRole("button", { name: "Salvar negociação" }).click();
  await expect(page.locator("#notice")).toHaveText("Pedido atualizado.");
  await page
    .getByRole("button", { name: "Confirmar pedido", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Concluir pedido", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Quantidade negociada").fill("3");
  await page.getByRole("button", { name: "Salvar negociação" }).click();
  await expect(page.locator("#order-detail")).toContainText("versão 4");
  await page
    .getByRole("button", { name: "Cancelar pedido", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reabrir pedido", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar pedido", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Concluir pedido", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancelar pedido", exact: true })
    .click();
  await page.screenshot({ path: ".wrangler/order-mobile.png", fullPage: true });
  expect(
    (await (await request.get(`${admin}/api/products/${p.id}`)).json()).stock,
  ).toBe(7);
  await page.getByRole("link", { name: "Estoque", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Produto", exact: true })
    .selectOption(p.id);
  await page
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("physical_return");
  await page.getByLabel("Quantidade", { exact: true }).fill("1");
  await page
    .getByLabel("Justificativa", { exact: false })
    .fill("Retorno parcial conferido");
  await page.getByLabel("Referência do pedido devolvido").fill(reference);
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(page.locator("#notice")).toHaveText("Movimentação registrada.");
  expect(
    (await (await request.get(`${admin}/api/products/${p.id}`)).json()).stock,
  ).toBe(8);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("retirada recupera resposta perdida sem duplicar; carrinho inválido e falha de consulta são compreensíveis", async ({
  page,
  request,
}) => {
  const admin = "http://localhost:8798",
    headers = { Origin: admin };
  const settings = await (await request.get(`${admin}/api/settings`)).json();
  await request.put(`${admin}/api/settings`,{headers,data:{...settings,whatsapp:"5511999998888"}});
  const c = await (
    await request.post(`${admin}/api/categories`, {
      headers,
      data: { name: "Retirada" },
    })
  ).json();
  await request.post(`${admin}/api/products`, {
    headers,
    data: {
      category_id: c.id,
      name: "Mesmo doce",
      presentation: "Avulso",
      price_cents: 700,
      initial_stock: 3,
      published: true,
    },
  });
  await request.post(`${admin}/api/products`, {
    headers,
    data: {
      category_id: c.id,
      name: "Mesmo doce",
      presentation: "Caixa",
      price_cents: 1900,
      initial_stock: 3,
      published: true,
    },
  });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("fixture-init")) {
      localStorage.setItem("saver-cart-v1", "{invalid");
      sessionStorage.setItem("fixture-init", "1");
    }
  });
  await page.goto("http://localhost:8797");
  await expect(page.locator("#cart-total")).toHaveText(
    "Seu carrinho está vazio.",
  );
  await page
    .getByRole("button", { name: "Adicionar Mesmo doce · Avulso", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar Mesmo doce · Caixa", exact: true })
    .click();
  await page.getByLabel("Quantidade de Mesmo doce · Avulso").fill("2");
  await page.getByLabel("Quantidade de Mesmo doce · Avulso").press("Tab");
  await page.reload();
  await expect(page.locator("#cart-items > div")).toHaveCount(2);
  await expect(page.locator("#cart-total")).toContainText("33,00");
  await page.route("**/api/quote", (route) => route.abort());
  await page
    .getByRole("button", { name: "Revisar carrinho", exact: true })
    .click();
  await expect(page.locator("#cart-status")).toContainText("Falha de conexão");
  await page.unroute("**/api/quote");
  await page
    .getByRole("button", { name: "Revisar carrinho", exact: true })
    .click();
  await page.getByLabel("Seu nome", { exact: true }).fill("Resposta perdida");
  await page.getByLabel("Seu celular com DDD").fill("11977776666");
  await expect(page.locator("#delivery-address")).toBeHidden();
  let lose = true;
  let releaseSubmission!: () => void;
  const submissionHeld = new Promise<void>((resolve) => {
    releaseSubmission = resolve;
  });
  await page.route("**/api/orders", async (route) => {
    if (lose) {
      lose = false;
      await submissionHeld;
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Registrar solicitação" }).click();
  await expect(page.locator("#cart-status")).toContainText(
    "Registrando solicitação",
  );
  await expect(
    page.getByRole("button", {
      name: "Adicionar Mesmo doce · Avulso",
      exact: true,
    }),
  ).toBeDisabled();
  releaseSubmission();
  await expect(page.locator("#cart-status")).toContainText("Falha de conexão");
  await expect(page.locator("#order-result")).toBeHidden();
  await page.getByRole("button", { name: "Registrar solicitação" }).click();
  await expect(page.locator("#order-result")).toBeVisible();
  expect(
    decodeURIComponent(
      (await page.locator("#whatsapp-link").getAttribute("href"))!,
    ),
  ).toContain("Retirada");
  const clients = await (
    await request.get(`${admin}/api/clients?phone=11977776666`)
  ).json();
  const client = await (
    await request.get(`${admin}/api/clients/${clients[0].id}`)
  ).json();
  expect(client.orders).toHaveLength(1);
});

test("ViaCEP preenche campos e resposta atrasada não sobrescreve o CEP atual", async ({
  page,
  request,
}) => {
  const admin = "http://localhost:8798",
    headers = { Origin: admin };
  const category = await (
    await request.post(`${admin}/api/categories`, {
      headers,
      data: { name: "CEP" },
    })
  ).json();
  await request.post(`${admin}/api/products`, {
    headers,
    data: {
      category_id: category.id,
      name: "Bombom CEP",
      presentation: "Unidade",
      price_cents: 500,
      initial_stock: 5,
      published: true,
    },
  });
  await page.goto("http://localhost:8797");
  await page
    .getByRole("button", {
      name: "Adicionar Bombom CEP · Unidade",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Revisar carrinho", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Modalidade", exact: true })
    .selectOption("delivery");
  let firstStarted = false,
    release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("https://viacep.com.br/**", async (route) => {
    if (route.request().url().includes("01001000")) {
      firstStarted = true;
      await held;
      try {
        await route.fulfill({
          json: {
            logradouro: "Rua antiga",
            bairro: "Antigo",
            localidade: "Antiga",
            uf: "RJ",
          },
        });
      } catch {
        /* cancelled request */
      }
    } else
      await route.fulfill({
        json: {
          logradouro: "Rua nova",
          bairro: "Novo",
          localidade: "São Paulo",
          uf: "SP",
        },
      });
  });
  await page.getByLabel("CEP", { exact: true }).fill("01001000");
  await page.getByRole("button", { name: "Buscar CEP" }).click();
  await expect.poll(() => firstStarted).toBe(true);
  await page.getByLabel("CEP", { exact: true }).fill("02002000");
  await page.getByRole("button", { name: "Buscar CEP" }).click();
  await expect(page.getByLabel("Rua", { exact: true })).toHaveValue("Rua nova");
  release();
  await expect(page.getByLabel("Rua", { exact: true })).toHaveValue("Rua nova");
  await expect(page.getByLabel("Número ou s/n", { exact: true })).toBeEmpty();
  await expect(page.getByLabel("Complemento", { exact: true })).toBeEmpty();
});
