import type { Env } from "./env";
import { visibleProductSql } from "./catalog";
import { body, HttpError, integer, json, text } from "./http";
import { readSettings } from "./settings";

export interface OrderItem {
  id: string;
  name: string;
  presentation: string;
  quantity: number;
  price_cents: number;
}
export function cartItems(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50)
    throw new HttpError(400, "Selecione entre 1 e 50 doces.");
  const seen = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== "object")
      throw new HttpError(400, "Item inválido.");
    const id = text(item.id, "Produto");
    if (seen.has(id)) throw new HttpError(400, "Produto repetido.");
    seen.add(id);
    return {
      id,
      quantity: integer(item.quantity, "Quantidade", 1, 1000),
      price_cents: integer(item.price_cents, "Preço"),
    };
  });
}
export async function quote(env: Env, value: unknown) {
  const requested = cartItems(value);
  const items: OrderItem[] = [];
  const differences: string[] = [];
  // One database read keeps the quote internally consistent; submit checks again atomically.
  const available = (
    await env.DB.prepare(
      `SELECT p.id,p.name,p.presentation,p.price_cents,p.stock FROM products p JOIN categories c ON c.id=p.category_id WHERE ${visibleProductSql} AND p.id IN (${requested.map(() => "?").join(",")})`,
    )
      .bind(...requested.map((i) => i.id))
      .all<OrderItem & { stock: number }>()
  ).results;
  for (const item of requested) {
    const p = available.find((p) => p.id === item.id);
    if (!p) {
      differences.push(`Produto ${item.id} indisponível e removido.`);
      continue;
    }
    if (p.price_cents !== item.price_cents)
      differences.push(
        `${p.name} · ${p.presentation}: preço atualizado de R$ ${(item.price_cents / 100).toFixed(2)} para R$ ${(p.price_cents / 100).toFixed(2)}.`,
      );
    if (p.stock < item.quantity)
      differences.push(`${p.name}: quantidade reduzida para ${p.stock}.`);
    items.push({
      id: p.id,
      name: p.name,
      presentation: p.presentation,
      price_cents: p.price_cents,
      quantity: Math.min(item.quantity, p.stock),
    });
  }
  return {
    items,
    differences,
    changed: differences.length > 0,
    total_cents: items.reduce(
      (total, i) => total + i.quantity * i.price_cents,
      0,
    ),
  };
}
export async function publicQuote(request: Request, env: Env) {
  return json(await quote(env, (await body(request)).items));
}

