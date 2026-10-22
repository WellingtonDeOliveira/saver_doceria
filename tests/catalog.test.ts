import { test } from "node:test";
import assert from "node:assert/strict";
import { harness, sweet } from "./harness";

test("proprietária cadastra apresentação e saldo inicial persistente; cardápio começa vazio", async () => {
  const h = await harness();
  try {
    assert.deepEqual(
      await (
        await h.publicWorker.fetch("https://public.test/api/catalog")
      ).json(),
      { categories: [], products: [] },
    );
    const categoryResponse = await h.request("/api/categories", "POST", {
      name: "Doces",
    });
    assert.equal(
      categoryResponse.status,
      201,
      await categoryResponse.clone().text(),
    );
    const category = (await categoryResponse.json()) as any;
    const response = await h.request(
      "/api/products",
      "POST",
      sweet(category.id),
    );
    assert.equal(response.status, 201);
    const created = (await response.json()) as any;
    const saved = (await (
      await h.request(`/api/products/${created.id}`)
    ).json()) as any;
    assert.equal(saved.stock, 8);
    assert.equal(saved.price_cents, 1800);
    const catalog = (await (
      await h.publicWorker.fetch("https://public.test/api/catalog")
    ).json()) as any;
    assert.equal(catalog.products[0].id, created.id);
    const history = (await (
      await h.request(`/api/products/${created.id}/stock`)
    ).json()) as any;
    assert.equal(history[0].kind, "initial");
    assert.equal(history[0].actor, "owner@example.com");
    assert.equal(history[0].before_stock, 0);
    assert.equal(history[0].after_stock, 8);
  } finally {
    await h.dispose();
  }
});

test("manutenção preserva identidades e estoque; visibilidade depende de publicação, saldo, arquivo e categoria", async () => {
  const h = await harness();
  try {
    let category = (await (
      await h.request("/api/categories", "POST", { name: "Doces" })
    ).json()) as any;
    let item = (await (
      await h.request("/api/products", "POST", sweet(category.id))
    ).json()) as any;
    const visible = async () =>
      (
        (await (
          await h.publicWorker.fetch("https://public.test/api/catalog")
        ).json()) as any
      ).products;
    const edit = async (change: any) => {
      const { stock, media_id, initial_stock, ...fields } = item;
      const response = await h.request(`/api/products/${item.id}`, "PATCH", {
        ...fields,
        published: !!item.published,
        archived: !!item.archived,
        ...change,
      });
      assert.equal(response.status, 200, await response.clone().text());
      item = await response.json();
    };
    await edit({ published: false });
    assert.equal((await visible()).length, 0);
    assert.equal(item.stock, 8);
    await edit({ published: true, archived: true });
    assert.equal((await visible()).length, 0);
    await edit({ archived: false, name: "Brigadeiro novo", price_cents: 2200 });
    assert.equal((await visible())[0].id, item.id);
    const stale = await h.request(`/api/products/${item.id}`, "PATCH", {
      name: item.name,
      presentation: item.presentation,
      description: item.description,
      category_id: category.id,
      price_cents: 2200,
      published: true,
      archived: false,
      version: 1,
    });
    assert.equal(stale.status, 409);
    const copyResponse = await h.request(
      `/api/products/${item.id}/duplicate`,
      "POST",
      { initial_stock: 0 },
    );
    assert.equal(copyResponse.status, 201);
    const copy = (await copyResponse.json()) as any;
    assert.notEqual(copy.id, item.id);
    assert.equal(copy.stock, 0);
    assert.equal(copy.published, 0);
    assert.equal(
      (await h.request(`/api/products/${item.id}/duplicate`, "POST", {}))
        .status,
      400,
    );
    assert.equal(
      ((await (await h.request("/api/products?state=zero")).json()) as any[])
        .length,
      1,
    );
    category = await (
      await h.request(`/api/categories/${category.id}`, "PATCH", {
        name: "Caixas",
        sort_order: 2,
        active: false,
        version: category.version,
      })
    ).json();
    assert.equal((await visible()).length, 0);
    assert.equal(
      (
        (await (
          await h.publicWorker.fetch("https://public.test/api/catalog")
        ).json()) as any
      ).categories.length,
      0,
    );
    await h.request(`/api/categories/${category.id}`, "PATCH", {
      ...category,
      active: true,
    });
    assert.equal((await visible()).length, 1);
    assert.equal(
      ((await (await h.request("/api/products?q=novo")).json()) as any[])
        .length,
      2,
    );
    const history = (await (
      await h.request(`/api/products/${item.id}/stock`)
    ).json()) as any[];
    assert.equal(history.length, 1);
  } finally {
    await h.dispose();
  }
});
