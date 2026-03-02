// src/lib/skuLookup.ts

// Use require + any to avoid TS needing type defs for better-sqlite3
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BetterSqlite3 = require("better-sqlite3") as any;

let _db: any = null;

function db() {
  if (_db) return _db;

  _db = new BetterSqlite3(process.env.SKU_DB_PATH || "data.sqlite");
  _db.pragma("journal_mode = WAL");

  // Create table (case-insensitive unique key) + scrub duplicates
  _db.exec(`
    CREATE TABLE IF NOT EXISTS product_lookup (
      sku TEXT PRIMARY KEY,
      product_id INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    -- make sure we have a unique index with case-insensitive collation
    CREATE UNIQUE INDEX IF NOT EXISTS ux_product_lookup_sku
      ON product_lookup(sku COLLATE NOCASE);
  `);

  // If any legacy duplicates exist (from older code), keep the newest
  _db.exec(`
    DELETE FROM product_lookup
    WHERE rowid NOT IN (
      SELECT MAX(rowid) FROM product_lookup GROUP BY lower(sku)
    );
  `);

  return _db;
}

/** Canonicalize SKUs so lookups are stable (trim + lower). */
function canon(sku: string) {
  return sku.trim().toLowerCase();
}

/** Upsert by SKU (never throws on duplicate). */
export function skuUpsert(rawSku: string, productId: number) {
  const sku = canon(rawSku);
  const now = Date.now();
  db()
    .prepare(
      `
      INSERT INTO product_lookup (sku, product_id, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(sku)
      DO UPDATE SET product_id=excluded.product_id, updated_at=excluded.updated_at
    `,
    )
    .run(sku, productId, now);
}

/** Read local mapping (if any). */
export function skuGetId(rawSku: string): number | null {
  const sku = canon(rawSku);
  const row = db()
    .prepare(`SELECT product_id FROM product_lookup WHERE sku = ?`)
    .get(sku) as { product_id: number } | undefined;
  return row ? Number(row.product_id) : null;
}