export function phoneNumber(value: unknown) {
  let phone = text(value, "Celular", 30).replace(/\D/g, "");
  if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
  if (!/^55[1-9]{2}9\d{8}$/.test(phone))
    throw new HttpError(
      400,
      "Informe celular brasileiro com DDD e nove dígitos.",
    );
  return phone;
}
export interface Address {
  cep: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  complement: string;
}
export function orderAddress(value: unknown): Address {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpError(400, "Preencha o endereço de entrega.");
  const a = value as Record<string, unknown>;
  const cep = text(a.cep, "CEP", 10).replace(/\D/g, "");
  const state = text(a.state, "UF", 2).toUpperCase();
  if (
    !/^\d{8}$/.test(cep) ||
    !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(
      state,
    )
  )
    throw new HttpError(400, "CEP ou UF inválido.");
  return {
    cep,
    state,
    street: text(a.street, "Rua"),
    number: text(a.number, "Número ou s/n", 30),
    district: text(a.district, "Bairro"),
    city: text(a.city, "Cidade"),
    complement: text(a.complement, "Complemento", 120, true),
  };
}
export interface Snapshot {
  name: string;
  phone: string;
  mode: "pickup" | "delivery";
  address: Address | null;
  items: OrderItem[];
  discount_cents: number;
  freight_cents: number | null;
  total_cents: number;
}
async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
function operationKey(request: Request) {
  const key = text(
    request.headers.get("Idempotency-Key"),
    "Identificador da operação",
    100,
  );
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      key,
    )
  )
    throw new HttpError(400, "Identificador da operação inválido.");
  return key;
}
export async function submitOrder(request: Request, env: Env) {
  const origin = env.PUBLIC_ORIGIN || new URL(request.url).origin;
  if (request.headers.get("Origin") !== origin)
    throw new HttpError(403, "Origem não autorizada.");
  const data = await body(request);
  const key = operationKey(request);
  const name = text(data.name, "Nome");
  const phone = phoneNumber(data.phone);
  if (data.mode !== "pickup" && data.mode !== "delivery")
    throw new HttpError(400, "Escolha entrega ou retirada.");
  const address = data.mode === "delivery" ? orderAddress(data.address) : null;
  const requested = cartItems(data.items);
  const fingerprint = await digest(
    JSON.stringify([name, phone, data.mode, address, requested]),
  );
  const repeat = async () => {
    const previous = await env.DB.prepare(
      "SELECT fingerprint,receipt FROM orders WHERE operation_key=?",
    )
      .bind(key)
      .first<{ fingerprint: string; receipt: string }>();
    if (!previous) return null;
    if (previous.fingerprint !== fingerprint)
      throw new HttpError(409, "Identificador já usado em outra solicitação.");
    return json(JSON.parse(previous.receipt));
  };
  const prior = await repeat();
  if (prior) return prior;
  const current = await quote(env, requested);
  if (current.changed)
    return json(
      { error: "O carrinho mudou. Revise antes de registrar.", quote: current },
      409,
    );
  const settings = await readSettings(env);
  if (!settings.whatsapp)
    throw new HttpError(
      503,
      "WhatsApp da loja ainda não configurado. Tente mais tarde.",
    );
  const reference = crypto.randomUUID();
  const snapshot: Snapshot = {
    name,
    phone,
    mode: data.mode,
    address,
    items: current.items,
    discount_cents: 0,
    freight_cents: data.mode === "delivery" ? null : 0,
    total_cents: current.total_cents,
  };
  const currency = (c: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(c / 100);
  const message = [
    settings.greeting,
    `Solicitação ${reference} — ${settings.name}`,
    `${name} · ${phone}`,
    ...current.items.map(
      (i) =>
        `${i.quantity} × ${i.name} · ${i.presentation} · ${currency(i.price_cents)} = ${currency(i.price_cents * i.quantity)}`,
    ),
    `Total dos doces: ${currency(current.total_cents)}`,
    address
      ? `Entrega · frete a combinar\n${address.street}, ${address.number} · ${address.complement}\n${address.district} · ${address.city}/${address.state} · CEP ${address.cep}`
      : "Retirada",
    "Solicitação sujeita à confirmação no atendimento. Sem reserva de estoque.",
  ]
    .filter(Boolean)
    .join("\n");
  const receipt = {
    reference,
    whatsapp_url: `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(message)}`,
  };
  const bucket = await digest(
    request.headers.get("CF-Connecting-IP") || "local",
  );
  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO clients(id,phone,name,address) VALUES(?,?,?,?) ON CONFLICT(phone) DO UPDATE SET name=excluded.name,address=COALESCE(excluded.address,clients.address),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
      ).bind(
        crypto.randomUUID(),
        phone,
        name,
        address ? JSON.stringify(address) : null,
      ),
      env.DB.prepare(
        `INSERT INTO orders(reference,client_id,snapshot,original,operation_key,fingerprint,receipt,request_bucket) SELECT ?,id,?,?,?,?,?,? FROM clients WHERE phone=?`,
      ).bind(
        reference,
        JSON.stringify(snapshot),
        JSON.stringify(snapshot),
        key,
        fingerprint,
        JSON.stringify(receipt),
        bucket,
        phone,
      ),
    ]);
  } catch (error) {
    const repeated = await repeat();
    if (repeated) return repeated;
    if (String(error).includes("quote_changed"))
      throw new HttpError(
        409,
        "Carrinho alterado. Revise os preços e quantidades.",
      );
    if (String(error).includes("rate_limit"))
      throw new HttpError(
        429,
        "Muitas solicitações. Aguarde uma hora ou fale com a loja.",
      );
    throw error;
  }
  return json(receipt, 201);
}
export interface SavedOrder {
  reference: string;
  client_id: string;
  state: string;
  snapshot: string;
  original: string;
  version: number;
}
export async function readOrder(env: Env, reference: string) {
  const saved = await env.DB.prepare(
    "SELECT reference,client_id,state,snapshot,original,version,created_at,updated_at FROM orders WHERE reference=?",
  )
    .bind(reference)
    .first<SavedOrder>();
  if (!saved) throw new HttpError(404, "Pedido não encontrado.");
  const revisions = (
    await env.DB.prepare(
      "SELECT id,action,actor,old_state,new_state,snapshot,expected_version,created_at FROM order_revisions WHERE reference=? ORDER BY expected_version",
    )
      .bind(reference)
      .all<{ snapshot: string }>()
  ).results.map((r) => ({ ...r, snapshot: JSON.parse(r.snapshot) }));
  return {
    ...saved,
    snapshot: JSON.parse(saved.snapshot) as Snapshot,
    original: JSON.parse(saved.original) as Snapshot,
    revisions,
  };
}
export async function adminOrders(
  request: Request,
  env: Env,
  actor: string,
  reference?: string,
) {
  if (reference && request.method === "PATCH")
    return reviseOrder(request, env, actor, reference, "edit");
  if (request.method !== "GET") throw new HttpError(405, "Ação não permitida.");
  if (reference) return json(await readOrder(env, reference));
  const query = new URL(request.url).searchParams.get("q") || "";
  return json(
    (
      await env.DB.prepare(
        "SELECT reference,state,version,created_at,json_extract(snapshot,'$.name') AS name,json_extract(snapshot,'$.total_cents') AS total_cents FROM orders WHERE instr(reference,?)>0 ORDER BY created_at DESC LIMIT 100",
      )
        .bind(query)
        .all()
    ).results,
  );
}

