// src/app/api/products/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";
import { deleteExistingSkuFromLookup, upsertProductLookup } from "@/lib/db";

/** figure out store URL from the configured woo client */
function storeURL(woo: any): string {
  return (
    (woo?.defaults?.baseURL as string) ||
    process.env.NEXT_PUBLIC_WP_URL ||
    process.env.WP_URL ||
    ""
  ).replace(/\/$/, "");
}

const toStr = (v: any) => (v === undefined || v === null || v === "" ? "" : String(v));
const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function extractWooError(e: any, fallback: string) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    fallback
  );
}

/**
 * Minimal GET to check if a SKU already exists in Woo
 * /api/products?sku=ABC
 */
export async function GET(req: Request) {
  try {
    const woo = await getWooClient();

    const { searchParams } = new URL(req.url);
    const sku = String(searchParams.get("sku") || "").trim();
    if (!sku) return NextResponse.json({ ok: true, items: [] });

    const { data } = await woo.get("/products", {
      params: { sku, per_page: 1, status: "any" },
    });

    return NextResponse.json({ ok: true, items: Array.isArray(data) ? data : [] });
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg = extractWooError(e, "Failed to query products");
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const woo = await getWooClient();
    const store = storeURL(woo);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const sku = String((body as any)?.sku ?? "").trim();
    if (!sku) {
      return NextResponse.json({ error: "SKU is required" }, { status: 400 });
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

    const manage_stock = !!(body as any).manage_stock;
    const stock_quantity = toNum((body as any).stock_quantity);

    const categories = Array.isArray((body as any).categories)
      ? (body as any).categories
          .map((id: any) => Number(id))
          .filter((n: number) => Number.isFinite(n) && n > 0)
          .map((id: number) => ({ id }))
      : [];

    const tags = Array.isArray((body as any).tags)
      ? (body as any).tags
          .map((name: any) => String(name || "").trim())
          .filter(Boolean)
          .map((name: string) => ({ name }))
      : [];

    const grouped_products = Array.isArray((body as any).grouped_products)
      ? (body as any).grouped_products
          .map((n: any) => Number(n))
          .filter((x: number) => Number.isFinite(x) && x > 0)
      : [];

    const payload: any = {
      name: (body as any).name,
      sku,
      type: (body as any).type || "simple",
      status: (body as any).status || "publish",
      catalog_visibility: (body as any).catalog_visibility || "visible",

      short_description: (body as any).short_description || "",
      description: (body as any).description || "",

      regular_price: toStr((body as any).regular_price),
      sale_price: toStr((body as any).sale_price),
      ...(((body as any).date_on_sale_from && { date_on_sale_from: (body as any).date_on_sale_from }) ||
        {}),
      ...(((body as any).date_on_sale_to && { date_on_sale_to: (body as any).date_on_sale_to }) ||
        {}),

      manage_stock,
      ...(manage_stock && stock_quantity !== undefined ? { stock_quantity } : {}),
      backorders: (body as any).backorders || "no",

      tax_status: (body as any).tax_status || "taxable",
      ...(((body as any).tax_class && { tax_class: String((body as any).tax_class) }) || {}),

      ...(toStr((body as any).weight) ? { weight: toStr((body as any).weight) } : {}),
      dimensions: (body as any).dimensions
        ? {
            length: toStr((body as any).dimensions?.length),
            width: toStr((body as any).dimensions?.width),
            height: toStr((body as any).dimensions?.height),
          }
        : undefined,

      images: Array.isArray((body as any).images) ? (body as any).images : [],
      categories,
      tags,
      attributes: Array.isArray((body as any).attributes) ? (body as any).attributes : [],
      grouped_products,
    };

    // Create in Woo
    const { data } = await woo.post(`/products`, payload);

    // Verify and cache
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
      id: data?.id,
      store,
      permalink: data?.permalink,
      status: data?.status,
      sku,
    });
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg = extractWooError(e, "Failed to create product");
    return NextResponse.json({ error: msg }, { status });
  }
}