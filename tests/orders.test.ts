import { test } from "node:test";
import assert from "node:assert/strict";
import { harness, sweet } from "./harness";

async function fixture() {
  const h = await harness();
  const category = (await (
    await h.request("/api/categories", "POST", { name: "Doces" })
  ).json()) as any;
  const p = (await (
    await h.request("/api/products", "POST", sweet(category.id))
  ).json()) as any;
  await h.request("/api/settings", "PUT", {
    name: "Saver",
    whatsapp: "5511999998888",
    greeting: "Olá, quero pedir",
    notice: "",
    version: 1,
  });
  const pub = (path: string, data: unknown, key = crypto.randomUUID()) =>
    h.publicWorker.fetch(`http://localhost:8787${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:8787",
        "Idempotency-Key": key,
        "CF-Connecting-IP": "192.0.2.1",
      },
      body: JSON.stringify(data),
    });
  const input = {
    name: "Ana",
    phone: "(11) 99999-7777",
    mode: "pickup",
    items: [{ id: p.id, quantity: 2, price_cents: 1800 }],
  };
  return { ...h, p, pub, input };
}

test("carrinho revalida por ID, apresenta diferenças e nunca baixa estoque", async () => {
  const h = await fixture();
  try {
    const response = await h.pub("/api/quote", {
      items: [{ id: h.p.id, quantity: 9, price_cents: 100 }],
    });
    assert.equal(response.status, 200, await response.clone().text());
    const quote = (await response.json()) as any;
    assert.equal(quote.changed, true);
    assert.equal(quote.items[0].quantity, 8);
    assert.equal(quote.total_cents, 14400);
    assert.equal(
      ((await (await h.request(`/api/products/${h.p.id}`)).json()) as any)
        .stock,
      8,
    );
    assert.equal((await h.pub("/api/quote", { items: [] })).status, 400);
    assert.equal(
      (
        await h.pub("/api/quote", {
          items: [h.input.items[0], h.input.items[0]],
        })
      ).status,
      400,
    );
  } finally {
    await h.dispose();
  }
});

test("retirada é persistida antes do WhatsApp, agrupa celular e repete sem duplicar nem baixar", async () => {
  const h = await fixture();
  try {
    const key = crypto.randomUUID();
    const response = await h.pub("/api/orders", h.input, key);
    assert.equal(response.status, 201, await response.clone().text());
    const saved = (await response.json()) as any;
    assert.match(saved.whatsapp_url, /^https:\/\/wa.me\/5511999998888\?text=/);
    assert.ok(decodeURIComponent(saved.whatsapp_url).includes(saved.reference));
    assert.ok(decodeURIComponent(saved.whatsapp_url).includes("Caixa com 6"));
    assert.equal(saved.phone, undefined);
    const repeat = await h.pub("/api/orders", h.input, key);
    assert.equal(((await repeat.json()) as any).reference, saved.reference);
    assert.equal(
      (await h.pub("/api/orders", { ...h.input, name: "Outro" }, key)).status,
      409,
    );
    const detail = (await (
      await h.request(`/api/orders/${saved.reference}`)
    ).json()) as any;
    assert.equal(detail.state, "pending");
    assert.equal(detail.snapshot.total_cents, 3600);
    assert.equal(detail.original.name, "Ana");
    assert.equal(
      ((await (await h.request(`/api/products/${h.p.id}`)).json()) as any)
        .stock,
      8,
    );
    assert.equal(
      (
        await h.pub("/api/orders", {
          ...h.input,
          items: [{ ...h.input.items[0], price_cents: 1 }],
        })
      ).status,
      409,
    );
    assert.equal(
      (await h.pub("/api/orders", { ...h.input, name: "" })).status,
      400,
    );
    assert.equal(
      (await h.pub("/api/orders", { ...h.input, phone: "123" })).status,
      400,
    );
    await h.pub("/api/orders", { ...h.input, phone: "+55 11 99999-7777" });
    const clients = (await (
      await h.request("/api/clients?phone=11999997777")
    ).json()) as any[];
    assert.equal(clients.length, 1);
    const client = (await (
      await h.request(`/api/clients/${clients[0].id}`)
    ).json()) as any;
    assert.equal(client.orders.length, 2);
    assert.equal(
      (await h.request("/api/orders", "GET", undefined, { token: null }))
        .status,
      401,
    );
    assert.equal(
      (
        await h.publicWorker.fetch(
          "http://localhost:8787/api/clients?phone=11999997777",
        )
      ).status,
      404,
    );
  } finally {
    await h.dispose();
  }
});

test("entrega preserva endereço por pedido e retirada mantém o endereço atual privado", async () => {
  const h = await fixture();
  try {
    const address = {
      cep: "01001000",
      street: "Praça da Sé",
      number: "s/n",
      district: "Sé",
      city: "São Paulo",
      state: "SP",
      complement: "Fundos",
    };
    const first = (await (
      await h.pub("/api/orders", { ...h.input, mode: "delivery", address })
    ).json()) as any;
    assert.ok(
      decodeURIComponent(first.whatsapp_url).includes("frete a combinar"),
    );
    await h.pub("/api/orders", {
      ...h.input,
      mode: "delivery",
      address: { ...address, number: "20", complement: "" },
    });
    await h.pub("/api/orders", h.input);
    const clients = (await (
      await h.request("/api/clients?phone=+5511999997777")
    ).json()) as any[];
    const client = (await (
      await h.request(`/api/clients/${clients[0].id}`)
    ).json()) as any;
    assert.equal(client.address.number, "20");
    const old = (await (
      await h.request(`/api/orders/${first.reference}`)
    ).json()) as any;
    assert.equal(old.snapshot.address.number, "s/n");
    assert.equal(old.snapshot.freight_cents, null);
    assert.equal(
      (
        await h.pub("/api/orders", {
          ...h.input,
          mode: "delivery",
          address: { ...address, number: "" },
        })
      ).status,
      400,
    );
  } finally {
    await h.dispose();
  }
});

test("negociação preserva original, registra revisões, recalcula em centavos e recusa versão antiga", async () => {
  const h = await fixture();
  try {
    const { reference } = (await (
      await h.pub("/api/orders", h.input)
    ).json()) as any;
    const payload = {
      version: 1,
      items: [{ id: h.p.id, quantity: 3, price_cents: 1500 }],
      discount_cents: 500,
      freight_cents: 700,
    };
    const response = await h.request(
      `/api/orders/${reference}`,
      "PATCH",
      payload,
      { key: crypto.randomUUID() },
    );
    assert.equal(response.status, 200, await response.clone().text());
    const edited = (await response.json()) as any;
    assert.equal(edited.snapshot.total_cents, 4700);
    assert.equal(edited.original.total_cents, 3600);
    assert.equal(edited.revisions.length, 1);
    assert.equal(edited.revisions[0].actor, "owner@example.com");
    assert.equal(
      (
        await h.request(`/api/orders/${reference}`, "PATCH", payload, {
          key: crypto.randomUUID(),
        })
      ).status,
      409,
    );
    assert.equal(
      ((await (await h.request(`/api/products/${h.p.id}`)).json()) as any)
        .stock,
      8,
    );
    assert.equal(
      ((await (await h.request(`/api/products/${h.p.id}`)).json()) as any)
        .price_cents,
      1800,
    );
  } finally {
    await h.dispose();
  }
});

test("confirmação, edição por diferença, cancelamento, reabertura e conclusão não duplicam estoque", async () => {
  const h = await fixture();
  try {
    const { reference } = (await (
      await h.pub("/api/orders", h.input)
    ).json()) as any;
    const balance = async () =>
      ((await (await h.request(`/api/products/${h.p.id}`)).json()) as any)
        .stock;
    let order = (await (
      await h.request(`/api/orders/${reference}`)
    ).json()) as any;
    const action = async (name: string) => {
      const data = { version: order.version },
        key = crypto.randomUUID();
      for (let i = 0; i < 2; i++) {
        const r = await h.request(
          `/api/orders/${reference}/${name}`,
          "POST",
          data,
          { key },
        );
        assert.equal(r.status, 200, await r.clone().text());
        order = await r.json();
      }
    };
    await action("confirm");
    assert.equal(await balance(), 6);
    const data = {
      version: order.version,
      items: [{ id: h.p.id, quantity: 5, price_cents: 1500 }],
      discount_cents: 100,
      freight_cents: null,
    };
    const key = crypto.randomUUID();
    for (let i = 0; i < 2; i++) {
      const r = await h.request(`/api/orders/${reference}`, "PATCH", data, {
        key,
      });
      assert.equal(r.status, 200, await r.clone().text());
      order = await r.json();
    }
    assert.equal(await balance(), 3);
    assert.equal(order.snapshot.total_cents, 7400);
    await action("cancel");
    assert.equal(await balance(), 8);
    await action("reopen");
    assert.equal(await balance(), 8);
    await action("confirm");
    assert.equal(await balance(), 3);
    await action("complete");
    assert.equal(await balance(), 3);
    await action("cancel");
    assert.equal(await balance(), 3);
    assert.equal(order.revisions.at(-1).old_state, "completed");
    await action("reopen");
    assert.equal(await balance(), 3);
    const fail = await h.request(
      `/api/orders/${reference}/confirm`,
      "POST",
      { version: order.version },
      { key: crypto.randomUUID() },
    );
    assert.equal(fail.status, 409);
    assert.equal(await balance(), 3);
    const detail = (await (
      await h.request(`/api/orders/${reference}`)
    ).json()) as any;
    assert.equal(detail.state, "pending");
    assert.equal(detail.revisions.length, order.revisions.length);
  } finally {
    await h.dispose();
  }
});

test("última unidade concorrente e falha em um item preservam pedido, revisões e todos os saldos", async () => {
  const h = await fixture();
  try {
    const one = (await (
      await h.request(
        "/api/products",
        "POST",
        sweet(h.p.category_id, { name: "Último", initial_stock: 1 }),
      )
    ).json()) as any;
    const input = {
      ...h.input,
      items: [{ id: one.id, quantity: 1, price_cents: 1800 }],
    };
    const first = (await (await h.pub("/api/orders", input)).json()) as any;
    const second = (await (await h.pub("/api/orders", input)).json()) as any;
    const responses = await Promise.all(
      [first, second].map((o) =>
        h.request(
          `/api/orders/${o.reference}/confirm`,
          "POST",
          { version: 1 },
          { key: crypto.randomUUID() },
        ),
      ),
    );
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
    const winner = responses[0].status === 200 ? first : second;
    const current = (await (
      await h.request(`/api/orders/${winner.reference}`)
    ).json()) as any;
    // Returning the last unit while over-drawing another product must roll back both.
    const failed = await h.request(
      `/api/orders/${winner.reference}`,
      "PATCH",
      {
        version: current.version,
        items: [{ id: h.p.id, quantity: 9, price_cents: 1800 }],
      },
      { key: crypto.randomUUID() },
    );
    assert.equal(failed.status, 409);
    assert.equal(
      ((await (await h.request(`/api/products/${one.id}`)).json()) as any)
        .stock,
      0,
    );
    assert.equal(
      ((await (await h.request(`/api/products/${h.p.id}`)).json()) as any)
        .stock,
      8,
    );
    const after = (await (
      await h.request(`/api/orders/${winner.reference}`)
    ).json()) as any;
    assert.equal(after.version, current.version);
    assert.equal(after.revisions.length, 1);
  } finally {
    await h.dispose();
  }
});

test("retorno físico parcial exige justificativa e referência e repete sem devolução fictícia", async () => {
  const h = await fixture();
  try {
    const { reference } = (await (
      await h.pub("/api/orders", h.input)
    ).json()) as any;
    for (const [action, version] of [
      ["confirm", 1],
      ["complete", 2],
      ["cancel", 3],
    ] as const)
      assert.equal(
        (
          await h.request(
            `/api/orders/${reference}/${action}`,
            "POST",
            { version },
            { key: crypto.randomUUID() },
          )
        ).status,
        200,
      );
    const p = (await (
      await h.request(`/api/products/${h.p.id}`)
    ).json()) as any;
    assert.equal(p.stock, 6);
    const payload = {
      kind: "physical_return",
      quantity: 1,
      reason: "Retorno conferido",
      version: p.version,
      order_reference: reference,
    };
    assert.equal(
      (
        await h.request(
          `/api/products/${h.p.id}/stock`,
          "POST",
          { ...payload, reason: "" },
          { key: crypto.randomUUID() },
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await h.request(
          `/api/products/${h.p.id}/stock`,
          "POST",
          { ...payload, order_reference: "" },
          { key: crypto.randomUUID() },
        )
      ).status,
      400,
    );
    const key = crypto.randomUUID();
    for (let i = 0; i < 2; i++)
      assert.ok(
        [200, 201].includes(
          (
            await h.request(`/api/products/${h.p.id}/stock`, "POST", payload, {
              key,
            })
          ).status,
        ),
      );
    assert.equal(
      ((await (await h.request(`/api/products/${h.p.id}`)).json()) as any)
        .stock,
      7,
    );
    const history = (await (
      await h.request(`/api/products/${h.p.id}/stock`)
    ).json()) as any[];
    assert.equal(history[0].order_reference, reference);
    assert.equal(history[0].quantity, 1);
  } finally {
    await h.dispose();
  }
});

test("falha de gravação reverte baixa, revisão e estado; erro público não altera cliente e recebimento é limitado", async () => {
  const h = await fixture();
  try {
    const { reference } = (await (
      await h.pub("/api/orders", h.input)
    ).json()) as any;
    await h.db
      .prepare(
        "CREATE TRIGGER fail_save BEFORE UPDATE ON orders BEGIN SELECT RAISE(ABORT,'storage_failure'); END",
      )
      .run();
    assert.equal(
      (
        await h.request(
          `/api/orders/${reference}/confirm`,
          "POST",
          { version: 1 },
          { key: crypto.randomUUID() },
        )
      ).status,
      503,
    );
    assert.equal(
      ((await (await h.request(`/api/products/${h.p.id}`)).json()) as any)
        .stock,
      8,
    );
    const order = (await (
      await h.request(`/api/orders/${reference}`)
    ).json()) as any;
    assert.equal(order.state, "pending");
    assert.equal(order.revisions.length, 0);
    await h.db.prepare("DROP TRIGGER fail_save").run();
    for (let i = 1; i < 10; i++)
      assert.equal((await h.pub("/api/orders", h.input)).status, 201);
    assert.equal(
      (await h.pub("/api/orders", { ...h.input, name: "Não salvar este nome" }))
        .status,
      429,
    );
    const clients = (await (
      await h.request("/api/clients?phone=11999997777")
    ).json()) as any[];
    assert.equal(clients[0].name, "Ana");
    assert.equal(
      (
        await h.publicWorker.fetch("http://localhost:8787/api/orders", {
          method: "POST",
          headers: {
            Origin: "https://evil.test",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(h.input),
        })
      ).status,
      403,
    );
  } finally {
    await h.dispose();
  }
});
