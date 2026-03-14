import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Row = Record<string, string>;
type UpsertResult =
  | { action: "create"; id: number }
  | { action: "update"; id: number }
  | { action: "skip"; reason: string }
  | { action: "error"; reason: string };

/* ----------------------------- helpers ----------------------------- */

function asReason(e: any): string {
  const msg =
    e?.response?.data?.message ??
    e?.response?.data?.error ??
    e?.response?.data ??
    e?.message ??
    e;
  return typeof msg === "string" ? msg : JSON.stringify(msg);
}

function detectDelimiter(sample: string): string {
  const first = sample.split(/\r?\n/)[0] || "";
  const counts = [
    { d: ",", n: (first.match(/,/g) || []).length },
    { d: ";", n: (first.match(/;/g) || []).length },
    { d: "\t", n: (first.match(/\t/g) || []).length },
  ].sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : ",";
}

function parseCsv(text: string, delimiter?: string): Row[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (!lines.length) return [];
  const delim = delimiter || detectDelimiter(text);

  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          q = !q;
        }
      } else if (ch === delim && !q) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const headers = split(lines[0]).map((h) => h.trim());
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = split(lines[i]);
    if (cols.every((c) => c.trim() === "")) continue;
    const row: Row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (cols[j] ?? "").trim();
    }
    rows.push(row);
  }
  return rows;
}

