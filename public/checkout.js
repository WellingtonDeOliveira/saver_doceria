import { cart, replaceCart } from "./cart.js";
import { openDialog } from "./dialog.js";
const $ = (selector) => document.querySelector(selector);
const money = (c) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    c / 100,
  );
const form = $("#checkout");
let step = 0,
  submitting = false;
const stepTitles = [
  "Seu carrinho",
  "Seus dados",
  "Entrega ou retirada",
  "Revise sua solicitação",
  "Tudo pronto para o WhatsApp",
];
$("#open-cart").addEventListener("click", () => {
  $("#open-cart").focus();
  openDialog($("#cart-dialog"));
});
$("#close-cart").addEventListener("click", () => $("#cart-dialog").close());
function setStep(value, focus = true) {
  step = value;
  if (step > 0 && step < 4) $("#cart-status").textContent = "";
  $("#cart-selection").hidden = step !== 0;
  form.hidden = step === 0 || step === 4;
  $("#customer-step").hidden = step !== 1;
  $("#address-step").hidden = step !== 2;
  $("#review-step").hidden = step !== 3;
  $("#next-step").hidden = step === 3;
  $("#submit-order").hidden = step !== 3;
  $("#cart-title").textContent = stepTitles[step];
  document.querySelectorAll(".checkout-steps li").forEach((item, index) => {
    item.classList.toggle("complete", index < step);
    item.querySelector("span").textContent = index < step ? "✓" : index + 1;
    if (index === step) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  if (focus) {
    $("#cart-dialog").scrollTop = 0;
    $("#cart-title").focus();
  }
}
function validateStep() {
  const fields =
    step === 1
      ? [form.elements.name, form.elements.phone]
      : [...$("#address-step").querySelectorAll("input,select")].filter(
          (field) => !field.matches(":disabled"),
        );
  form.elements.name.setCustomValidity(
    form.elements.name.value.trim() ? "" : "Informe seu nome.",
  );
  form.elements.phone.setCustomValidity(
    /^(55)?[1-9]{2}9\d{8}$/.test(form.elements.phone.value.replace(/\D/g, ""))
      ? ""
      : "Informe celular brasileiro com DDD e nove dígitos.",
  );
  return fields.every((field) => field.reportValidity());
}
function renderSummary() {
  const summary = $("#order-summary");
  summary.replaceChildren();
  for (const item of cart)
    summary.append(
      node(
        "p",
        `${item.quantity} × ${item.name} · ${item.presentation} — ${money(item.quantity * item.price_cents)}`,
      ),
    );
  summary.append(
    node(
      "strong",
      `Total dos doces: ${money(cart.reduce((total, item) => total + item.quantity * item.price_cents, 0))}`,
    ),
    node("p", `${form.elements.name.value} · ${form.elements.phone.value}`),
  );
  summary.append(
    node(
      "p",
      form.elements.mode.value === "delivery"
        ? `Entrega: ${form.elements.street.value}, ${form.elements.number.value}${form.elements.complement.value ? ` · ${form.elements.complement.value}` : ""} · ${form.elements.district.value} · ${form.elements.city.value}/${form.elements.state.value} · CEP ${form.elements.cep.value}`
        : "Retirada · local e horário a combinar pelo WhatsApp.",
    ),
  );
}
$("#next-step").addEventListener("click", () => {
  if (submitting || !validateStep()) return;
  if (step === 2) renderSummary();
  setStep(step + 1);
});
$("#previous-step").addEventListener("click", () => {
  if (!submitting) setStep(Math.max(0, step - 1));
});
let proposed,
  reviewed = false,
  pendingOperation;
try {
  pendingOperation = JSON.parse(
    sessionStorage.getItem("saver-pending-order") || "null",
  );
} catch {
  /* optional storage */
}
function node(tag, text) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
}
function renderCart() {
  reviewed = false;
  form.hidden = true;
  $("#order-result").hidden = true;
  $("#accept-changes").hidden = true;
  proposed = null;
  setStep(0, false);
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  $("#cart-count").textContent = count;
  $("#open-cart").setAttribute(
    "aria-label",
    `Abrir carrinho, ${count} ${count === 1 ? "item" : "itens"}`,
  );
  const list = $("#cart-items");
  list.replaceChildren();
  for (const item of cart) {
    const row = node("div");
    row.className = "cart-row";
    const copy = node("div");
    copy.className = "cart-item-copy";
    copy.append(
      node("strong", item.name),
      node("small", item.presentation),
      node("small", `${money(item.price_cents)} cada`),
    );
    row.append(copy);
    const label = node("label", "Quantidade");
    const quantity = node("input");
    quantity.type = "number";
    quantity.min = "1";
    quantity.max = "1000";
    quantity.value = item.quantity;
    quantity.setAttribute(
      "aria-label",
      `Quantidade de ${item.name} · ${item.presentation}`,
    );
    quantity.addEventListener("change", () => {
      const value = Number(quantity.value);
      if (Number.isInteger(value) && value >= 1 && value <= 1000)
        replaceCart(
          cart.map((i) => (i.id === item.id ? { ...i, quantity: value } : i)),
        );
      else quantity.value = item.quantity;
    });
    label.append(quantity);
    row.append(label, node("span", money(item.quantity * item.price_cents)));
    const remove = node("button", "Remover");
    remove.type = "button";
    remove.className = "secondary";
    remove.addEventListener("click", () =>
      replaceCart(cart.filter((i) => i.id !== item.id)),
    );
    row.append(remove);
    list.append(row);
  }
  $("#cart-total").textContent = cart.length
    ? `Total dos doces: ${money(cart.reduce((sum, i) => sum + i.price_cents * i.quantity, 0))}`
    : "Seu carrinho está vazio.";
  $("#review-cart").disabled = !cart.length;
}
async function post(path, data, key) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error(
      "Falha de conexão. Tente novamente; sua seleção está preservada.",
    );
  }
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || "Serviço indisponível.");
    error.quote = result.quote;
    error.status = response.status;
    throw error;
  }
  return result;
}
function differences(quote) {
  reviewed = false;
  form.hidden = true;
  proposed = quote;
  setStep(0);
  $("#cart-status").textContent =
    `Revise as alterações: ${quote.differences.join(" ")} Novo total: ${money(quote.total_cents)}.`;
  $("#accept-changes").hidden = false;
}
$("#review-cart").addEventListener("click", async () => {
  const signature = JSON.stringify(cart);
  $("#review-cart").disabled = true;
  try {
    const quote = await post("/api/quote", { items: cart });
    if (signature !== JSON.stringify(cart)) return;
    if (quote.changed) differences(quote);
    else {
      replaceCart(quote.items);
      reviewed = true;
      setStep(1);
      $("#cart-status").textContent =
        "Carrinho revisado. Preencha seus dados para registrar a solicitação.";
    }
  } catch (error) {
    $("#cart-status").textContent = error.message;
  } finally {
    $("#review-cart").disabled = !cart.length;
  }
});
$("#accept-changes").addEventListener("click", () => {
  replaceCart(proposed.items);
  $("#cart-status").textContent =
    "Alterações aceitas. Revise novamente para continuar.";
});
form.elements.mode.addEventListener("change", () => {
  const delivery = form.elements.mode.value === "delivery";
  $("#delivery-address").hidden = !delivery;
  $("#delivery-address").disabled = !delivery;
  $("#pickup-note").hidden = delivery;
});
let cepSequence = 0,
  controller;
