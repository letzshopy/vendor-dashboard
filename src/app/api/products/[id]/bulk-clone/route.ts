// src/app/api/products/[id]/bulk-clone/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

/** Helpers */
function asIdObjs(arr?: { id: number }[] | number[]) {
  if (!arr) return [];
  if (typeof arr[0] === "number") return (arr as number[]).map((id) => ({ id }));
  return arr as { id: number }[];
}
function asNameObjs(arr?: { name: string }[] | string[]) {
  if (!arr) return [];
  if (typeof arr[0] === "string") return (arr as string[]).map((name) => ({ name }));
  return arr as { name: string }[];
}

/** Pull all variations for a product */
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

/** From a base like 'bk1' => sequence bk2, bk3, ... ; from 'CK' => CK-1, CK-2, ... */
function makeSkuSequence(base: string, count: number): string[] {
  const m = String(base || "").match(/^(.*?)(\d+)$/);
  if (m) {
    const [, prefix, numStr] = m;
    const start = parseInt(numStr, 10);
    return Array.from({ length: count }, (_, i) => `${prefix}${start + i + 1}`);
  }
  return Array.from({ length: count }, (_, i) => `${base}${base ? "-" : ""}${i + 1}`);
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const srcId = Number(id);
    if (!srcId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const count = Math.max(1, Number(body?.count || 1));

    // 1) Load source product
    const { data: src } = await woo.get(`/products/${srcId}`);
    const type = (src.type || "simple") as "simple" | "variable" | "grouped";

    // 2) Build SKU sequence
    const skus = makeSkuSequence(src.sku || "", count);

    const createdIds: number[] = [];

    // 3) Loop and create clones
    for (let i = 0; i < count; i++) {
      const parentPayload: any = {
        name: src.name,
        type,
        status: "publish",
        catalog_visibility: src.catalog_visibility || "visible",
        short_description: src.short_description || "",
        description: src.description || "",
        sku: skus[i], // parent gets auto SKU
        images: [], // no images
        categories: asIdObjs(src.categories),
        tags: asNameObjs(src.tags),
        tax_status: src.tax_status || "taxable",
        tax_class: src.tax_class || undefined,
      };

      if (type !== "grouped") {
        parentPayload.weight = src.weight || undefined;
        if (
          src.dimensions &&
          (src.dimensions.length || src.dimensions.width || src.dimensions.height)
        ) {
          parentPayload.dimensions = {
            length: src.dimensions.length || "",
            width: src.dimensions.width || "",
            height: src.dimensions.height || "",
          };
        }
      }

      if (type === "simple") {
        parentPayload.regular_price = src.regular_price || undefined;
        parentPayload.sale_price = src.sale_price || undefined;
        parentPayload.date_on_sale_from = src.date_on_sale_from || undefined;
        parentPayload.date_on_sale_to = src.date_on_sale_to || undefined;
        parentPayload.manage_stock = !!src.manage_stock;
        parentPayload.stock_quantity = src.manage_stock
          ? src.stock_quantity ?? 0
          : undefined;
        parentPayload.backorders = src.backorders || "no";
      }

      if (type === "variable") {
        const varAttrs = (src.attributes || []).filter((a: any) => a.variation);
        parentPayload.attributes = varAttrs.map((a: any) => ({
          id: a.id,
          name: a.name,
          visible: true,
          variation: true,
          options: Array.isArray(a.options) ? a.options : [],
        }));
        if (Array.isArray(src.default_attributes) && src.default_attributes.length) {
          parentPayload.default_attributes = src.default_attributes.map((a: any) => ({
            id: a.id,
            name: a.name,
            option: a.option,
          }));
        }
      }

      if (type === "grouped") {
        parentPayload.grouped_products = Array.isArray(src.grouped_products)
          ? src.grouped_products
          : [];
      }

      // 3a) Create parent
      const { data: created } = await woo.post("/products", parentPayload);
      createdIds.push(created.id);

      // 3b) If variable, clone variations (blank SKUs; no images)
      if (type === "variable") {
        const vars = await getAllVariations(srcId);
        if (vars.length) {
          await woo.post(`/products/${created.id}/variations/batch`, {
            create: vars.map((v: any) => ({
              sku: "", // leave blank; vendor can set later
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
              image: undefined, // no images on bulk clone
            })),
          });
        }
      }
    }

    return NextResponse.json({ ok: true, createdIds });
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || "Bulk clone failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
