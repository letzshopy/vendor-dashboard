// src/lib/db.ts
import path from "path";
import fs from "fs";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BetterSqlite3 = require("better-sqlite3") as any;

let db: any = null;

function isServerlessReadOnlyEnv() {
  return !!process.env.VERCEL;
}

function dbTarget() {
  // On Vercel/serverless, do NOT write to filesystem.
  // Use in-memory SQLite so runtime won't try to mkdir /var/task/.data.
  if (isServerlessReadOnlyEnv()) {
    return ":memory:";
  }

  // Local dev / self-hosted fallback
  const root = process.cwd();
  const dir = path.join(root, ".data");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return path.join(dir, "vendor.db");
}

function initSchema(database: any) {
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS product_lookup (
      woo_id     INTEGER NOT NULL,
      sku        TEXT    NOT NULL UNIQUE,
      name       TEXT,
      status     TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_product_lookup_sku ON product_lookup(sku);
  `);
}

export async function ensureDb() {
  if (db) return db;

  const target = dbTarget();
  db = new BetterSqlite3(target);

  initSchema(db);

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