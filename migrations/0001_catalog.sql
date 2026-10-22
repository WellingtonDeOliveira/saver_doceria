PRAGMA foreign_keys = ON;
CREATE TABLE categories (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE media (
  id TEXT PRIMARY KEY, mime TEXT NOT NULL, bytes INTEGER NOT NULL,
  token TEXT NOT NULL, previous_id TEXT REFERENCES media(id), product_id TEXT,
  state TEXT NOT NULL DEFAULT 'staged' CHECK(state IN ('staged','active','deleting')),
  created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE products (
  id TEXT PRIMARY KEY, category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL, presentation TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL CHECK(price_cents BETWEEN 0 AND 1000000),
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock BETWEEN 0 AND 1000000),
  published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
  archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0, media_id TEXT REFERENCES media(id),
  version INTEGER NOT NULL DEFAULT 1, updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX products_catalog ON products(category_id, published, archived, sort_order);
CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id),
  operation_key TEXT NOT NULL UNIQUE, fingerprint TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('initial','entry','exit','correction','physical_return')),
  quantity INTEGER NOT NULL, before_stock INTEGER NOT NULL, after_stock INTEGER NOT NULL CHECK(after_stock BETWEEN 0 AND 1000000),
  origin TEXT NOT NULL, actor TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK(after_stock = before_stock + quantity)
);
CREATE INDEX stock_history ON stock_movements(product_id, created_at);
CREATE TRIGGER movement_apply AFTER INSERT ON stock_movements BEGIN
  SELECT CASE WHEN (SELECT stock FROM products WHERE id=NEW.product_id) != NEW.before_stock
    THEN RAISE(ABORT, 'stale_stock') END;
  UPDATE products SET stock=NEW.after_stock, version=version+1, updated_by=NEW.actor,
    updated_at=NEW.created_at WHERE id=NEW.product_id;
END;