form.elements.cep.addEventListener("input", () => {
  cepSequence++;
  controller?.abort();
  $("#cep-status").textContent = "";
});
$("#lookup-cep").addEventListener("click", async () => {
  const cep = form.elements.cep.value.replace(/\D/g, "");
  if (!/^\d{8}$/.test(cep)) {
    $("#cep-status").textContent =
      "Informe CEP com oito dígitos ou preencha o endereço manualmente.";
    return;
  }
  const sequence = ++cepSequence;
  controller?.abort();
  controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  $("#cep-status").textContent =
    "Consultando CEP… Você também pode preencher manualmente.";
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error();
    const address = await response.json();
    if (sequence !== cepSequence) return;
    if (address.erro) throw new Error();
    for (const [field, key] of Object.entries({
      street: "logradouro",
      district: "bairro",
      city: "localidade",
      state: "uf",
    }))
      if (typeof address[key] === "string" && address[key])
        form.elements[field].value = address[key];
    $("#cep-status").textContent =
      "Confira o endereço e informe o número ou s/n. Você pode corrigir todos os campos.";
  } catch {
    if (sequence === cepSequence)
      $("#cep-status").textContent =
        "CEP não encontrado ou serviço indisponível. Preencha o endereço manualmente.";
  } finally {
    clearTimeout(timeout);
  }
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (step === 1 || step === 2) {
    $("#next-step").click();
    return;
  }
  if (!reviewed || step !== 3 || submitting) return;
  submitting = true;
  const fields = Object.fromEntries(new FormData(form));
  const payload = {
    name: fields.name,
    phone: fields.phone,
    mode: fields.mode,
    items: cart,
    ...(fields.mode === "delivery"
      ? {
          address: Object.fromEntries(
            [
              "cep",
              "street",
              "number",
              "complement",
              "district",
              "city",
              "state",
            ].map((k) => [k, fields[k]]),
          ),
        }
      : {}),
  };
  const signature = JSON.stringify(payload);
  if (pendingOperation?.signature !== signature)
    pendingOperation = { signature, key: crypto.randomUUID() };
  try {
    sessionStorage.setItem(
      "saver-pending-order",
      JSON.stringify(pendingOperation),
    );
  } catch {
    /* retries still work in this tab */
  }
  $("#submit-order").disabled = true;
  const frozenControls = [
    ...document.querySelectorAll(
      "#products button,#cart-items button,#cart-items input,#checkout input,#checkout select,#checkout button,#close-cart",
    ),
  ].map((control) => [control, control.disabled]);
  for (const [control] of frozenControls) control.disabled = true;
  // Keep the reviewed selection stable until the server accepts or rejects it.
  for (const selector of ["#products", "#cart-items", "#checkout"])
    $(selector).inert = true;
  $("#review-cart").disabled = true;
  $("#accept-changes").disabled = true;
  $("#cart-status").textContent =
    "Registrando solicitação… Aguarde o resultado antes de alterar a seleção.";
  try {
    const receipt = await post("/api/orders", payload, pendingOperation.key);
    replaceCart([]);
    form.hidden = true;
    $("#order-reference").textContent = `Referência: ${receipt.reference}`;
    $("#whatsapp-link").href = receipt.whatsapp_url;
    $("#order-result").hidden = false;
    setStep(4);
    $("#whatsapp-link").click();
    $("#cart-status").textContent =
      "Solicitação registrada; aguardando confirmação no atendimento.";
    pendingOperation = null;
    try {
      sessionStorage.removeItem("saver-pending-order");
    } catch {}
  } catch (error) {
    if (error.quote) differences(error.quote);
    else if (error.status === 409) {
      reviewed = false;
      setStep(0);
    }
    $("#cart-status").textContent = error.message;
  } finally {
    for (const [control, disabled] of frozenControls)
      control.disabled = disabled;
    for (const selector of ["#products", "#cart-items", "#checkout"])
      $(selector).inert = false;
    $("#review-cart").disabled = !cart.length;
    $("#accept-changes").disabled = false;
    $("#submit-order").disabled = false;
    submitting = false;
  }
});
window.addEventListener("cart-change", renderCart);
renderCart();
