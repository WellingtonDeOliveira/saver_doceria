import { setupOrders } from "./orders.js";
import { setupBackup } from "./backup.js";
const $ = (selector) => document.querySelector(selector);
const mobileLayout = window.matchMedia("(max-width: 700px)");
function adaptFilters() {
  $("#product-filters").open = !mobileLayout.matches;
}
adaptFilters();
mobileLayout.addEventListener("change", adaptFilters);
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
let categories = [],
  allProducts = [],
  session,
  editing,
  duplicating = false,
  preparedPhoto,
  stagedPhoto,
  objectUrl;
let stockOperation,
  loadingSequence = 0,
  photoSequence = 0;
let preparingPhoto = false;

function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  return item;
}
function notify(message, state = "") {
  $("#notice").textContent = message;
  $("#notice").className = `notice ${state}`;
  $("#notice").hidden = !message;
}
async function api(path, { method = "GET", data, key, raw } = {}) {
  const headers = {};
  if (data !== undefined)
    headers["Content-Type"] = raw ? data.type : "application/json";
  if (key) headers["Idempotency-Key"] = key;
  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: data === undefined ? undefined : raw ? data : JSON.stringify(data),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Falha de conexão. Confira os dados antes de tentar novamente.",
    );
  }
  if (response.redirected)
    throw new Error(
      "Sessão encerrada. Recarregue o painel para entrar novamente.",
    );
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "Sessão encerrada ou resposta indisponível. Recarregue o painel.",
    );
  }
  if (!response.ok)
    throw new Error(result.error ?? "Não foi possível concluir a operação.");
  return result;
}
function guarded(action) {
  return async (event) => {
    event?.preventDefault();
    const target = event?.currentTarget;
    const buttons =
      target instanceof Element
        ? target.matches("button")
          ? [target]
          : [...target.querySelectorAll("button")]
        : [];
    buttons.forEach((button) => {
      button.disabled = true;
    });
    try {
      await action(event);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      buttons.forEach((button) => {
        button.disabled = false;
      });
    }
  };
}
function options(select, items, empty) {
  select.replaceChildren();
  if (empty !== undefined) {
    const option = node("option", empty);
    option.value = "";
    select.append(option);
  }
  for (const item of items) {
    const option = node("option", item.name);
    option.value = item.id;
    select.append(option);
  }
}
function statusFor(product) {
  if (product.archived) return ["Arquivado", ""];
  if (!product.published) return ["Oculto", ""];
  if (!categories.find((c) => c.id === product.category_id)?.active)
    return ["Categoria inativa", ""];
  if (!product.stock) return ["Esgotado", "zero"];
  return ["No cardápio", "ok"];
}
function actionButton(label, action) {
  const button = node("button", label, "quiet");
  button.type = "button";
  button.addEventListener("click", guarded(action));
  return button;
}
async function renderProducts() {
  const sequence = ++loadingSequence;
  const params = new URLSearchParams(new FormData($("#filter-form")));
  const products = await api(`/api/products?${params}`);
  if (sequence !== loadingSequence) return;
  const rows = $("#product-rows");
  rows.replaceChildren();
  $("#products-empty").hidden = products.length > 0;
  for (const product of products) {
    const row = node("tr");
    const title = node("td");
    const name = node("div", undefined, "table-name");
    name.append(node("span", `${product.name} · ${product.presentation}`));
    title.append(name);
    const [status, className] = statusFor(product);
    const state = node("td");
    state.append(node("span", status, `badge ${className}`));
    const actions = node("td");
    const group = node("div", undefined, "actions");
    group.append(
      actionButton("Editar", () => openProduct(product.id)),
      actionButton("Duplicar", () => openProduct(product.id, true)),
    );
    actions.append(group);
    row.append(
      title,
      node("td", categories.find((c) => c.id === product.category_id)?.name),
      node("td", money.format(product.price_cents / 100)),
      node("td", String(product.stock)),
      state,
      actions,
    );
    ["Produto", "Categoria", "Preço", "Estoque", "Situação", "Ações"].forEach(
      (label, index) => {
        row.children[index].dataset.label = label;
      },
    );
    rows.append(row);
  }
}
function renderCategories() {
  const list = $("#category-rows");
  list.replaceChildren();
  for (const category of categories) {
    const li = node("li", undefined, "panel");
    const form = node("form", undefined, "category-row");
    const nameLabel = node("label", "Nome da categoria");
    const input = node("input");
    input.value = category.name;
    input.required = true;
    input.maxLength = 120;
    nameLabel.append(input);
    const orderLabel = node("label", "Ordem", "order");
    const order = node("input");
    order.type = "number";
    order.min = "0";
    order.max = "1000000";
    order.step = "1";
    order.required = true;
    order.value = category.sort_order;
    orderLabel.append(order);
    const activeLabel = node("label", undefined, "check");
    const active = node("input");
    active.type = "checkbox";
    active.checked = !!category.active;
    activeLabel.append(active, document.createTextNode("Ativa"));
    const save = node("button", "Salvar", "dark");
    save.type = "submit";
    form.append(nameLabel, orderLabel, activeLabel, save);
    form.addEventListener(
      "submit",
      guarded(async () => {
        notify("Salvando categoria…");
        await api(`/api/categories/${category.id}`, {
          method: "PATCH",
          data: {
            name: input.value,
            sort_order: Number(order.value),
            active: active.checked,
            version: category.version,
          },
        });
        await refresh();
        notify("Categoria salva.", "success");
      }),
    );
    li.append(form);
    list.append(li);
  }
  if (!categories.length)
    list.append(node("li", "Nenhuma categoria cadastrada.", "empty"));
}
async function refresh() {
  [categories, allProducts] = await Promise.all([
    api("/api/categories"),
    api("/api/products"),
  ]);
  const selectedCategory = $("#filter-category").value;
  options($("#filter-category"), categories, "Todas");
  $("#filter-category").value = selectedCategory;
  renderCategories();
  const selectedProduct = $("#stock-product").value;
  options(
    $("#stock-product"),
    allProducts.map((p) => ({
      id: p.id,
      name: `${p.name} · ${p.presentation} (saldo ${p.stock})`,
    })),
    "Selecione um produto",
  );
  if (allProducts.some((p) => p.id === selectedProduct))
    $("#stock-product").value = selectedProduct;
  const balances = $("#balance-rows");
  balances.replaceChildren();
  for (const product of allProducts) {
    const row = node("tr");
    row.append(
      node("td", `${product.name} · ${product.presentation}`),
      node("td", String(product.stock)),
    );
    balances.append(row);
  }
  await renderProducts();
}
function showView(name) {
  for (const view of [
    "products",
    "categories",
    "edit",
    "stock",
    "settings",
    "orders",
    "order",
    "clients",
  ])
    $(`#${view}-view`).hidden = view !== name;
  const href = {
    products: "#produtos",
    edit: "#produtos",
    categories: "#categorias",
    stock: "#estoque",
    orders: "#pedidos",
    order: "#pedidos",
    clients: "#clientes",
    settings: "#configuracoes",
  }[name];
  for (const link of document.querySelectorAll(".sidebar nav a")) {
    if (link.hash === href) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}
async function route() {
  if (!session) return;
  const hash = location.hash;
  if (hash === "#pedidos") {
    showView("orders");
    await orderViews.list();
    return;
  }
  if (hash === "#clientes") {
    showView("clients");
    return;
  }
  if (hash.startsWith("#pedido/")) {
    showView("order");
    await orderViews.detail(decodeURIComponent(hash.slice(8)));
    return;
  }
  if (hash === "#configuracoes") {
    const saved = await api("/api/settings");
    const form = $("#settings-form");
    form.dataset.version = saved.version;
    for (const name of ["name", "whatsapp", "greeting", "notice"])
      form.elements[name].value = saved[name];
    showView("settings");
    return;
  }
  if (hash === "#categorias") showView("categories");
  else if (hash === "#estoque") {
    showView("stock");
    await refresh();
    await loadHistory();
  } else if (hash === "#produto" && editing !== undefined) showView("edit");
  else showView("products");
}
function resetPhoto() {
  photoSequence++;
  preparingPhoto = false;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = undefined;
  preparedPhoto = undefined;
  stagedPhoto = undefined;
  $("#photo-file").value = "";
  $("#photo-info").textContent = "";
  $("#photo-status").textContent = "";
  $("#save-photo").hidden = true;
}
async function openProduct(id, duplicate = false, preservePhoto = false) {
  const form = $("#product-form");
  form.reset();
  if (!preservePhoto) resetPhoto();
  editing = id ? await api(`/api/products/${id}`) : null;
  duplicating = duplicate;
  $("#edit-title").textContent = duplicate
    ? "Duplicar produto"
    : editing
      ? "Editar produto"
      : "Novo produto";
  options($("#product-category"), categories, "Selecione uma categoria");
  for (const field of [
    "name",
    "presentation",
    "description",
    "category_id",
    "sort_order",
  ])
    form.elements[field].value =
      editing?.[field] ?? (field === "sort_order" ? 0 : "");
  form.elements.price.value = editing
    ? (editing.price_cents / 100).toFixed(2).replace(".", ",")
    : "";
  form.elements.published.checked = !!editing?.published && !duplicate;
  form.elements.archived.checked = !!editing?.archived && !duplicate;
  const isNew = !editing || duplicate;
  $("#initial-stock-label").hidden = !isNew;
  form.elements.initial_stock.required = isNew;
  form.elements.initial_stock.value = "";
  $("#current-stock").hidden = isNew;
  $("#current-stock").textContent =
    `Estoque atual: ${editing?.stock ?? 0}. Movimente na tela Estoque.`;
  $("#photo-preview").hidden = !editing?.media_id || duplicate;
  $("#photo-empty").hidden = !!editing?.media_id && !duplicate;
  if (editing?.media_id && !duplicate)
    $("#photo-preview").src = `/api/media/${editing.media_id}/preview`;
  $("#photo-file").disabled = false;
  if (preservePhoto && objectUrl) {
    $("#photo-preview").src = objectUrl;
    $("#photo-preview").hidden = false;
    $("#photo-empty").hidden = true;
    $("#save-photo").hidden = false;
  }
  location.hash = "#produto";
  showView("edit");
  form.elements.name.focus();
}
$("#new-product").addEventListener(
  "click",
  guarded(() => openProduct()),
);
$("#clean-media").addEventListener(
  "click",
  guarded(async () => {
    notify("Limpando fotos não utilizadas…");
    const result = await api("/api/media/cleanup", { method: "POST" });
    notify(
      `${result.deleted} foto(s) não utilizada(s) removida(s). Fotos recentes e referências em uso são preservadas.`,
      "success",
    );
  }),
);
$("#filter-form").addEventListener("submit", guarded(renderProducts));
$("#new-category").addEventListener(
  "submit",
  guarded(async () => {
    notify("Criando categoria…");
    const form = $("#new-category");
    await api("/api/categories", {
      method: "POST",
      data: {
        name: form.elements.name.value,
        sort_order: Number(form.elements.sort_order.value),
      },
    });
    form.reset();
    await refresh();
    notify("Categoria criada.", "success");
  }),
);
$("#product-form").addEventListener(
  "submit",
  guarded(async () => {
    if (preparingPhoto)
      throw new Error(
        "Aguarde a preparação da foto antes de salvar o produto.",
      );
    notify("Salvando produto…");
    const form = $("#product-form"),
      fields = form.elements;
    const normalized = fields.price.value.replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(normalized))
      throw new Error("Informe o preço com até duas casas decimais.");
    const data = {
      name: fields.name.value,
      presentation: fields.presentation.value,
      description: fields.description.value,
      category_id: fields.category_id.value,
      price_cents: Math.round(Number(normalized) * 100),
      sort_order: Number(fields.sort_order.value),
      published: fields.published.checked,
      archived: fields.archived.checked,
    };
    const isNew = !editing || duplicating;
    if (isNew) data.initial_stock = Number(fields.initial_stock.value);
    else data.version = editing.version;
    const url = duplicating
      ? `/api/products/${editing.id}/duplicate`
      : editing
        ? `/api/products/${editing.id}`
        : "/api/products";
    const saved = await api(url, { method: isNew ? "POST" : "PATCH", data });
    const hasPhoto = !!preparedPhoto;
    if (location.hash === "#produto")
      await openProduct(saved.id, false, hasPhoto);
    if (hasPhoto) {
      try {
        await savePhoto();
      } catch (error) {
        throw new Error(
          `Produto salvo, mas a foto não foi salva. ${error.message} Use “Enviar e substituir foto” para tentar novamente.`,
        );
      }
    }
    await refresh();
    notify(
      hasPhoto
        ? "Produto e foto salvos."
        : "Produto salvo. Você já pode enviar a foto.",
      "success",
    );
  }),
);

