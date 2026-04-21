// src/app/api/products/create/route.ts
import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";
import {
  ensureDb,
  deleteExistingSkuFromLookup,
  upsertProductLookup,
} from "@/lib/db";

function toStr(v: any) {
  return v === undefined || v === null || v === "" ? "" : String(v);
}

function toNumOrUndef(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function buildMetaData(body: any) {
  const meta_data: { key: string; value: string }[] = [];

  const color = String(body?.color || "").trim();
  if (color) {
    meta_data.push({
      key: "_ls_color",
      value: color,
    });
  }

  return meta_data;
}

function buildPayload(body: any, sku?: string) {
  const categories = Array.isArray(body?.categories)
    ? body.categories
        .map((id: any) => Number(id))
        .filter((n: number) => Number.isFinite(n) && n > 0)
        .map((id: number) => ({ id }))
    : [];

  const tags = Array.isArray(body?.tags)
    ? body.tags
        .map((t: any) => {
          if (typeof t === "string") return t.trim();
          if (t && typeof t === "object" && typeof t.name === "string") {
            return t.name.trim();
          }
          return "";
        })
        .filter(Boolean)
        .map((name: string) => ({ name }))
    : [];

  const attributes = Array.isArray(body?.attributes)
    ? body.attributes.map((a: any) => ({
        ...(a?.id ? { id: Number(a.id) } : {}),
        ...(a?.name ? { name: String(a.name) } : {}),
        visible: !!a?.visible,
        variation: !!a?.variation,
        options: Array.isArray(a?.options) ? a.options.map(String) : [],
      }))
    : [];

  const meta_data = buildMetaData(body);

  const payload: any = {
    name: body?.name,
    type: body?.type || "simple",
    status: body?.status || "draft",
    catalog_visibility: body?.catalog_visibility || "visible",
    description: body?.description || "",
    short_description: body?.short_description || "",
    regular_price: toStr(body?.regular_price),
    sale_price: toStr(body?.sale_price),
    ...(body?.date_on_sale_from ? { date_on_sale_from: body.date_on_sale_from } : {}),
    ...(body?.date_on_sale_to ? { date_on_sale_to: body.date_on_sale_to } : {}),
    manage_stock: !!body?.manage_stock,
    ...(body?.manage_stock
      ? { stock_quantity: toNumOrUndef(body?.stock_quantity) ?? 0 }
      : {}),
    backorders: body?.backorders || "no",
    tax_status: body?.tax_status || "taxable",
    ...(body?.tax_class ? { tax_class: String(body.tax_class) } : {}),
    ...(body?.weight ? { weight: toStr(body.weight) } : {}),
    dimensions: body?.dimensions
      ? {
          length: toStr(body.dimensions.length),
          width: toStr(body.dimensions.width),
          height: toStr(body.dimensions.height),
        }
      : undefined,
    images: Array.isArray(body?.images) ? body.images : [],
    categories,
    tags,
    attributes,
    grouped_products: Array.isArray(body?.grouped_products)
      ? body.grouped_products
          .map((n: any) => Number(n))
          .filter((x: number) => Number.isFinite(x) && x > 0)
      : undefined,
    ...(meta_data.length ? { meta_data } : {}),
  };

  if (sku) payload.sku = sku;

  return payload;
}

export async function POST(req: Request) {
  try {
    const woo = await getWooClient();

    await ensureDb();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const sku = String((body as any).sku || "").trim();

    if (sku) {
      await deleteExistingSkuFromLookup(sku);
    }

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

      const looksLikeWooSkuBug = /lookup/i.test(msg) && /sku/i.test(msg);

      if (!looksLikeWooSkuBug) {
        throw err;
      }

      const noSku = buildPayload(body, undefined);
      const { data } = await woo.post("/products", noSku);

      await upsertProductLookup({
        woo_id: Number(data.id),
        sku: "",
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