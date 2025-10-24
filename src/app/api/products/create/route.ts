import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

/** Normalize UI images ( [{id,url}] ) into Woo's expected shape. */
function normalizeImages(arr: any): Array<{ id?: number; src?: string; position?: number }> {
  if (!Array.isArray(arr)) return [];
  const out: Array<{ id?: number; src?: string; position?: number }> = [];

  arr.forEach((im: any, idx: number) => {
    const id =
      typeof im?.id === "number"
        ? im.id
        : (typeof im?.id === "string" && Number.isFinite(parseInt(im.id, 10))
            ? parseInt(im.id, 10)
            : undefined);

    const url = typeof im?.url === "string" ? im.url : undefined;
    const position = Number.isFinite(im?.position) ? Number(im.position) : idx;

    if (id) out.push({ id, position });
    else if (url) out.push({ src: url, position });
  });

  // De-dup by id/src while keeping the first occurrence (preserves ordering)
  const seen = new Set<string>();
  return out.filter((it) => {
    const key = it.id ? `id:${it.id}` : `src:${it.src}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Creates parent product (simple | variable | grouped)
 * For variable: this only creates the parent with variation attributes.
 *              Variations are created via /api/products/variations/bulk/[id]
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Map categories (IDs) to Woo payload
    let categories: { id: number }[] | undefined;
    if (Array.isArray(body.categories)) {
      categories = body.categories
        .map((id: any) => Number(id))
        .filter((n) => Number.isFinite(n))
        .map((id) => ({ id }));
    }

    // Tags upsert by name
    let tags: { name: string }[] | undefined;
    if (Array.isArray(body.tags)) {
      tags = body.tags
        .map((t: any) => (typeof t === "string" ? t.trim() : ""))
        .filter(Boolean)
        .map((name: string) => ({ name }));
    }

    // Attributes (for variable parent or visible attributes)
    let attributes: any[] | undefined;
    if (Array.isArray(body.attributes)) {
      attributes = body.attributes.map((a: any) => ({
        id: a.id ?? undefined,
        name: a.name ?? undefined,
        visible: !!a.visible,
        variation: !!a.variation,
        options: Array.isArray(a.options) ? a.options.map(String) : [],
      }));
    }

    // Images (NEW): accept {id} or {url} from UI and normalize.
    const images = normalizeImages(body?.images);

    const payload: any = {
      name: body.name,
      description: body.description || "",
      short_description: body.short_description || "",
      sku: body.sku, // required upstream
      status: body.status || "draft",                           // draft | publish
      catalog_visibility: body.catalog_visibility || "visible", // visible | catalog | search | hidden
      type: body.type || "simple",                              // simple | variable | grouped

      // SIMPLE-ONLY fields (ignored by Woo for variable/grouped)
      regular_price: body.regular_price || undefined,
      sale_price: body.sale_price || undefined,
      date_on_sale_from: body.date_on_sale_from || undefined,
      date_on_sale_to: body.date_on_sale_to || undefined,

      manage_stock: !!body.manage_stock,
      stock_quantity:
        body.manage_stock && Number.isFinite(Number(body.stock_quantity))
          ? Number(body.stock_quantity)
          : undefined,
      backorders: body.backorders || "no",

      tax_status: body.tax_status || "taxable",
      tax_class: body.tax_class || undefined,

      weight: body.weight || undefined,
      dimensions: body.dimensions || undefined,
     
      categories,
      tags,
      attributes,
      images, // <<< include images on CREATE

      // GROUPED
      grouped_products: Array.isArray(body.grouped_products)
        ? body.grouped_products.map((n: any) => Number(n)).filter(Number.isFinite)
        : undefined,
    };

    const { data } = await woo.post("/products", payload);
    return NextResponse.json({ ok: true, product: data });
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
