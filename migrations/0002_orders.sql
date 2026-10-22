CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK(id=1), name TEXT NOT NULL, whatsapp TEXT NOT NULL DEFAULT '',
  greeting TEXT NOT NULL DEFAULT '', notice TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL DEFAULT ''
);
INSERT INTO settings(id,name) VALUES(1,'Saver Doceria');
CREATE TABLE clients (
  id TEXT PRIMARY KEY, phone TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  address TEXT, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE orders (
  reference TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES clients(id),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','confirmed','completed','cancelled')),
  snapshot TEXT NOT NULL CHECK(json_valid(snapshot)), original TEXT NOT NULL CHECK(json_valid(original)),
  version INTEGER NOT NULL DEFAULT 1, operation_key TEXT NOT NULL UNIQUE, fingerprint TEXT NOT NULL,
  receipt TEXT NOT NULL CHECK(json_valid(receipt)), request_bucket TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX orders_client ON orders(client_id,created_at);
CREATE INDEX orders_rate ON orders(request_bucket,created_at);
ALTER TABLE stock_movements ADD COLUMN order_reference TEXT REFERENCES orders(reference);
CREATE TABLE order_revisions (
  id TEXT PRIMARY KEY, reference TEXT NOT NULL REFERENCES orders(reference),
  operation_key TEXT NOT NULL UNIQUE, fingerprint TEXT NOT NULL,
  expected_version INTEGER NOT NULL, action TEXT NOT NULL, actor TEXT NOT NULL,
  old_state TEXT NOT NULL, new_state TEXT NOT NULL, snapshot TEXT NOT NULL CHECK(json_valid(snapshot)),
  stock_changes TEXT NOT NULL CHECK(json_valid(stock_changes)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(reference,expected_version)
);