async function compressPhoto(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Selecione JPEG, PNG ou WebP.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("A foto original deve ter até 5 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= 256 * 1024) return blob;
    }
    throw new Error(
      "A foto ainda está muito grande. Escolha uma imagem menor.",
    );
  } finally {
    bitmap.close();
  }
}
$("#photo-file").addEventListener(
  "change",
  guarded(async () => {
    resetPreparedPhoto();
    const file = $("#photo-file").files[0];
    if (!file) return;
    const sequence = ++photoSequence;
    preparingPhoto = true;
    $("#photo-status").textContent = "Preparando a foto…";
    let photo;
    try {
      photo = await compressPhoto(file);
    } catch (error) {
      if (sequence === photoSequence)
        $("#photo-status").textContent = error.message;
      return;
    } finally {
      if (sequence === photoSequence) preparingPhoto = false;
    }
    if (sequence !== photoSequence) return;
    preparedPhoto = photo;
    objectUrl = URL.createObjectURL(photo);
    $("#photo-preview").src = objectUrl;
    $("#photo-preview").hidden = false;
    $("#photo-empty").hidden = true;
    $("#photo-info").textContent =
      `${file.name} · original ${Math.ceil(file.size / 1024)} KB → envio ${Math.ceil(photo.size / 1024)} KB`;
    $("#photo-status").textContent =
      "Prévia pronta. Salve o produto para salvar também a foto.";
    $("#save-photo").hidden = !editing || duplicating;
  }),
);
function resetPreparedPhoto() {
  photoSequence++;
  preparingPhoto = false;
  preparedPhoto = undefined;
  stagedPhoto = undefined;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = undefined;
  $("#save-photo").hidden = true;
}
async function savePhoto() {
  if (!preparedPhoto || !editing) return;
  const sequence = photoSequence,
    productId = editing.id,
    version = editing.version;
  notify("Enviando foto…");
  $("#photo-status").textContent = "Enviando e verificando a distribuição…";
  try {
    const staged =
      stagedPhoto ??
      (await api("/api/media", {
        method: "POST",
        data: preparedPhoto,
        raw: true,
      }));
    if (sequence !== photoSequence) return;
    stagedPhoto = staged;
    await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = () =>
        reject(
          new Error(
            "A foto ainda está em distribuição. A anterior continua salva. Tente novamente em instantes.",
          ),
        );
      image.src = staged.preview_url;
    });
    if (sequence !== photoSequence) return;
    const saved = await api(`/api/products/${productId}/photo`, {
      method: "PUT",
      data: { media_id: staged.id, version },
    });
    if (sequence !== photoSequence) return;
    editing = saved;
    $("#photo-file").value = "";
    resetPreparedPhoto();
    $("#photo-status").textContent =
      "Foto salva. A distribuição pode levar alguns instantes; a anterior permanece como alternativa.";
    await refresh();
    notify("Foto salva.", "success");
  } catch (error) {
    $("#photo-status").textContent = error.message;
    throw error;
  }
}
$("#save-photo").addEventListener("click", guarded(savePhoto));

