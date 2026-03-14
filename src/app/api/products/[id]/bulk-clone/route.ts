// src/app/api/products/[id]/bulk-clone/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

/** Helpers */
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

/** Pull all variations for a product (paged) */
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

/** From a base like 'bk1' => sequence bk2, bk3, ... ; from 'CK' => CK-1, CK-2, ... */
function makeSkuSequence(base: string, count: number): string[] {
  const b = String(base || "").trim();
  const m = b.match(/^(.*?)(\d+)$/);
  if (m) {
    const [, prefix, numStr] = m;
    const start = parseInt(numStr, 10);
    return Array.from({ length: count }, (_, i) => `${prefix}${start + i + 1}`);
  }
  return Array.from({ length: count }, (_, i) => `${b}${b ? "-" : ""}${i + 1}`);
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();

    const { id } = await context.params;
    const srcId = Number(id);
    if (!srcId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const count = Math.max(1, Math.min(200, Number(body?.count || 1))); // cap to avoid abuse

    // 1) Load source product
    const { data: src } = await woo.get(`/products/${srcId}`);
    const type = (src?.type || "simple") as "simple" | "variable" | "grouped";

    // 2) Build SKU sequence
    const skus = makeSkuSequence(src?.sku || "", count);

    const createdIds: number[] = [];

    // 3) Loop and create clones
    for (let i = 0; i < count; i++) {
      const parentPayload: any = {
        name: src?.name || "Cloned Product",
        type,
        status: "publish",
        catalog_visibility: src?.catalog_visibility || "visible",
        short_description: src?.short_description || "",
        description: src?.description || "",
        sku: skus[i], // parent gets auto SKU
        images: [], // no images
        categories: asIdObjs(src?.categories),
        tags: asNameObjs(src?.tags),
        tax_status: src?.tax_status || "taxable",
      };

      // only set tax_class if present
      if (src?.tax_class) parentPayload.tax_class = src.tax_class;

      if (type !== "grouped") {
        if (src?.weight) parentPayload.weight = src.weight;

        const d = src?.dimensions;
        const hasDims =
          d && (String(d.length || "") || String(d.width || "") || String(d.height || ""));
        if (hasDims) {
          parentPayload.dimensions = {
            length: d.length || "",
            width: d.width || "",
            height: d.height || "",
          };
        }
      }

      if (type === "simple") {
        if (src?.regular_price) parentPayload.regular_price = src.regular_price;
        if (src?.sale_price) parentPayload.sale_price = src.sale_price;
        if (src?.date_on_sale_from) parentPayload.date_on_sale_from = src.date_on_sale_from;
        if (src?.date_on_sale_to) parentPayload.date_on_sale_to = src.date_on_sale_to;

        parentPayload.manage_stock = !!src?.manage_stock;
        if (src?.manage_stock) {
          parentPayload.stock_quantity = src?.stock_quantity ?? 0;
        }
        parentPayload.backorders = src?.backorders || "no";
      }

      if (type === "variable") {
        const varAttrs = Array.isArray(src?.attributes)
          ? src.attributes.filter((a: any) => a?.variation)
          : [];

        if (varAttrs.length) {
          parentPayload.attributes = varAttrs.map((a: any) => ({
            id: a.id,
            name: a.name,
            visible: true,
            variation: true,
            options: Array.isArray(a.options) ? a.options : [],
          }));
        }

        if (Array.isArray(src?.default_attributes) && src.default_attributes.length) {
          parentPayload.default_attributes = src.default_attributes.map((a: any) => ({
            id: a.id,
            name: a.name,
            option: a.option,
          }));
        }
      }

      if (type === "grouped") {
        parentPayload.grouped_products = Array.isArray(src?.grouped_products)
          ? src.grouped_products
          : [];
      }

      // 3a) Create parent
      const { data: created } = await woo.post("/products", parentPayload);
      if (!created?.id) throw new Error("Failed to create cloned product");
      createdIds.push(Number(created.id));

      // 3b) If variable, clone variations (blank SKUs; no images)
      if (type === "variable") {
        const vars = await getAllVariations(woo, srcId);
        if (vars.length) {
          await woo.post(`/products/${created.id}/variations/batch`, {
            create: vars.map((v: any) => ({
              sku: "", // leave blank; vendor can set later
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
              image: undefined, // no images on bulk clone
            })),
          });
        }
      }
    }

    return NextResponse.json({ ok: true, createdIds });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Bulk clone failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}