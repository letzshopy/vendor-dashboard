// src/lib/db.ts
import path from "path";
import fs from "fs";

// Use require + any to avoid TS needing type defs for better-sqlite3
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BetterSqlite3 = require("better-sqlite3") as any;

let db: any = null;

function dbFile() {
  const root = process.cwd();
  const dir = path.join(root, ".data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "vendor.db");
}

export async function ensureDb() {
  if (db) return db;
  db = new BetterSqlite3(dbFile());
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_lookup (
      woo_id     INTEGER NOT NULL,
      sku        TEXT    NOT NULL UNIQUE,
      name       TEXT,
      status     TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_product_lookup_sku ON product_lookup(sku);
  `);
  return db;
}

export async function deleteExistingSkuFromLookup(sku: string) {
  await ensureDb();
  const stmt = db.prepare(`DELETE FROM product_lookup WHERE sku = ?`);
  stmt.run(sku);
}

export async function upsertProductLookup(row: {
  woo_id: number;
  sku: string;
  name?: string;
  status?: string;
}) {
  await ensureDb();
  const stmt = db.prepare(`
    INSERT INTO product_lookup (woo_id, sku, name, status, updated_at)
    VALUES (@woo_id, @sku, @name, @status, CURRENT_TIMESTAMP)
    ON CONFLICT(sku) DO UPDATE SET
      woo_id     = excluded.woo_id,
      name       = excluded.name,
      status     = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(row);
}