function stockPreview() {
  const form = $("#stock-form"),
    kind = form.elements.kind.value,
    p = allProducts.find((p) => p.id === form.elements.product_id.value),
    quantity = Number(form.elements.quantity.value);
  const correction = kind === "correction";
  $("#quantity-label").textContent = correction
    ? "Saldo correto"
    : "Quantidade";
  form.elements.quantity.min = correction ? "0" : "1";
  const required = correction || kind === "physical_return";
  $("#return-reference-label").hidden = kind !== "physical_return";
  form.elements.order_reference.required = kind === "physical_return";
  form.elements.reason.required = required;
  $("#reason-label").textContent = required
    ? "Justificativa *"
    : "Justificativa (opcional)";
  const after = correction
    ? quantity
    : (p?.stock ?? 0) + (kind === "exit" ? -quantity : quantity);
  $("#stock-preview").textContent = p
    ? `Saldo: ${p.stock} → ${after < 0 ? "recusada: sem saldo" : after}`
    : "Selecione um produto.";
}
async function loadHistory() {
  stockPreview();
  const id = $("#stock-product").value;
  const list = $("#history");
  list.replaceChildren();
  if (!id) {
    list.append(
      node("li", "Selecione um produto para consultar seu histórico."),
    );
    return;
  }
  const movements = await api(`/api/products/${id}/stock`);
  if ($("#stock-product").value !== id) return;
  const kinds = {
    initial: "Saldo inicial",
    entry: "Entrada",
    exit: "Saída",
    correction: "Correção",
    physical_return: "Retorno físico",
  };
  list.replaceChildren();
  for (const movement of movements) {
    const li = node("li");
    li.append(
      node(
        "strong",
        `${kinds[movement.kind]} · ${movement.before_stock} → ${movement.after_stock}`,
      ),
      node(
        "span",
        (movement.order_reference
          ? `Pedido ${movement.order_reference} · `
          : "") +
          ((movement.origin === "order"
            ? {
                confirm: "Confirmação do pedido",
                cancel: "Cancelamento do pedido",
                edit: "Ajuste da negociação",
              }[movement.reason]
            : movement.reason) ||
            (movement.origin === "product_creation"
              ? "Cadastro do produto"
              : "Manual")),
      ),
      node(
        "small",
        `${date.format(new Date(movement.created_at))} · ${movement.actor} · quantidade ${movement.quantity}`,
      ),
    );
    list.append(li);
  }
}
$("#stock-product").addEventListener("change", guarded(loadHistory));
$("#stock-form").addEventListener("input", stockPreview);
$("#stock-kind").addEventListener("change", stockPreview);
$("#stock-form").addEventListener(
  "submit",
  guarded(async () => {
    notify("Registrando movimentação…");
    const form = $("#stock-form"),
      p = allProducts.find((p) => p.id === form.elements.product_id.value);
    if (!p) throw new Error("Selecione um produto.");
    const payload = {
      kind: form.elements.kind.value,
      quantity: Number(form.elements.quantity.value),
      reason: form.elements.reason.value,
      version: p.version,
      ...(form.elements.kind.value === "physical_return"
        ? { order_reference: form.elements.order_reference.value }
        : {}),
    };
    const signature = JSON.stringify([p.id, payload]);
    if (stockOperation?.signature !== signature)
      stockOperation = { signature, key: crypto.randomUUID() };
    await api(`/api/products/${p.id}/stock`, {
      method: "POST",
      data: payload,
      key: stockOperation.key,
    });
    stockOperation = undefined;
    await refresh();
    await loadHistory();
    form.elements.quantity.value = "";
    form.elements.reason.value = "";
    stockPreview();
    notify("Movimentação registrada.", "success");
  }),
);
async function start() {
  $("#retry").hidden = true;
  notify("Carregando o painel…");
  try {
    session = await api("/api/session");
    $("#identity").textContent = session.email;
    $("#public-link").href = session.public_origin;
    await refresh();
    await route();
    notify("");
  } catch (error) {
    notify(error.message, "error");
    $("#retry").hidden = false;
  }
}
$("#retry").addEventListener("click", start);
window.addEventListener("hashchange", guarded(route));
$("#settings-form").addEventListener(
  "submit",
  guarded(async () => {
    const form = $("#settings-form");
    const saved = await api("/api/settings", {
      method: "PUT",
      data: {
        ...Object.fromEntries(new FormData(form)),
        version: Number(form.dataset.version),
      },
    });
    form.dataset.version = saved.version;
    notify("Configurações salvas.", "success");
  }),
);
const orderViews = setupOrders({ api, guarded, notify, node, money, date });
setupBackup({ api, guarded });
start();
