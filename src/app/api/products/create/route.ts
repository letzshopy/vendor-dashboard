// src/app/api/products/create/route.ts
import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";
import {
  ensureDb,
  deleteExistingSkuFromLookup,
  upsertProductLookup,
} from "@/lib/db";

function toStr(v: any) {
  return v === undefined || v === null || v === "" ? "" : String(v);
}

function buildPayload(body: any, sku?: string) {
  const categories =
    Array.isArray(body.categories)
      ? body.categories
          .map((id: any) => Number(id))
          .filter(Number.isFinite)
          .map((id: number) => ({ id }))       // 🔹 typed here
      : [];

  const tags =
    Array.isArray(body.tags)
      ? body.tags
          .map((t: any) => (typeof t === "string" ? t.trim() : ""))
          .filter(Boolean)
          .map((name: string) => ({ name }))
      : [];

  const attributes = Array.isArray(body.attributes)
    ? body.attributes.map((a: any) => ({
        id: a.id ?? undefined,
        name: a.name ?? undefined,
        visible: !!a.visible,
        variation: !!a.variation,
        options: Array.isArray(a.options) ? a.options.map(String) : [],
      }))
    : [];

  const payload: any = {
    name: body.name,
    type: body.type || "simple",
    status: body.status || "draft",
    catalog_visibility: body.catalog_visibility || "visible",
    description: body.description || "",
    short_description: body.short_description || "",
    regular_price: toStr(body.regular_price),
    sale_price: toStr(body.sale_price),
    date_on_sale_from: body.date_on_sale_from || undefined,
    date_on_sale_to: body.date_on_sale_to || undefined,
    manage_stock: !!body.manage_stock,
    stock_quantity:
      body.manage_stock && Number.isFinite(Number(body.stock_quantity))
        ? Number(body.stock_quantity)
        : undefined,
    backorders: body.backorders || "no",
    tax_status: body.tax_status || "taxable",
    tax_class: body.tax_class || "",
    weight: toStr(body.weight),
    dimensions: body.dimensions
      ? {
          length: toStr(body.dimensions.length),
          width: toStr(body.dimensions.width),
          height: toStr(body.dimensions.height),
        }
      : undefined,
    images: Array.isArray(body.images) ? body.images : [],
    categories,
    tags,
    attributes,
    grouped_products: Array.isArray(body.grouped_products)
      ? body.grouped_products
          .map((n: any) => Number(n))
          .filter(Number.isFinite)
      : undefined,
  };

  // only set SKU when we want to
  if (sku) payload.sku = sku;

  return payload;
}

export async function POST(req: Request) {
  try {
    await ensureDb();
    const body = await req.json();
    const sku = String(body.sku || "").trim();

    // clean any stale local row so our local UNIQUE(sku) never trips
    if (sku) {
      await deleteExistingSkuFromLookup(sku);
    }

    // 1) try with SKU
    try {
      const withSku = buildPayload(body, sku || undefined);
      const { data } = await woo.post("/products", withSku);

      await upsertProductLookup({
        woo_id: Number(data.id),
        sku: sku || "",
        name: data.name || withSku.name || "",
        status: data.status || withSku.status || "draft",
      });

      return NextResponse.json({
        ok: true,
        id: data.id,
        permalink: data.permalink,
        status: data.status,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "";

      // If Woo screams about “lookup table / SKU already present”, retry once WITHOUT SKU
      const looksLikeWooSkuBug = /lookup/i.test(msg) && /sku/i.test(msg);

      if (!looksLikeWooSkuBug) {
        throw err;
      }

      // 2) retry without SKU (to unblock creation)
      const noSku = buildPayload(body, undefined);
      const { data } = await woo.post("/products", noSku);

      await upsertProductLookup({
        woo_id: Number(data.id),
        sku: "", // skip sku locally since Woo refused it
        name: data.name || noSku.name || "",
        status: data.status || noSku.status || "draft",
      });

      return NextResponse.json({
        ok: true,
        id: data.id,
        permalink: data.permalink,
        status: data.status,
        note: "Created without SKU because Woo’s lookup table rejected the SKU.",
      });
    }
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Error";
    return NextResponse.json({ error: String(msg) }, { status });
  }
}
