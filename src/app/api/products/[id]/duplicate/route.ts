// src/app/api/products/[id]/duplicate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

/** Normalize Woo arrays */
function asIdObjs(arr?: { id: number }[] | number[]) {
  if (!arr) return [];
  if (typeof arr[0] === "number") {
    return (arr as number[]).map((id) => ({ id }));
  }
  return arr as { id: number }[];
}
function asNameObjs(arr?: { name: string }[] | string[]) {
  if (!arr) return [];
  if (typeof arr[0] === "string") {
    return (arr as string[]).map((name) => ({ name }));
  }
  return arr as { name: string }[];
}

/** Fetch all variations with pagination */
async function getAllVariations(productId: number) {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const { data } = await woo.get(`/products/${productId}/variations`, {
      params: { per_page: 100, page },
    });
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const srcId = Number(id);
    if (!srcId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // 1) Load source product
    const { data: src } = await woo.get(`/products/${srcId}`);
    const type = (src.type || "simple") as "simple" | "variable" | "grouped";

    // 2) Base fields (publish; keep images; blank SKU)
    const base: any = {
      name: src.name,
      type,
      status: "publish",
      catalog_visibility: src.catalog_visibility || "visible",
      short_description: src.short_description || "",
      description: src.description || "",
      sku: "",

      // keep images
      images: (src.images || []).map((im: any, i: number) => ({
        id: im.id,
        position: i,
      })),

      // categories / tags
      categories: asIdObjs(src.categories),
      tags: asNameObjs(src.tags),

      // tax
      tax_status: src.tax_status || "taxable",
      tax_class: src.tax_class || undefined,
    };

    // shipping (not for grouped)
    if (type !== "grouped") {
      base.weight = src.weight || undefined;
      if (
        src.dimensions &&
        (src.dimensions.length ||
          src.dimensions.width ||
          src.dimensions.height)
      ) {
        base.dimensions = {
          length: src.dimensions.length || "",
          width: src.dimensions.width || "",
          height: src.dimensions.height || "",
        };
      }
    }

    // type-specific parent fields
    if (type === "simple") {
      base.regular_price = src.regular_price || undefined;
      base.sale_price = src.sale_price || undefined;
      base.date_on_sale_from = src.date_on_sale_from || undefined;
      base.date_on_sale_to = src.date_on_sale_to || undefined;

      base.manage_stock = !!src.manage_stock;
      base.stock_quantity = src.manage_stock ? src.stock_quantity ?? 0 : undefined;
      base.backorders = src.backorders || "no";
    }

    if (type === "variable") {
      // copy variation attributes
      const varAttrs = (src.attributes || []).filter((a: any) => a.variation);
      base.attributes = varAttrs.map((a: any) => ({
        id: a.id,
        name: a.name,
        visible: true,
        variation: true,
        options: Array.isArray(a.options) ? a.options : [],
      }));
      // keep default attributes if present
      if (Array.isArray(src.default_attributes) && src.default_attributes.length) {
        base.default_attributes = src.default_attributes.map((a: any) => ({
          id: a.id,
          name: a.name,
          option: a.option,
        }));
      }
    }

    if (type === "grouped") {
      base.grouped_products = Array.isArray(src.grouped_products)
        ? src.grouped_products
        : [];
    }

    // 3) Create the new parent
    const { data: created } = await woo.post("/products", base);

    // 4) If variable, clone variations (blank sku, keep image if any)
    if (type === "variable") {
      const vars = await getAllVariations(srcId);
      if (vars.length) {
        await woo.post(`/products/${created.id}/variations/batch`, {
          create: vars.map((v: any) => ({
            sku: "", // ← force new unique later by vendor
            description: v.description || "",
            regular_price: v.regular_price || undefined,
            sale_price: v.sale_price || undefined,
            manage_stock: !!v.manage_stock,
            stock_quantity: v.manage_stock ? v.stock_quantity ?? 0 : undefined,
            backorders: v.backorders || "no",
            attributes: (v.attributes || []).map((a: any) => ({
              id: a.id,
              name: a.name,
              option: a.option,
            })),
            image: v.image?.id ? { id: v.image.id } : undefined,
          })),
        });
      }
    }

    return NextResponse.json({ ok: true, newId: created.id });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message || e?.message || "Duplicate failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