async function editedSnapshot(
  env: Env,
  previous: Snapshot,
  data: Record<string, unknown>,
): Promise<Snapshot> {
  const requested = cartItems(data.items);
  const items: OrderItem[] = [];
  for (const item of requested) {
    const p = await env.DB.prepare(
      "SELECT id,name,presentation FROM products WHERE id=?",
    )
      .bind(item.id)
      .first<{ id: string; name: string; presentation: string }>();
    if (!p) throw new HttpError(400, "Produto não encontrado.");
    const old = previous.items.find((i) => i.id === p.id);
    items.push({
      ...p,
      name: old?.name ?? p.name,
      presentation: old?.presentation ?? p.presentation,
      quantity: item.quantity,
      price_cents: item.price_cents,
    });
  }
  const mode = data.mode ?? previous.mode;
  if (mode !== "pickup" && mode !== "delivery")
    throw new HttpError(400, "Modalidade inválida.");
  const address =
    mode === "delivery" ? orderAddress(data.address ?? previous.address) : null;
  const discount = integer(
    data.discount_cents ?? previous.discount_cents,
    "Desconto",
  );
  const freightValue =
    data.freight_cents === undefined
      ? previous.freight_cents
      : data.freight_cents;
  const freight = freightValue === null ? null : integer(freightValue, "Frete");
  const subtotal = items.reduce(
    (sum, i) => sum + i.price_cents * i.quantity,
    0,
  );
  if (discount > subtotal)
    throw new HttpError(400, "Desconto maior que o total dos doces.");
  return {
    ...previous,
    mode,
    address,
    items,
    discount_cents: discount,
    freight_cents: freight,
    total_cents: subtotal - discount + (freight ?? 0),
  };
}
export async function reviseOrder(
  request: Request,
  env: Env,
  actor: string,
  reference: string,
  action: string,
) {
  if (request.method !== (action === "edit" ? "PATCH" : "POST"))
    throw new HttpError(405, "Ação não permitida.");
  const data = await body(request);
  const key = operationKey(request);
  const version = integer(data.version, "Versão", 1);
  const fingerprint = await digest(JSON.stringify([reference, action, data]));
  const prior = await env.DB.prepare(
    "SELECT fingerprint FROM order_revisions WHERE operation_key=?",
  )
    .bind(key)
    .first<{ fingerprint: string }>();
  if (prior) {
    if (prior.fingerprint !== fingerprint)
      throw new HttpError(409, "Identificador já usado em outra operação.");
    return json(await readOrder(env, reference));
  }
  const old = await readOrder(env, reference);
  if (old.version !== version)
    throw new HttpError(
      409,
      "Pedido alterado em outra aba. Recarregue antes de salvar.",
    );
  let state = old.state;
  let snapshot = old.snapshot;
  const changes = new Map<string, number>();
  const change = (items: OrderItem[], sign: number) => {
    for (const i of items)
      changes.set(i.id, (changes.get(i.id) ?? 0) + sign * i.quantity);
  };
  if (action === "edit" && ["pending", "confirmed"].includes(state)) {
    snapshot = await editedSnapshot(env, old.snapshot, data);
    if (state === "confirmed") {
      change(old.snapshot.items, 1);
      change(snapshot.items, -1);
    }
  } else if (action === "confirm" && state === "pending") {
    state = "confirmed";
    change(snapshot.items, -1);
  } else if (action === "complete" && state === "confirmed")
    state = "completed";
  else if (
    action === "cancel" &&
    ["pending", "confirmed", "completed"].includes(state)
  ) {
    if (state === "confirmed") change(snapshot.items, 1);
    state = "cancelled";
  } else if (action === "reopen" && state === "cancelled") state = "pending";
  else
    throw new HttpError(
      409,
      "Ação indisponível para o estado atual do pedido.",
    );
  try {
    await env.DB.prepare(
      "INSERT INTO order_revisions(id,reference,operation_key,fingerprint,expected_version,action,actor,old_state,new_state,snapshot,stock_changes) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        crypto.randomUUID(),
        reference,
        key,
        fingerprint,
        version,
        action,
        actor,
        old.state,
        state,
        JSON.stringify(snapshot),
        JSON.stringify(
          [...changes]
            .filter(([, delta]) => delta !== 0)
            .map(([id, delta]) => ({ id, delta })),
        ),
      )
      .run();
  } catch (error) {
    const repeated = await env.DB.prepare(
      "SELECT fingerprint FROM order_revisions WHERE operation_key=?",
    )
      .bind(key)
      .first<{ fingerprint: string }>();
    if (repeated?.fingerprint === fingerprint)
      return json(await readOrder(env, reference));
    if (
      /stale_order|CHECK constraint failed|UNIQUE constraint failed|stale_stock/.test(
        String(error),
      )
    )
      throw new HttpError(
        409,
        "Pedido ou saldo alterado; saldo insuficiente ou limite atingido. Recarregue os dados.",
      );
    throw error;
  }
  return json(await readOrder(env, reference));
}
export async function clients(request: Request, env: Env, id?: string) {
  if (request.method !== "GET") throw new HttpError(405, "Ação não permitida.");
  if (id) {
    const client = await env.DB.prepare("SELECT * FROM clients WHERE id=?")
      .bind(id)
      .first<{ address: string | null }>();
    if (!client) throw new HttpError(404, "Cliente não encontrado.");
    const orders = await env.DB.prepare(
      "SELECT reference,state,created_at,json_extract(snapshot,'$.total_cents') AS total_cents FROM orders WHERE client_id=? ORDER BY created_at DESC",
    )
      .bind(id)
      .all();
    return json({
      ...client,
      address: client.address ? JSON.parse(client.address) : null,
      orders: orders.results,
    });
  }
  const phone = phoneNumber(new URL(request.url).searchParams.get("phone"));
  return json(
    (
      await env.DB.prepare("SELECT id,name,phone FROM clients WHERE phone=?")
        .bind(phone)
        .all()
    ).results,
  );
}
