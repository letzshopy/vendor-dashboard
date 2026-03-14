// src/app/api/import/[entity]/run/route.ts
import { NextRequest } from "next/server";
import { getWooClient } from "@/lib/woo";

import { parseCsvFull, toBool } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Local entity type (no external import)
type ImportEntity = "products" | "orders" | "customers";

// Local mapping type: target field -> CSV column index
type ImportMap = {
  [field: string]: number | undefined;
};

// For Next 15.5 validator: params is a Promise
type RouteParams = {
  params: Promise<{ entity: string }>;
};

/**
 * POST multipart/form-data:
 *  - file (CSV/TXT)
 *  - encoding
 *  - delimiter
 *  - updateExisting (boolean)
 *  - usePrevMapping (boolean)  // reserved
 *  - mapping (JSON: ImportMap { targetField: sourceIdx })
 *
 * Woo-style product import:
 * - Parent types: simple | external | variable | grouped
 * - Variation rows: type = variation (optionally provide `Parent` column mapped to parent SKU or ID)
 * - Attributes:
 *    Attribute n name / value(s) / visible / global (values pipe-separated: "Red | Blue")
 * - Grouped parents: "Grouped products" = comma-separated SKUs
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const woo = await getWooClient();

  const { entity: rawEntity } = await params;
  const entity = String(rawEntity || "").toLowerCase() as ImportEntity;

  // ✅ early entity validation
  if (!["products", "orders", "customers"].includes(entity)) {
    return new Response(JSON.stringify({ error: "Unsupported entity" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const encoding = String(form.get("encoding") || "utf-8");
  const delimiter = String(form.get("delimiter") || ",");
  const updateExisting = toBool(form.get("updateExisting"));

  // ✅ safe mapping parse
  let mapping: ImportMap = {};
  try {
    mapping = JSON.parse(String(form.get("mapping") || "{}")) as ImportMap;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid mapping JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!file) {
    return new Response(JSON.stringify({ error: "No file" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // ✅ safe decoder fallback
  let text = "";
  try {
    text = new TextDecoder(encoding as any).decode(buf);
  } catch {
    text = new TextDecoder("utf-8").decode(buf);
  }

  const parsed = parseCsvFull(text, delimiter);
  if (parsed.headers.length === 0) {
    return new Response(JSON.stringify({ error: "No headers found" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const summary = { created: 0, updated: 0, skipped: 0 };
  const errors: { row: number; error: string }[] = [];

  // ------------- helpers ------------- //
  const readVal = (row: string[], field: string) => {
    const idx = mapping[field];
    return idx === undefined ? "" : String(row[idx] ?? "").trim();
  };

  const anyMapped = (row: string[]) =>
    Object.values(mapping).some(
      (i) => i !== undefined && row[i] && String(row[i]).trim() !== ""
    );

  const toBool1 = (v: string) => {
    const s = (v || "").toLowerCase();
    return s === "1" || s === "yes" || s === "true" || s === "y";
  };

  const splitPipe = (s: string) =>
    (s || "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);

  const splitComma = (s: string) =>
    (s || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const findProductBySku = async (sku: string) => {
    if (!sku) return null;
    const { data } = await woo.get("/products", { params: { sku } });
    return Array.isArray(data) && data[0] ? data[0] : null;
  };

  const findProductById = async (id: number) => {
    if (!id) return null;
    try {
      const { data } = await woo.get(`/products/${id}`);
      return data?.id ? data : null;
    } catch {
      return null;
    }
  };

  /** Find parent product for a variation.
   *  Priority:
   *   1) "Parent" column (SKU preferred; if numeric, treat as ID)
   *   2) Search products by name (type=variable) as fallback
   */
  const resolveParentForVariation = async (row: string[]) => {
    const parentRef = readVal(row, "Parent");
    if (parentRef) {
      if (/^\d+$/.test(parentRef)) {
        const hit = await findProductById(Number(parentRef));
        if (hit) return hit;
      }
      const bySku = await findProductBySku(parentRef);
      if (bySku) return bySku;

      const { data } = await woo.get("/products", {
        params: { per_page: 1, search: parentRef, type: "variable" },
      });
      if (Array.isArray(data) && data[0]) return data[0];
    }

    const vname = readVal(row, "name");
    if (vname) {
      const guess = vname.split(" – ")[0].split(" - ")[0].trim();
      if (guess) {
        const { data } = await woo.get("/products", {
          params: { per_page: 1, search: guess, type: "variable" },
        });
        if (Array.isArray(data) && data[0]) return data[0];
      }
    }
    return null;
  };

  const ensureCategories = async (namesPipe: string) => {
    const names = splitPipe(namesPipe);
    if (!names.length) return undefined;

    const ids: number[] = [];
    for (const nm of names) {
      // search
      const { data: found } = await woo.get("/products/categories", {
        params: { per_page: 50, search: nm },
      });

      // exact match preferred
      let cid: number | undefined = undefined;
      if (Array.isArray(found) && found.length) {
        const exact = found.find(
          (c: any) =>
            String(c?.name || "").trim().toLowerCase() === nm.trim().toLowerCase()
        );
        cid = exact?.id ? Number(exact.id) : found?.[0]?.id ? Number(found[0].id) : undefined;
      }

      if (!cid) {
        const { data: created } = await woo.post("/products/categories", { name: nm });
        cid = created?.id ? Number(created.id) : undefined;
      }

      if (cid) ids.push(cid);
    }

    return ids.length ? ids.map((id) => ({ id })) : undefined;
  };

  const buildParentAttributes = (row: string[]) => {
    const attrs: any[] = [];
    for (let i = 1; i <= 5; i++) {
      const name = readVal(row, `Attribute ${i} name`);
      const values = readVal(row, `Attribute ${i} value(s)`);
      const visible = readVal(row, `Attribute ${i} visible`);
      if (!name && !values) continue;

      attrs.push({
        name,
        taxonomy: false,
        visible: toBool1(visible),
        variation: true,
        options: splitPipe(values),
      });
    }
    return attrs.length ? attrs : undefined;
  };

  const buildVariationAttributes = (row: string[]) => {
    const attrs: any[] = [];
    for (let i = 1; i <= 5; i++) {
      const name = readVal(row, `Attribute ${i} name`);
      const value = readVal(row, `Attribute ${i} value(s)`);
      if (!name && !value) continue;
      attrs.push({ name, option: value });
    }
    return attrs.length ? attrs : undefined;
  };

  // ------------- main loop ------------- //
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];

    try {
      if (!anyMapped(row)) {
        summary.skipped++;
        continue;
      }

      if (entity === "products") {
        // extra safety: skip junk rows with no identity at all
        const hasKey =
          !!readVal(row, "id") || !!readVal(row, "sku") || !!readVal(row, "name");
        if (!hasKey) {
          summary.skipped++;
          continue;
        }

        const idRaw = readVal(row, "id");
        const id = Number(idRaw) || 0;
        const type = (readVal(row, "type") || "simple").toLowerCase();

        // Common fields
        const sku = readVal(row, "sku");
        const name = readVal(row, "name");
        const regular_price = readVal(row, "regular_price");
        const sale_price = readVal(row, "sale_price");
        const stock_status = readVal(row, "stock_status");
        const manage_stock = readVal(row, "manage_stock");
        const stock_quantity = readVal(row, "stock_quantity");
        const categoriesPipe = readVal(row, "categories");
        const short_description = readVal(row, "short_description");
        const description = readVal(row, "description");
        const imagesCsv = readVal(row, "images");
        const groupedSkusCsv = readVal(row, "Grouped products");

        // --------- VARIATION ROWS ---------
        if (type === "variation") {
          const parent = await resolveParentForVariation(row);
          const parentId = parent?.id ? Number(parent.id) : 0;

          if (!parentId) {
            summary.skipped++;
            errors.push({
              row: i + 1,
              error: "Variation row without resolvable parent",
            });
            continue;
          }

          const varPayload: any = {};
          if (sku) varPayload.sku = sku;
          if (regular_price) varPayload.regular_price = regular_price;
          if (sale_price) varPayload.sale_price = sale_price;
          if (stock_status) varPayload.stock_status = stock_status;
          if (manage_stock) varPayload.manage_stock = toBool1(manage_stock);
          if (stock_quantity) varPayload.stock_quantity = Number(stock_quantity);

          const vattrs = buildVariationAttributes(row);
          if (vattrs) varPayload.attributes = vattrs;

          if (imagesCsv) {
            const first = splitPipe(imagesCsv)[0];
            if (first) varPayload.image = { src: first };
          }

          if (id && updateExisting) {
            const { data: updated } = await woo.put(
              `/products/${parentId}/variations/${id}`,
              varPayload
            );
            if (updated?.id) summary.updated++;
            else summary.skipped++;
            continue;
          }

          // updateExisting by variation SKU (scan with cap)
          if (updateExisting && sku) {
            let existingId = 0;
            let pageV = 1;
            const perV = 100;
            const MAX_PAGES = 10;

            while (!existingId && pageV <= MAX_PAGES) {
              const { data: vars } = await woo.get(
                `/products/${parentId}/variations`,
                { params: { per_page: perV, page: pageV } }
              );
              if (!Array.isArray(vars) || vars.length === 0) break;

              for (const v of vars) {
                if ((v?.sku || "") === sku) {
                  existingId = Number(v.id);
                  break;
                }
              }
              if (vars.length < perV) break;
              pageV++;
            }

            if (existingId) {
              const { data: updated } = await woo.put(
                `/products/${parentId}/variations/${existingId}`,
                varPayload
              );
              if (updated?.id) summary.updated++;
              else summary.skipped++;
            } else {
              const { data: created } = await woo.post(
                `/products/${parentId}/variations`,
                varPayload
              );
              if (created?.id) summary.created++;
              else summary.skipped++;
            }
            continue;
          }

          // create variation
          const { data: created } = await woo.post(
            `/products/${parentId}/variations`,
            varPayload
          );
          if (created?.id) summary.created++;
          else summary.skipped++;

          continue;
        }

        // --------- PARENT / NON-VARIATION PRODUCTS ---------
        const payload: any = { type };
        if (name) payload.name = name;
        if (regular_price) payload.regular_price = regular_price;
        if (sale_price) payload.sale_price = sale_price;
        if (stock_status) payload.stock_status = stock_status;
        if (manage_stock) payload.manage_stock = toBool1(manage_stock);
        if (stock_quantity) payload.stock_quantity = Number(stock_quantity);
        if (short_description) payload.short_description = short_description;
        if (description) payload.description = description;
        if (sku) payload.sku = sku;

        const cats = await ensureCategories(categoriesPipe);
        if (cats) payload.categories = cats;

        if (imagesCsv) {
          const imgs = splitPipe(imagesCsv);
          if (imgs.length) payload.images = imgs.map((src) => ({ src }));
        }

        const pattrs = buildParentAttributes(row);
        if (pattrs) payload.attributes = pattrs;

        // upsert parent
        let parentIdAfter: number | null = null;

        if (id && updateExisting) {
          const { data: updated } = await woo.put(`/products/${id}`, payload);
          if (updated?.id) {
            summary.updated++;
            parentIdAfter = Number(updated.id);
          } else summary.skipped++;
        } else if (updateExisting && sku) {
          const existing = await findProductBySku(sku);
          if (existing?.id) {
            const { data: updated } = await woo.put(
              `/products/${existing.id}`,
              payload
            );
            if (updated?.id) {
              summary.updated++;
              parentIdAfter = Number(updated.id);
            } else summary.skipped++;
          } else {
            const { data: created } = await woo.post("/products", payload);
            if (created?.id) {
              summary.created++;
              parentIdAfter = Number(created.id);
            } else summary.skipped++;
          }
        } else {
          const { data: created } = await woo.post("/products", payload);
          if (created?.id) {
            summary.created++;
            parentIdAfter = Number(created.id);
          } else summary.skipped++;
        }

        // grouped attachments
        if (type === "grouped" && parentIdAfter && groupedSkusCsv) {
          const childSkus = splitComma(groupedSkusCsv);
          const childIds: number[] = [];

          for (const cs of childSkus) {
            const child = await findProductBySku(cs);
            if (child?.id) childIds.push(Number(child.id));
          }

          try {
            await woo.put(`/products/${parentIdAfter}`, {
              grouped_products: childIds,
            });
          } catch (e: any) {
            errors.push({
              row: i + 1,
              error: `Grouped attach failed: ${e?.message || "unknown"}`,
            });
          }
        }
      } else if (entity === "orders") {
        const idRaw = readVal(row, "id");
        const id = Number(idRaw);

        if (!id) {
          summary.skipped++;
          continue;
        }

        const status = readVal(row, "status");
        const customer_note = readVal(row, "customer_note");

        const payload: any = {};
        if (status) payload.status = status;
        if (customer_note) payload.customer_note = customer_note;

        const billing = {
          first_name: readVal(row, "billing_first_name"),
          last_name: readVal(row, "billing_last_name"),
          phone: readVal(row, "billing_phone"),
          email: readVal(row, "billing_email"),
          address_1: readVal(row, "billing_address_1"),
          city: readVal(row, "billing_city"),
          postcode: readVal(row, "billing_postcode"),
        };
        if (Object.values(billing).some((v) => v)) payload.billing = billing;

        const shipping = {
          address_1: readVal(row, "shipping_address_1"),
          city: readVal(row, "shipping_city"),
          postcode: readVal(row, "shipping_postcode"),
        };
        if (Object.values(shipping).some((v) => v)) payload.shipping = shipping;

        const { data: updated } = await woo.put(`/orders/${id}`, payload);
        if (updated?.id) summary.updated++;
        else summary.skipped++;
      } else if (entity === "customers") {
        const idRaw = readVal(row, "id");
        const email = readVal(row, "email");
        const first_name = readVal(row, "first_name");
        const last_name = readVal(row, "last_name");
        const username = readVal(row, "username");

        const billing = {
          phone: readVal(row, "billing_phone"),
          address_1: readVal(row, "billing_address_1"),
          city: readVal(row, "billing_city"),
          postcode: readVal(row, "billing_postcode"),
        };

        const payload: any = {
          ...(email ? { email } : {}),
          ...(first_name ? { first_name } : {}),
          ...(last_name ? { last_name } : {}),
          ...(username ? { username } : {}),
          billing,
        };

        const id = Number(idRaw);

        if (id && updateExisting) {
          const { data: updated } = await woo.put(`/customers/${id}`, payload);
          if (updated?.id) summary.updated++;
          else summary.skipped++;
        } else if (email && updateExisting) {
          const { data: found } = await woo.get("/customers", { params: { email } });
          const hit = Array.isArray(found) && found[0];

          if (hit?.id) {
            const { data: updated } = await woo.put(
              `/customers/${hit.id}`,
              payload
            );
            if (updated?.id) summary.updated++;
            else summary.skipped++;
          } else {
            const { data: created } = await woo.post("/customers", payload);
            if (created?.id) summary.created++;
            else summary.skipped++;
          }
        } else {
          const { data: created } = await woo.post("/customers", payload);
          if (created?.id) summary.created++;
          else summary.skipped++;
        }
      }
    } catch (err: any) {
      summary.skipped++;
      errors.push({ row: i + 1, error: err?.message || "Unknown error" });
    }
  }

  return Response.json({ summary, errors });
}