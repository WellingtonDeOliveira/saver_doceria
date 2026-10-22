import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { backupTables } from "../src/backup";

export async function restoreBackup(
  directory: string,
  db: D1Database,
  photos: KVNamespace,
) {
  const isFile = (await stat(directory)).isFile();
  const snapshot = JSON.parse(
    await readFile(
      isFile ? directory : resolve(directory, "manifest.json"),
      "utf8",
    ),
  );
  if (
    snapshot.format !== 1 ||
    !snapshot.tables ||
    !Array.isArray(snapshot.photos)
  )
    throw new Error("Manifesto inválido.");
  const images = new Map<string, Buffer>();
  for (const media of snapshot.tables.media) {
    if (!/^[0-9a-f-]{36}$/.test(media.id))
      throw new Error("Identificador de foto inválido.");
    if (media.state === "deleting") continue;
    const expected = snapshot.photos.find(
      (p: { id: string }) => p.id === media.id,
    );
    const bytes = expected?.data
      ? Buffer.from(expected.data, "base64")
      : isFile
        ? Buffer.alloc(0)
        : await readFile(resolve(directory, "photos", `${media.id}.bin`));
    if (
      !expected ||
      bytes.length !== media.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== expected.sha256
    )
      throw new Error("Foto incompleta ou corrompida.");
    images.set(media.id, bytes);
  }
  for (const name of backupTables) {
    const count = await db
      .prepare(`SELECT count(*) AS n FROM ${name}`)
      .first<{ n: number }>();
    if ((count?.n ?? 0) > (name === "settings" ? 1 : 0))
      throw new Error(
        "Restauração permitida somente em banco vazio e isolado.",
      );
    if (!Array.isArray(snapshot.tables[name]))
      throw new Error(`Tabela ausente: ${name}`);
  }
  if ((await photos.list({ limit: 1 })).keys.length)
    throw new Error("Restauração permitida somente em KV vazio e isolado.");
  const triggers = (
    await db
      .prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger'")
      .all<{ name: string; sql: string }>()
  ).results;
  const statements = [
    db.prepare("PRAGMA defer_foreign_keys=ON"),
    ...triggers.map((t) => db.prepare(`DROP TRIGGER ${t.name}`)),
    db.prepare("DELETE FROM settings"),
  ];
  // Insert balances and historical movements verbatim while their effects are suspended.
  for (const name of backupTables) {
    const columns = (
      await db.prepare(`PRAGMA table_info(${name})`).all<{ name: string }>()
    ).results.map((c) => c.name);
    for (const row of snapshot.tables[name]) {
      if (
        Object.keys(row).length !== columns.length ||
        !columns.every((c) => Object.hasOwn(row, c))
      )
        throw new Error(`Colunas incompatíveis: ${name}`);
      statements.push(
        db
          .prepare(
            `INSERT INTO ${name}(${columns.join(",")}) VALUES(${columns.map(() => "?").join(",")})`,
          )
          .bind(...columns.map((c) => row[c])),
      );
    }
  }
  statements.push(
    db.prepare("CREATE TABLE restore_guard(ok INTEGER CHECK(ok=1))"),
  );
  statements.push(
    db.prepare(`INSERT INTO restore_guard SELECT CASE WHEN
    NOT EXISTS(SELECT 1 FROM pragma_foreign_key_check)
    AND (SELECT count(*) FROM settings)=1
    AND NOT EXISTS(SELECT 1 FROM products p WHERE p.stock!=COALESCE((SELECT sum(quantity) FROM stock_movements WHERE product_id=p.id),0))
    AND NOT EXISTS(SELECT 1 FROM orders o WHERE o.version!=1+(SELECT count(*) FROM order_revisions WHERE reference=o.reference))
    THEN 1 ELSE 0 END`),
  );
  statements.push(
    db.prepare("DROP TABLE restore_guard"),
    ...triggers.map((t) => db.prepare(t.sql)),
  );
  // Photos are immutable and validated before publishing database references.
  for (const [id, bytes] of images) await photos.put(id, bytes);
  await db.batch(statements);
  return {
    photos: images.size,
    orders: snapshot.tables.orders.length,
    clients: snapshot.tables.clients.length,
  };
}