function truthyFlag(v?: string) {
  if (!v) return false;
  const s = v.toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function buildPayloadFromRow(row: Record<string, string>) {
  // Helper to get value by multiple alias headers (case-sensitive list)
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (row[k] != null && String(row[k]).trim() !== "") return String(row[k]).trim();
    }
    return "";
  };
  const bool = (v?: string) => {
    if (!v) return false;
    const s = v.toLowerCase();
    return s === "1" || s === "true" || s === "yes";
  };

  const type = get("type") || "simple";
  const payload: any = { type };

  // core
  const name = get("name");
  if (name) payload.name = name;

  // prices / sale dates
  const regularPrice = get("regular price");
  if (regularPrice) payload.regular_price = String(regularPrice);
  const salePrice = get("sale price");
  if (salePrice) payload.sale_price = String(salePrice);
  const saleFrom = get("sale from");
  if (saleFrom) payload.date_on_sale_from = saleFrom; // accepts ISO or 'YYYY-MM-DD'
  const saleTo = get("sale to");
  if (saleTo) payload.date_on_sale_to = saleTo;

  // stock
  const manageStock = get("manage stock");
  if (manageStock) payload.manage_stock = bool(manageStock);
  const qty = get("quantity");
  if (qty) payload.stock_quantity = Number(qty) || 0;
  const backorder = get("backorder");
  if (backorder) payload.backorders = backorder as any; // 'no' | 'notify' | 'yes'

  // status & visibility
  const status = get("status");
  if (status) payload.status = status as any; // publish/draft/pending/private
  const visibility = get("visibility");
  if (visibility) payload.catalog_visibility = visibility as any; // visible/catalog/search/hidden

  // descriptions
  const shortDesc = get("short description");
  if (shortDesc) payload.short_description = shortDesc;
  const longDesc = get("Description");
  if (longDesc) payload.description = longDesc;

  // categories: pipe-separated names
  const cat = get("category");
  if (cat) {
    const cats = cat
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    if (cats.length) payload.categories = cats;
  }

   // images: accept multiple URLs, comma-separated (also supports pipe)
  const imgField = get("image url");
  if (imgField) {
    const urls = imgField
      .split(/[,\|]/)          // comma is primary; pipe also works
      .map((x) => x.trim())
      .filter(Boolean);
    if (urls.length) {
      payload.images = urls.map((u) => ({ src: u }));
    }
  }

  // dimensions & weight
  const weight = get("weight");
  if (weight) payload.weight = weight;
  const length = get("length");
  const width = get("width");
  const height = get("height");
  if (length || width || height) {
    payload.dimensions = {
      length: length || "",
      width: width || "",
      height: height || "",
    };
  }

  // grouped products list (IDs/SKUs)
  const grouped = get("Grouped products");
  if (grouped) {
    payload.grouped_products = grouped
      .split(/[|,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // attributes (1..5)
  for (let i = 1; i <= 5; i++) {
    const n = get(`Attribute ${i} name`);
    const vs = get(`Attribute ${i} value(s)`);
    if (!n || !vs) continue;
    const visible = bool(get(`Attribute ${i} visible`));
    // "global" is ignored in payload; we create local attrs (similar to Woo CSV)
    payload.attributes = payload.attributes || [];
    payload.attributes.push({
      name: n,
      options: vs.split("|").map((x) => x.trim()).filter(Boolean),
      visible,
      variation: false,
    });
  }

   // Persist CSV 'id' for round-trip reconciliation
  const externalId = get("id");
  if (externalId) {
    payload.meta_data = payload.meta_data || [];
    payload.meta_data.push({ key: "_external_id", value: externalId });
  }

  return payload;
}

/* ----------------------------- upsert ----------------------------- */
/**
 * Rule (as requested):
 * - If `id` exists and matches → UPDATE that ID.
 * - If `id` exists but does NOT match any product → CREATE new.
 * - If no `id`:
 *    - If updateExisting is ON and SKU exists → UPDATE by SKU.
 *    - Else CREATE new. If duplicate SKU and updateExisting is OFF → auto-suffix and CREATE.
 */
async function upsertProduct(row: Row, updateExisting: boolean): Promise<UpsertResult> {
  const idRaw = row["id"]?.trim();
  const sku = row["sku"]?.trim();
  const name = row["name"]?.trim();

  if (!idRaw && !sku && !name) {
    return { action: "skip", reason: "Missing id/sku/name" };
  }
  const woo = await getWooClient();
  const payload = buildPayloadFromRow(row);

  // If ID provided, try update; if not found → create
  if (idRaw) {
    if (/^\d+$/.test(idRaw)) {
      const id = Number(idRaw);
      try {
        const { data } = await woo.put(`/products/${id}`, payload);
        return { action: "update", id: data.id };
      } catch (e: any) {
        const reason = asReason(e);
        // If not found/invalid → create
        if (/not found|invalid id|no route|cannot update/i.test(reason)) {
          try {
            if (sku) (payload as any).sku = sku;
            if (!payload.name && name) payload.name = name;
            const { data: created } = await woo.post(`/products`, payload);
            return { action: "create", id: created.id };
          } catch (e2: any) {
            const r2 = asReason(e2);
            // duplicate SKU on create → if updateExisting ON, update by SKU; else auto-suffix and create
            if (/sku/i.test(r2) && /exist/i.test(r2) && sku) {
              if (updateExisting) {
                const { data: existing } = await woo.get(`/products`, { params: { sku, status: "any" } });
                if (Array.isArray(existing) && existing.length) {
                  const target = existing[0];
                  const { data: upd } = await woo.put(`/products/${target.id}`, payload);
                  return { action: "update", id: upd.id };
                }
              } else {
                const base = String(sku);
                const suffix = Date.now().toString().slice(-4);
                (payload as any).sku = `${base}-${suffix}`;
                const { data: created2 } = await woo.post(`/products`, payload);
                return { action: "create", id: created2.id };
              }
            }
            return { action: "error", reason: r2 };
          }
        }
        return { action: "error", reason };
      }
    }
    // bad id format → fall through to SKU/update-or-create
  }

  // No valid ID path: optionally update by SKU, else create
  try {
    if (sku && updateExisting) {
      const { data: existing } = await woo.get(`/products`, { params: { sku, status: "any" } });
      if (Array.isArray(existing) && existing.length) {
        const target = existing[0];
        const { data } = await woo.put(`/products/${target.id}`, payload);
        return { action: "update", id: data.id };
      }
    }

    if (sku) (payload as any).sku = sku;
    if (!payload.name && name) payload.name = name;

    const { data } = await woo.post(`/products`, payload);
    return { action: "create", id: data.id };
  } catch (e: any) {
    const reason = asReason(e);
    if (/sku/i.test(reason) && /exist/i.test(reason) && sku) {
      if (updateExisting) {
        try {
          const { data: existing } = await woo.get(`/products`, { params: { sku, status: "any" } });
          if (Array.isArray(existing) && existing.length) {
            const target = existing[0];
            const { data: upd } = await woo.put(`/products/${target.id}`, payload);
            return { action: "update", id: upd.id };
          }
        } catch (e2: any) {
          return { action: "error", reason: asReason(e2) };
        }
      } else {
        // auto-suffix to force-create
        const base = String(sku);
        (payload as any).sku = `${base}-${Date.now().toString().slice(-4)}`;
        const { data: created } = await woo.post(`/products`, payload);
        return { action: "create", id: created.id };
      }
    }
    return { action: "error", reason };
  }
}

/* ----------------------------- route ----------------------------- */

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const updateExisting = (form.get("updateExisting") as string) === "true";
    const delimiter = (form.get("delimiter") as string) || undefined;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const text = buf.toString("utf-8");
    const rows = parseCsv(text, delimiter);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const res = await upsertProduct(r, updateExisting);
      if (res.action === "create") created++;
      else if (res.action === "update") updated++;
      else if (res.action === "skip") {
        skipped++;
        errors.push({ row: i + 2, reason: String(res.reason || "Skipped") });
      } else if (res.action === "error") {
        skipped++;
        errors.push({ row: i + 2, reason: String(res.reason || "Error") });
      } else {
        skipped++;
        errors.push({ row: i + 2, reason: "Unknown outcome" });
      }
    }

    return NextResponse.json({
      ok: true,
      rows: rows.length,
      summary: { created, updated, skipped },
      errors,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: asReason(err) }, { status: 500 });
  }
}
