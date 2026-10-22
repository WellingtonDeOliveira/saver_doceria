import type { Env } from "./env";
import { body, HttpError, integer, json, text } from "./http";
import { product } from "./catalog";

export async function stock(
  request: Request,
  env: Env,
  actor: string,
  id: string,
) {
  await product(env, id);
  if (request.method === "GET")
    return json(
      (
        await env.DB.prepare(
          "SELECT * FROM stock_movements WHERE product_id=? ORDER BY created_at DESC,rowid DESC",
        )
          .bind(id)
          .all()
      ).results,
    );
  if (request.method !== "POST")
    throw new HttpError(405, "Ação não permitida.");
  const data = await body(request);
  const kind = text(data.kind, "Tipo");
  if (!["entry", "exit", "correction", "physical_return"].includes(kind))
    throw new HttpError(400, "Tipo de movimentação inválido.");
  const quantity = integer(
    data.quantity,
    "Quantidade",
    kind === "correction" ? 0 : 1,
  );
  const reason = text(
    data.reason,
    "Justificativa",
    500,
    !["correction", "physical_return"].includes(kind),
  );
  const key = text(
    request.headers.get("Idempotency-Key"),
    "Identificador da operação",
    100,
  );
  const version = integer(data.version, "Versão", 1);
  const reference =
    kind === "physical_return"
      ? text(data.order_reference, "Referência do pedido")
      : null;
  if (
    reference &&
    !(await env.DB.prepare(
      "SELECT reference FROM orders WHERE reference=? AND EXISTS(SELECT 1 FROM json_each(snapshot,'$.items') WHERE json_extract(value,'$.id')=?)",
    )
      .bind(reference, id)
      .first())
  )
    throw new HttpError(400, "Informe um pedido existente com esse produto.");
  const fingerprint = JSON.stringify([
    id,
    kind,
    quantity,
    reason,
    version,
    reference,
  ]);
  const prior = await env.DB.prepare(
    "SELECT * FROM stock_movements WHERE operation_key=?",
  )
    .bind(key)
    .first<{ fingerprint: string }>();
  if (prior) {
    if (prior.fingerprint !== fingerprint)
      throw new HttpError(409, "Identificador já usado em outra movimentação.");
    return json(prior);
  }
  const delta = kind === "exit" ? -quantity : quantity;
  try {
    await env.DB.prepare(
      `INSERT INTO stock_movements(id,product_id,operation_key,fingerprint,kind,quantity,before_stock,after_stock,origin,actor,reason,order_reference)
      SELECT ?,id,?,?,?,?,stock,CASE WHEN ?='correction' THEN ? ELSE stock+? END,'manual',?,?,?
      FROM products WHERE id=? AND version=? ON CONFLICT(operation_key) DO NOTHING`,
    )
      .bind(
        crypto.randomUUID(),
        key,
        fingerprint,
        kind,
        kind === "correction"
          ? quantity - (await product(env, id)).stock
          : delta,
        kind,
        quantity,
        delta,
        actor,
        reason,
        reference,
        id,
        version,
      )
      .run();
  } catch (error) {
    if (
      String(error).includes("CHECK constraint failed") ||
      String(error).includes("stale_stock")
    )
      throw new HttpError(
        409,
        "Saldo insuficiente ou alterado. Recarregue os saldos.",
      );
    throw error;
  }
  const movement = await env.DB.prepare(
    "SELECT * FROM stock_movements WHERE operation_key=?",
  )
    .bind(key)
    .first<{ fingerprint: string }>();
  if (!movement)
    throw new HttpError(
      409,
      "Estoque alterado em outra aba. Recarregue os saldos.",
    );
  if (movement.fingerprint !== fingerprint)
    throw new HttpError(409, "Identificador já usado em outra movimentação.");
  return json(movement, 201);
}
