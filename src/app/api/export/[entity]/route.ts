import { NextRequest } from "next/server";
import { getWooClient } from "@/lib/woo";

import { stringifyCsvRows } from "@/lib/csv";

export const dynamic = "force-dynamic";

type WooProduct = any;
type WooVariation = any;
const MAX_ATTR_COLS = 5; // raise if you want more attributes

type RouteParams = {
  params: Promise<{ entity: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { entity: rawEntity } = await params;
  const entity = String(rawEntity || "").toLowerCase();

  if (!["products", "orders", "customers"].includes(entity)) {
    return new Response("Unsupported entity", { status: 400 });
  }

  const url = new URL(req.url);
  const woo = await getWooClient();
  if (entity === "products") {
    
    const category = url.searchParams.get("category") || "";
    const stock_status = url.searchParams.get("stock_status") || "";
    const product_type = url.searchParams.get("product_type") || "";
    const include_variations =
      url.searchParams.get("include_variations") === "1";
    const include_grouped_children =
      url.searchParams.get("include_grouped_children") === "1";

    // Pull products (paginated)
    const all: WooProduct[] = [];
    let page = 1;
    const per_page = 100;
    while (true) {
      const { data } = await woo.get("/products", {
        params: {
          per_page,
          page,
          ...(stock_status ? { stock_status } : {}),
          ...(product_type ? { type: product_type } : {}),
          ...(category ? { category } : {}),
        },
      });
      if (!Array.isArray(data) || data.length === 0) break;
      all.push(...data);
      if (data.length < per_page) break;
      page++;
    }

    // Desired header order (exact)
    const headers: string[] = [
      "id",
      "sku",
      "name",
      "regular_price",
      "sale_price",
      "stock_status",
      "manage_stock",
      "stock_quantity",
      "type",
      "categories",
      "short_description",
      "description",
      "images",
      "Grouped products",
    ];
    for (let i = 1; i <= MAX_ATTR_COLS; i++) {
      headers.push(
        `Attribute ${i} name`,
        `Attribute ${i} value(s)`,
        `Attribute ${i} visible`,
        `Attribute ${i} global`
      );
    }

    const rows: (string | number | null)[][] = [];
    const joinCats = (p: WooProduct) =>
      (p.categories || [])
        .map((c: any) => c?.name)
        .filter(Boolean)
        .join("|");
    const joinImgs = (p: WooProduct) =>
      (p.images || [])
        .map((im: any) => im?.src)
        .filter(Boolean)
        .join("|");

    // Build product map for grouped children lookups
    const productById = new Map<number, WooProduct>();
    for (const p of all) productById.set(Number(p.id), p);
    const skuById = (id: number) => productById.get(id)?.sku || "";

    // Queue for variations
    const pendingVarFetches: Array<
      Promise<{ parent: WooProduct; variations: WooVariation[] }>
    > = [];

    // Parent/simple rows
    for (const p of all) {
      const type = String(p.type || "simple");
      if (type === "variable") {
        rows.push(buildProductRow(p, joinCats(p), joinImgs(p), "", true));
        if (include_variations)
          pendingVarFetches.push(fetchAllVariationsForParent(p));
      } else if (type === "grouped") {
        const childIds: number[] = Array.isArray(p.grouped_products)
          ? p.grouped_products.map((x: any) => Number(x))
          : [];
        const groupedSkus = childIds.map(skuById).filter(Boolean).join(",");

        rows.push(
          buildProductRow(p, joinCats(p), joinImgs(p), groupedSkus, true)
        );

        if (include_grouped_children) {
          for (const cid of childIds) {
            const child = productById.get(cid);
            if (!child) continue;
            rows.push(
              buildProductRow(child, joinCats(child), joinImgs(child), "", false)
            );
          }
        }
      } else {
        rows.push(buildProductRow(p, joinCats(p), joinImgs(p), "", false));
      }
    }

    // Variation rows
    if (include_variations && pendingVarFetches.length) {
      const results = await Promise.all(pendingVarFetches);
      for (const { parent, variations } of results) {
        for (const v of variations) rows.push(buildVariationRow(v, parent));
      }
    }

    const csv = stringifyCsvRows([headers, ...rows]);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="products-export.csv"`,
      },
    });
  }

  // ORDERS
  if (entity === "orders") {
    const all: any[] = [];
    let page = 1;
    const per_page = 100;
    while (true) {
      const { data } = await woo.get("/orders", {
        params: { per_page, page },
      });
      if (!Array.isArray(data) || data.length === 0) break;
      all.push(...data);
      if (data.length < per_page) break;
      page++;
    }
    const headers = [
      "id",
      "status",
      "date_created",
      "total",
      "customer_note",
      "billing_first_name",
      "billing_last_name",
      "billing_phone",
      "billing_email",
      "billing_address_1",
      "billing_city",
      "billing_postcode",
      "shipping_address_1",
      "shipping_city",
      "shipping_postcode",
    ];
    const rows = all.map((o: any) => [
      o.id ?? "",
      o.status ?? "",
      o.date_created ?? "",
      o.total ?? "",
      o.customer_note ?? "",
      o.billing?.first_name ?? "",
      o.billing?.last_name ?? "",
      o.billing?.phone ?? "",
      o.billing?.email ?? "",
      o.billing?.address_1 ?? "",
      o.billing?.city ?? "",
      o.billing?.postcode ?? "",
      o.shipping?.address_1 ?? "",
      o.shipping?.city ?? "",
      o.shipping?.postcode ?? "",
    ]);
    const csv = stringifyCsvRows([headers, ...rows]);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-export.csv"`,
      },
    });
  }

  // CUSTOMERS
  if (entity === "customers") {
    const all: any[] = [];
    let page = 1;
    const per_page = 100;
    while (true) {
      const { data } = await woo.get("/customers", {
        params: { per_page, page },
      });
      if (!Array.isArray(data) || data.length === 0) break;
      all.push(...data);
      if (data.length < per_page) break;
      page++;
    }
    const headers = [
      "id",
      "email",
      "first_name",
      "last_name",
      "username",
      "billing_phone",
      "billing_address_1",
      "billing_city",
      "billing_postcode",
    ];
    const rows = all.map((c: any) => [
      c.id ?? "",
      c.email ?? "",
      c.first_name ?? "",
      c.last_name ?? "",
      c.username ?? "",
      c.billing?.phone ?? "",
      c.billing?.address_1 ?? "",
      c.billing?.city ?? "",
      c.billing?.postcode ?? "",
    ]);
    const csv = stringifyCsvRows([headers, ...rows]);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="customers-export.csv"`,
      },
    });
  }

  return new Response("ok");
}

/* ================= Helpers ================= */

function as1(v: any) {
  if (v === true) return "1";
  if (typeof v === "string")
    return v.toLowerCase() === "yes" || v === "1" ? "1" : v;
  return v ? "1" : "";
}

function attrPack(p: WooProduct | WooVariation, isVariation = false) {
  const out: (string | number | null)[] = [];
  const attrs = Array.isArray(p.attributes) ? p.attributes : [];
  for (let i = 0; i < MAX_ATTR_COLS; i++) {
    const a = attrs[i];
    if (!a) {
      out.push("", "", "", "");
      continue;
    }
    const name = a.name || a.taxonomy || "";
    const values = isVariation
      ? a.option || ""
      : Array.isArray(a.options)
      ? a.options.join(" | ")
      : a.options || "";
    const visible = isVariation ? "" : as1(a.visible);
    const global = isVariation ? "" : a.taxonomy ? "1" : "";
    out.push(name || "", values || "", visible, global);
  }
  return out;
}

function buildProductRow(
  p: WooProduct,
  categories: string,
  images: string,
  groupedSkus: string,
  isParent: boolean
) {
  return [
    p.id ?? "",
    p.sku ?? "",
    p.name ?? "",
    p.regular_price ?? "",
    p.sale_price ?? "",
    p.stock_status ?? "",
    as1(p.manage_stock),
    p.stock_quantity ?? "",
    p.type ?? "",
    categories,
    p.short_description ?? "",
    p.description ?? "",
    images,
    groupedSkus, // Grouped products
    ...attrPack(p, false), // Attribute 1..5 (parent style)
  ];
}

function buildVariationRow(v: WooVariation, parent: WooProduct) {
  const categories = (parent.categories || [])
    .map((c: any) => c?.name)
    .filter(Boolean)
    .join("|");
  const img = v?.image?.src ? v.image.src : "";

  return [
    v.id ?? "",
    v.sku ?? "",
    v.name ?? "",
    v.regular_price ?? "",
    v.sale_price ?? "",
    v.stock_status ?? "",
    as1(v.manage_stock),
    v.stock_quantity ?? "",
    "variation",
    categories,
    "",
    "",
    img,
    "",
    ...attrPack(v, true),
  ];
}

async function fetchAllVariationsForParent(
  parent: WooProduct
): Promise<{ parent: WooProduct; variations: WooVariation[] }> {
  const woo = await getWooClient();
  const pid = parent?.id;
  const out: WooVariation[] = [];
  if (!pid) return { parent, variations: out };
  let page = 1;
  const per_page = 100;
  while (true) {
    const { data } = await woo.get(`/products/${pid}/variations`, {
      params: { per_page, page },
    });
    if (!Array.isArray(data) || data.length === 0) break;
    out.push(...data);
    if (data.length < per_page) break;
    page++;
  }
  return { parent, variations: out };
}
