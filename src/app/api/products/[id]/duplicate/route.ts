// src/app/api/products/[id]/duplicate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

/** Normalize Woo arrays */
function asIdObjs(arr?: { id: number }[] | number[]) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return [];
  const first: any = arr[0];
  if (typeof first === "number") return (arr as number[]).map((id) => ({ id }));
  return (arr as { id: number }[]).map((x) => ({ id: Number((x as any).id) }));
}

function asNameObjs(arr?: { name: string }[] | string[]) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return [];
  const first: any = arr[0];
  if (typeof first === "string") return (arr as string[]).map((name) => ({ name }));
  return (arr as { name: string }[]).map((x) => ({ name: String((x as any).name || "") }));
}

/** Fetch all variations with pagination */
async function getAllVariations(woo: any, productId: number) {
  const all: any[] = [];
  let page = 1;
  const PER_PAGE = 100;
  const MAX_PAGES = 25; // safety cap

  while (page <= MAX_PAGES) {
    const { data } = await woo.get(`/products/${productId}/variations`, {
      params: { per_page: PER_PAGE, page },
    });
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    if (data.length < PER_PAGE) break;
    page++;
  }

  return all;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();

    const { id } = await context.params;
    const srcId = Number(id);
    if (!srcId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // 1) Load source product
    const { data: src } = await woo.get(`/products/${srcId}`);
    const type = (src?.type || "simple") as "simple" | "variable" | "grouped";

    // 2) Base fields (publish; keep images; blank SKU)
    const base: any = {
      name: src?.name || "Duplicated Product",
      type,
      status: "publish",
      catalog_visibility: src?.catalog_visibility || "visible",
      short_description: src?.short_description || "",
      description: src?.description || "",
      sku: "",

      // keep parent images (IDs)
      images: Array.isArray(src?.images)
        ? src.images.map((im: any, i: number) => ({
            id: im.id,
            position: i,
          }))
        : [],

      // categories / tags
      categories: asIdObjs(src?.categories),
      tags: asNameObjs(src?.tags),

      // tax
      tax_status: src?.tax_status || "taxable",
    };

    if (src?.tax_class) base.tax_class = src.tax_class;

    // shipping (not for grouped)
    if (type !== "grouped") {
      if (src?.weight) base.weight = src.weight;

      const d = src?.dimensions;
      const hasDims =
        d && (String(d.length || "") || String(d.width || "") || String(d.height || ""));
      if (hasDims) {
        base.dimensions = {
          length: d.length || "",
          width: d.width || "",
          height: d.height || "",
        };
      }
    }

    // type-specific parent fields
    if (type === "simple") {
      if (src?.regular_price) base.regular_price = src.regular_price;
      if (src?.sale_price) base.sale_price = src.sale_price;
      if (src?.date_on_sale_from) base.date_on_sale_from = src.date_on_sale_from;
      if (src?.date_on_sale_to) base.date_on_sale_to = src.date_on_sale_to;

      base.manage_stock = !!src?.manage_stock;
      if (src?.manage_stock) base.stock_quantity = src?.stock_quantity ?? 0;
      base.backorders = src?.backorders || "no";
    }

    if (type === "variable") {
      // copy variation attributes
      const varAttrs = Array.isArray(src?.attributes)
        ? src.attributes.filter((a: any) => a?.variation)
        : [];

      if (varAttrs.length) {
        base.attributes = varAttrs.map((a: any) => ({
          id: a.id,
          name: a.name,
          visible: true,
          variation: true,
          options: Array.isArray(a.options) ? a.options : [],
        }));
      }

      // keep default attributes if present
      if (Array.isArray(src?.default_attributes) && src.default_attributes.length) {
        base.default_attributes = src.default_attributes.map((a: any) => ({
          id: a.id,
          name: a.name,
          option: a.option,
        }));
      }
    }

    if (type === "grouped") {
      base.grouped_products = Array.isArray(src?.grouped_products) ? src.grouped_products : [];
    }

    // 3) Create the new parent
    const { data: created } = await woo.post("/products", base);
    if (!created?.id) throw new Error("Failed to create duplicate product");

    // 4) If variable, clone variations (blank sku, keep image if any)
    if (type === "variable") {
      const vars = await getAllVariations(woo, srcId);
      if (vars.length) {
        await woo.post(`/products/${created.id}/variations/batch`, {
          create: vars.map((v: any) => ({
            sku: "", // force unique later by vendor
            description: v?.description || "",
            regular_price: v?.regular_price || undefined,
            sale_price: v?.sale_price || undefined,
            manage_stock: !!v?.manage_stock,
            stock_quantity: v?.manage_stock ? v?.stock_quantity ?? 0 : undefined,
            backorders: v?.backorders || "no",
            attributes: Array.isArray(v?.attributes)
              ? v.attributes.map((a: any) => ({
                  id: a.id,
                  name: a.name,
                  option: a.option,
                }))
              : [],
            image: v?.image?.id ? { id: v.image.id } : undefined,
          })),
        });
      }
    }

    return NextResponse.json({ ok: true, newId: Number(created.id) });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Duplicate failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}