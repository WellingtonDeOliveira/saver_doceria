const status = document.querySelector("#status");
const products = document.querySelector("#products");
const categories = document.querySelector("#categories");
const reload = document.querySelector("#reload");
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
let catalog,
  selected = "";
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function render() {
  products.replaceChildren();
  categories.replaceChildren();
  for (const category of [{ id: "", name: "Todos" }, ...catalog.categories]) {
    const button = element("button", category.name, "secondary");
    button.type = "button";
    button.setAttribute("aria-pressed", String(selected === category.id));
    button.addEventListener("click", () => {
      selected = category.id;
      render();
    });
    categories.append(button);
  }
  for (const product of catalog.products.filter(
    (p) => !selected || p.category_id === selected,
  )) {
    const card = element("article", undefined, "sweet-card");
    let photo = element("span", "S", "photo-placeholder");
    photo.setAttribute("aria-hidden", "true");
    if (product.media_id) {
      photo = element("img");
      photo.src = `/media/${product.media_id}`;
      photo.alt = product.name;
      photo.loading = "lazy";
      photo.width = 108;
      photo.height = 108;
      photo.addEventListener("error", () => {
        const fallback = element("span", "S", "photo-placeholder");
        fallback.setAttribute("aria-hidden", "true");
        photo.replaceWith(fallback);
      });
    }
    const copy = element("div", undefined, "sweet-copy");
    copy.append(
      element(
        "span",
        catalog.categories.find((c) => c.id === product.category_id)?.name,
        "eyebrow",
      ),
      element("h3", product.name),
      element("p", product.presentation),
      element("p", product.description),
      element("span", money.format(product.price_cents / 100), "price"),
    );
    card.append(photo, copy);
    products.append(card);
  }
  status.hidden = !!catalog.products.length;
  status.textContent =
    "Estamos preparando novos doces. Volte em breve para conferir o cardápio!";
}
async function load() {
  status.hidden = false;
  status.textContent = "Carregando os doces…";
  reload.hidden = true;
  try {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    if (!response.ok) throw new Error();
    catalog = await response.json();
    if (!catalog.categories.some((c) => c.id === selected)) selected = "";
    render();
  } catch {
    status.hidden = false;
    status.textContent =
      "Não foi possível carregar o cardápio. Confira sua conexão e tente novamente.";
    reload.hidden = false;
  }
}
reload.addEventListener("click", load);
load();
