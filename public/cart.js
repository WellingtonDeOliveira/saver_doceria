const storageKey = "saver-cart-v1";
export let cart = [];
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
  if (
    Array.isArray(saved) &&
    saved.length <= 50 &&
    saved.every(
      (i) =>
        i &&
        typeof i.id === "string" &&
        typeof i.name === "string" &&
        typeof i.presentation === "string" &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0 &&
        i.quantity <= 1000 &&
        Number.isInteger(i.price_cents) &&
        i.price_cents >= 0 &&
        i.price_cents <= 1000000,
    ) &&
    new Set(saved.map((i) => i.id)).size === saved.length
  )
    cart = saved;
} catch {
  /* Corrupt or unavailable browser storage starts an empty cart. */
}
export function replaceCart(items) {
  cart = items;
  try {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  } catch {
    document.querySelector("#cart-status").textContent =
      "O navegador não permitiu salvar o carrinho. Mantenha esta página aberta.";
  }
  window.dispatchEvent(new Event("cart-change"));
}
export function addToCart(product) {
  const existing = cart.find((i) => i.id === product.id);
  if (existing?.quantity >= 1000 || (!existing && cart.length >= 50)) return;
  replaceCart(
    existing
      ? cart.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + 1 } : i,
        )
      : [
          ...cart,
          {
            id: product.id,
            name: product.name,
            presentation: product.presentation,
            price_cents: product.price_cents,
            quantity: 1,
          },
        ],
  );
}
