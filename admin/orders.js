export function setupOrders({ api, guarded, notify, node, money, date }) {
  const $ = (selector) => document.querySelector(selector);
  const states = {
    pending: "Aguardando confirmação",
    confirmed: "Confirmado",
    completed: "Concluído",
    cancelled: "Cancelado",
  };
  const actions = {
    confirm: "Confirmar pedido",
    complete: "Concluir pedido",
    cancel: "Cancelar pedido",
    reopen: "Reabrir pedido",
  };
  let operation;
  const price = (c) => money.format(c / 100);
  const decimal = (c) =>
    c === null ? "" : (c / 100).toFixed(2).replace(".", ",");
  function cents(value) {
    if (!/^\d+(?:[,.]\d{1,2})?$/.test(value))
      throw new Error(
        "Informe um valor em reais, com até duas casas decimais.",
      );
    const [whole, fraction = ""] = value.replace(",", ".").split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  }
  function link(order) {
    const a = node(
      "a",
      `${order.reference} · ${states[order.state]} · ${price(order.total_cents)} · ${date.format(new Date(order.created_at))}`,
    );
    a.href = `#pedido/${order.reference}`;
    return a;
  }
  async function mutate(reference, action, data) {
    const signature = JSON.stringify([reference, action, data]);
    if (operation?.signature !== signature)
      operation = { signature, key: crypto.randomUUID() };
    await api(
      `/api/orders/${reference}${action === "edit" ? "" : `/${action}`}`,
      {
        method: action === "edit" ? "PATCH" : "POST",
        data,
        key: operation.key,
      },
    );
    operation = undefined;
    await detail(reference);
    notify("Pedido atualizado.", "success");
  }
  async function list() {
    const q = new FormData($("#orders-search")).get("q");
    const orders = await api(`/api/orders?q=${encodeURIComponent(q)}`);
    const container = $("#order-list");
    container.replaceChildren();
    for (const order of orders) {
      const card = node("article");
      card.className = "panel stack";
      card.append(node("strong", order.name), link(order));
      container.append(card);
    }
    if (!orders.length)
      container.append(node("p", "Nenhuma solicitação encontrada."));
  }
  function field(form, labelText, name, value, type = "text") {
    const label = node("label", labelText);
    const input = node(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") input.type = type;
    input.name = name;
    input.value = value ?? "";
    label.append(input);
    form.append(label);
    return input;
  }
  async function detail(reference) {
    const order = await api(`/api/orders/${reference}`);
    const root = $("#order-detail");
    root.replaceChildren();
    const s = order.snapshot;
    root.append(
      node("h1", `Pedido ${order.reference}`),
      node("p", `${states[order.state]} · versão ${order.version}`),
      node("p", `${s.name} · ${s.phone}`),
      node("p", s.mode === "delivery" ? "Entrega" : "Retirada"),
    );
    if (s.address)
      root.append(
        node("p", Object.values(s.address).filter(Boolean).join(" · ")),
      );
    for (const item of s.items)
      root.append(
        node(
          "p",
          `${item.quantity} × ${item.name} · ${item.presentation} · ${price(item.price_cents)} = ${price(item.price_cents * item.quantity)}`,
        ),
      );
    root.append(
      node(
        "p",
        `Desconto: ${price(s.discount_cents)} · Frete: ${s.freight_cents === null ? "a combinar" : price(s.freight_cents)} · Total: ${price(s.total_cents)}`,
      ),
    );
    const available = {
      pending: ["confirm", "cancel"],
      confirmed: ["complete", "cancel"],
      completed: ["cancel"],
      cancelled: ["reopen"],
    }[order.state];
    const buttons = node("div");
    buttons.className = "actions";
    for (const action of available) {
      const b = node("button", actions[action]);
      b.type = "button";
      b.addEventListener(
        "click",
        guarded(() => mutate(reference, action, { version: order.version })),
      );
      buttons.append(b);
    }
    root.append(buttons);
    if (order.state === "completed")
      root.append(
        node(
          "p",
          "Cancelar após conclusão não devolve estoque. Registre eventual retorno físico no Estoque, com justificativa e esta referência.",
        ),
      );
    if (["pending", "confirmed"].includes(order.state)) {
      const products = await api("/api/products");
      const form = node("form");
      form.className = "panel stack";
      form.append(node("h2", "Ajustar combinado"));
      const rows = node("div");
      rows.className = "stack";
      form.append(rows);
      function addRow(item) {
        const row = node("div");
        row.className = "order-item";
        const label = node("label", "Doce e apresentação");
        const select = node("select");
        select.required = true;
        for (const p of products) {
          const option = node("option", `${p.name} · ${p.presentation}`);
          option.value = p.id;
          select.append(option);
        }
        select.value = item?.id ?? products[0]?.id ?? "";
        label.append(select);
        row.append(label);
        const quantity = field(
          row,
          "Quantidade negociada",
          "quantity",
          item?.quantity ?? 1,
          "number",
        );
        quantity.min = "1";
        quantity.max = "1000";
        quantity.required = true;
        const amount = field(
          row,
          "Preço negociado (R$)",
          "price_cents",
          decimal(item?.price_cents ?? products[0]?.price_cents ?? 0),
        );
        amount.inputMode = "decimal";
        amount.required = true;
        select.addEventListener("change", () => {
          amount.value = decimal(
            products.find((p) => p.id === select.value)?.price_cents ?? 0,
          );
        });
        const remove = node("button", "Remover item");
        remove.type = "button";
        remove.className = "secondary";
        remove.addEventListener("click", () => row.remove());
        row.append(remove);
        row.readItem = () => ({
          id: select.value,
          quantity: Number(quantity.value),
          price_cents: cents(amount.value),
        });
        rows.append(row);
      }
      s.items.forEach(addRow);
      const add = node("button", "Adicionar item");
      add.type = "button";
      add.className = "secondary";
      add.addEventListener("click", () => addRow());
      form.append(add);
      const discount = field(
        form,
        "Desconto (R$)",
        "discount_cents",
        decimal(s.discount_cents),
      );
      discount.inputMode = "decimal";
      discount.required = true;
      const freight = field(
        form,
        "Frete (R$, vazio = a combinar)",
        "freight_cents",
        decimal(s.freight_cents),
      );
      freight.inputMode = "decimal";
      const modeLabel = node("label", "Modalidade negociada");
      const mode = node("select");
      for (const [value, label] of [
        ["pickup", "Retirada"],
        ["delivery", "Entrega"],
      ]) {
        const o = node("option", label);
        o.value = value;
        mode.append(o);
      }
      mode.value = s.mode;
      modeLabel.append(mode);
      form.append(modeLabel);
      const address = node("fieldset");
      address.className = "stack";
      address.append(node("legend", "Endereço negociado"));
      form.append(address);
      for (const [name, label] of Object.entries({
        cep: "CEP",
        street: "Rua",
        number: "Número ou s/n",
        district: "Bairro",
        city: "Cidade",
        state: "UF",
        complement: "Complemento",
      }))
        field(address, label, name, s.address?.[name] ?? "");
      const modeChanged = () => {
        address.hidden = mode.value !== "delivery";
        address.disabled = address.hidden;
      };
      mode.addEventListener("change", modeChanged);
      modeChanged();
      const save = node("button", "Salvar negociação");
      form.append(save);
      form.addEventListener(
        "submit",
        guarded(async () => {
          const newAddress = Object.fromEntries(
            [...address.querySelectorAll("input")].map((i) => [
              i.name,
              i.value,
            ]),
          );
          await mutate(reference, "edit", {
            version: order.version,
            items: [...rows.children].map((r) => r.readItem()),
            discount_cents: cents(discount.value),
            freight_cents: freight.value === "" ? null : cents(freight.value),
            mode: mode.value,
            address: mode.value === "delivery" ? newAddress : null,
          });
        }),
      );
      root.append(form);
    }
    const original = node("details");
    original.append(node("summary", "Solicitação original"));
    const originalText = node("pre", JSON.stringify(order.original, null, 2));
    originalText.className = "order-history";
    original.append(originalText);
    root.append(original);
    root.append(node("h2", "Histórico de revisões"));
    for (const revision of order.revisions) {
      const entry = node("details");
      entry.append(
        node(
          "summary",
          `${date.format(new Date(revision.created_at))} · ${revision.actor} · ${{ edit: "Negociação", confirm: "Confirmação", complete: "Conclusão", cancel: "Cancelamento", reopen: "Reabertura" }[revision.action]} · ${states[revision.old_state]} → ${states[revision.new_state]}`,
        ),
      );
      const value = node("pre", JSON.stringify(revision.snapshot, null, 2));
      value.className = "order-history";
      entry.append(value);
      root.append(entry);
    }
  }
  $("#orders-search").addEventListener("submit", guarded(list));
  $("#clients-search").addEventListener(
    "submit",
    guarded(async () => {
      const phone = new FormData($("#clients-search")).get("phone");
      const clients = await api(
        `/api/clients?phone=${encodeURIComponent(phone)}`,
      );
      const root = $("#client-detail");
      root.replaceChildren();
      if (!clients.length) root.append(node("p", "Nenhum cliente encontrado."));
      for (const found of clients) {
        const client = await api(`/api/clients/${found.id}`);
        root.append(
          node("h2", client.name),
          node("p", client.phone),
          node(
            "p",
            client.address
              ? `Endereço atual: ${Object.values(client.address).filter(Boolean).join(" · ")}`
              : "Sem endereço atual.",
          ),
        );
        for (const order of client.orders) root.append(link(order));
      }
    }),
  );
  return { list, detail };
}
