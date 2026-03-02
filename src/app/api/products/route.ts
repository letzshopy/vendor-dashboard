// src/app/api/products/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";
import {
  deleteExistingSkuFromLookup,
  upsertProductLookup,
} from "@/lib/db";

/** figure out store URL from the configured woo client */
function storeURL(): string {
  return (
    ((woo as any)?.defaults?.baseURL as string) ||
    process.env.NEXT_PUBLIC_WP_URL ||
    process.env.WP_URL ||
    ""
  ).replace(/\/$/, "");
}

/**
 * Minimal GET to check if a SKU already exists in Woo
 * /api/products?sku=ABC
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sku = searchParams.get("sku") || "";
    if (!sku) return NextResponse.json({ ok: true, items: [] });

    const { data } = await woo.get("/products", {
      params: { sku, per_page: 1, status: "any" },
    });

    return NextResponse.json({ ok: true, items: data });
  } catch (e: any) {
    console.error(
      "Woo GET error:",
      e?.response?.status,
      e?.response?.data || e?.message
    );
    const status = e?.response?.status || 500;
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "Failed to query products";
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const store = storeURL();

    const toStr = (v: any) =>
      v === undefined || v === null || v === "" ? "" : String(v);

    const sku = String(body?.sku ?? "").trim();
    if (!sku) {
      return NextResponse.json(
        { error: "SKU is required" },
        { status: 400 }
      );
    }

    // Clear any stale local lookup for this SKU
    try {
      await deleteExistingSkuFromLookup(sku);
    } catch {
      /* ignore */
    }

    // Check in Woo for duplicate SKU
    try {
      const { data: exist } = await woo.get("/products", {
        params: { sku, per_page: 1, status: "any" },
      });
      if (Array.isArray(exist) && exist.length > 0) {
        return NextResponse.json(
          { error: `A product with SKU (${sku}) already exists in Woo.` },
          { status: 409 }
        );
      }
    } catch {
      /* ignore read failure */
    }

    const payload: any = {
      name: body.name,
      sku,
      type: body.type || "simple",
      status: body.status || "publish",
      catalog_visibility: body.catalog_visibility || "visible",

      short_description: body.short_description || "",
      description: body.description || "",

      regular_price: toStr(body.regular_price),
      sale_price: toStr(body.sale_price),
      date_on_sale_from: body.date_on_sale_from || undefined,
      date_on_sale_to: body.date_on_sale_to || undefined,

      manage_stock: !!body.manage_stock,
      stock_quantity: body.stock_quantity ?? undefined,
      backorders: body.backorders || "no",

      tax_status: body.tax_status || "taxable",
      tax_class: body.tax_class || "",

      weight: toStr(body.weight),
      dimensions: {
        length: toStr(body?.dimensions?.length),
        width: toStr(body?.dimensions?.width),
        height: toStr(body?.dimensions?.height),
      },

      images: Array.isArray(body.images) ? body.images : [],
      categories: Array.isArray(body.categories)
        ? body.categories.map((id: number) => ({ id }))
        : [],
      tags: Array.isArray(body.tags)
        ? body.tags.map((name: string) => ({ name }))
        : [],
      attributes: Array.isArray(body.attributes)
        ? body.attributes
        : [],
      grouped_products: Array.isArray(body.grouped_products)
        ? body.grouped_products
        : [],
    };

    // Create in Woo
    const { data } = await woo.post(`/products`, payload);

    // Verify and cache (without permalink, since type doesn't allow it)
    try {
      const { data: check } = await woo.get("/products", {
        params: { sku, per_page: 1, status: "any" },
      });
      if (Array.isArray(check) && check.length) {
        const p = check[0];
        await upsertProductLookup({
          woo_id: Number(p.id),
          sku,
          name: String(p.name || ""),
          status: String(p.status || ""),
        });
      }
    } catch {
      /* ignore cache errors */
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      store,
      permalink: data.permalink,
      status: data.status,
      sku,
    });
  } catch (e: any) {
    console.error(
      "Woo create error:",
      e?.response?.status,
      e?.response?.data || e?.message
    );
    const status = e?.response?.status || 500;
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "Failed to create product";
    return NextResponse.json({ error: msg }, { status });
  }
}
