import type { Env } from "./env";
import { body, flag, HttpError, integer, json, text } from "./http";

// All public queries use p (product) and c (category) for the same visibility rule.
export const visibleProductSql =
  "p.published=1 AND p.archived=0 AND p.stock>0 AND c.active=1";

export interface Product {
  id: string;
  category_id: string;
  name: string;
  presentation: string;
  description: string;
  price_cents: number;
  stock: number;
  published: number;
  archived: number;
  sort_order: number;
  media_id: string | null;
  version: number;
}
export async function product(env: Env, id: string) {
  const result = await env.DB.prepare("SELECT * FROM products WHERE id=?")
    .bind(id)
    .first<Product>();
  if (!result) throw new HttpError(404, "Produto não encontrado.");
  return result;
}
export async function catalog(env: Env) {
  const products = await env.DB.prepare(
    `SELECT p.id,p.name,p.presentation,p.description,p.price_cents,p.category_id,p.media_id
    FROM products p JOIN categories c ON c.id=p.category_id
    WHERE ${visibleProductSql}
    ORDER BY c.sort_order,c.name,c.id,p.sort_order,p.name,p.id`,
  ).all();
  const categories = await env.DB.prepare(
    `SELECT id,name FROM categories c WHERE EXISTS
    (SELECT 1 FROM products p WHERE p.category_id=c.id AND ${visibleProductSql})
    ORDER BY sort_order,name,id`,
  ).all();
  return json({ categories: categories.results, products: products.results });
}
export async function categories(
  request: Request,
  env: Env,
  actor: string,
  id?: string,
) {
  if (request.method === "GET" && !id)
    return json(
      (
        await env.DB.prepare(
          "SELECT * FROM categories ORDER BY sort_order,name,id",
        ).all()
      ).results,
    );
  const data = await body(request);
  const name = text(data.name, "Nome");
  const order = integer(data.sort_order ?? 0, "Ordem");
  if (request.method === "POST" && !id) {
    id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO categories(id,name,sort_order,active,updated_by) VALUES(?,?,?,?,?)",
    )
      .bind(id, name, order, flag(data.active, 1), actor)
      .run();
  } else if (request.method === "PATCH" && id) {
    const result = await env.DB.prepare(
      `UPDATE categories SET name=?,sort_order=?,active=?,version=version+1,updated_by=?,
      updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND version=?`,
    )
      .bind(
        name,
        order,
        flag(data.active, 1),
        actor,
        id,
        integer(data.version, "Versão", 1),
      )
      .run();
    if (!result.meta.changes)
      throw new HttpError(
        409,
        "Categoria alterada em outra aba. Recarregue antes de salvar.",
      );
  } else throw new HttpError(405, "Ação não permitida.");
  return json(
    await env.DB.prepare("SELECT * FROM categories WHERE id=?")
      .bind(id)
      .first(),
    request.method === "POST" ? 201 : 200,
  );
}
export async function products(
  request: Request,
  env: Env,
  actor: string,
  id?: string,
  duplicate = false,
) {
  if (request.method === "GET") {
    if (id) return json(await product(env, id));
    const params = new URL(request.url).searchParams;
    const state = params.get("state") ?? "";
    if (!["", "published", "hidden", "archived", "zero"].includes(state))
      throw new HttpError(400, "Filtro inválido.");
    const query = params.get("q") ?? "";
    const category = params.get("category") ?? "";
    return json(
      (
        await env.DB.prepare(
          `SELECT * FROM products WHERE (?='' OR instr(lower(name || ' ' || presentation),lower(?))>0)
      AND (?='' OR category_id=?) AND (?='' OR
      (?='published' AND published=1 AND archived=0) OR (?='hidden' AND published=0 AND archived=0)
      OR (?='archived' AND archived=1) OR (?='zero' AND stock=0)) ORDER BY sort_order,name,id`,
        )
          .bind(
            query,
            query,
            category,
            category,
            state,
            state,
            state,
            state,
            state,
          )
          .all()
      ).results,
    );
  }
  const data = await body(request);
  const old = id ? await product(env, id) : undefined;
  if (duplicate && (!old || request.method !== "POST"))
    throw new HttpError(405, "Ação não permitida.");
  const input = duplicate ? { ...old, ...data } : data;
  const name = text(input.name, "Nome");
  const presentation = text(input.presentation, "Apresentação");
  const description = text(input.description, "Descrição", 2000, true);
  const category = text(input.category_id, "Categoria");
  if (
    !(await env.DB.prepare("SELECT id FROM categories WHERE id=?")
      .bind(category)
      .first())
  )
    throw new HttpError(400, "Selecione uma categoria existente.");
  const price = integer(input.price_cents, "Preço em centavos");
  const order = integer(input.sort_order ?? 0, "Ordem");
  const published = flag(data.published, duplicate ? 0 : (old?.published ?? 0));
  const archived = flag(data.archived, duplicate ? 0 : (old?.archived ?? 0));
  if (request.method === "POST") {
    const stock = integer(data.initial_stock, "Estoque inicial");
    const newId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO products(id,category_id,name,presentation,description,price_cents,sort_order,published,archived,updated_by)
        VALUES(?,?,?,?,?,?,?,?,?,?)`,
      ).bind(
        newId,
        category,
        name,
        presentation,
        description,
        price,
        order,
        published,
        archived,
        actor,
      ),
      env.DB.prepare(
        `INSERT INTO stock_movements(id,product_id,operation_key,fingerprint,kind,quantity,before_stock,after_stock,origin,actor)
        VALUES(?,?,?,?, 'initial',?,0,?,'product_creation',?)`,
      ).bind(
        crypto.randomUUID(),
        newId,
        `initial:${newId}`,
        newId,
        stock,
        stock,
        actor,
      ),
    ]);
    return json(await product(env, newId), 201);
  }
  if (request.method !== "PATCH" || !id)
    throw new HttpError(405, "Ação não permitida.");
  if ("stock" in data || "initial_stock" in data || "media_id" in data)
    throw new HttpError(
      400,
      "Use as ações de estoque e foto para alterar esses dados.",
    );
  const result = await env.DB.prepare(
    `UPDATE products SET category_id=?,name=?,presentation=?,description=?,price_cents=?,sort_order=?,
    published=?,archived=?,version=version+1,updated_by=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND version=?`,
  )
    .bind(
      category,
      name,
      presentation,
      description,
      price,
      order,
      published,
      archived,
      actor,
      id,
      integer(data.version, "Versão", 1),
    )
    .run();
  if (!result.meta.changes)
    throw new HttpError(
      409,
      "Produto alterado em outra aba. Recarregue antes de salvar.",
    );
  return json(await product(env, id));
}
