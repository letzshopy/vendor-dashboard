import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";
import { PRODUCT_CSV_COLUMNS } from "@/types/import";

export const dynamic = "force-dynamic";

type P = {
  id: number;
  sku?: string;
  name: string;
  type: string;
  status?: string;
  catalog_visibility?: "visible" | "catalog" | "search" | "hidden";
  regular_price?: string;
  sale_price?: string;
  date_on_sale_from?: string | null;
  date_on_sale_to?: string | null;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  backorders?: "no" | "notify" | "yes";
  short_description?: string;
  description?: string;
  categories?: { id: number; name: string }[];
  images?: { src: string }[];
  grouped_products?: (number | string)[];
  attributes?: {
    name: string;
    visible?: boolean;
    options?: string[];
  }[];
  weight?: string;
  dimensions?: { length?: string; width?: string; height?: string };
  meta_data?: { key: string; value: any }[];
};

function esc(v: any) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function first<T>(arr?: T[]) {
  return Array.isArray(arr) && arr.length ? arr[0] : undefined;
}

function getExternalId(p: P) {
  const m = (p.meta_data || []).find((x) => x.key === "_external_id");
  return m ? String(m.value ?? "") : "";
}

function attrCell(p: P, idx: number, key: "name" | "value" | "visible" | "global") {
  const a = (p.attributes || [])[idx - 1];
  if (!a) return "";
  if (key === "name") return a.name || "";
  if (key === "value") return (a.options || []).join("|");
  if (key === "visible") return a.visible ? "1" : "0";
  if (key === "global") return "0"; // exporting as local attributes
  return "";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") || "";
  const stock = url.searchParams.get("stock") || "";
  const ptype = url.searchParams.get("ptype") || "";

  const requestedCols = (url.searchParams.get("columns") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Use user selection if provided; otherwise use the full shared list
  const cols = requestedCols.length
    ? requestedCols.filter((c) => PRODUCT_CSV_COLUMNS.includes(c as any))
    : [...PRODUCT_CSV_COLUMNS];

  // fetch all products
  const perPage = 100;
  let page = 1;
  const out: P[] = [];
  while (true) {
    const params: Record<string, any> = { per_page: perPage, page, status: "any" };
    if (category) params.category = category;
    if (stock) params.stock_status = stock;
    if (ptype) params.type = ptype;

    const { data } = await woo.get<P[]>("/products", { params });
    if (!Array.isArray(data) || data.length === 0) break;
    out.push(...data);
    if (data.length < perPage) break;
    page++;
  }

  const header = cols.join(",");
  const rows = out.map((p) => {
    const dims = p.dimensions || {};
    const firstImage = first(p.images)?.src ?? "";
    const grouped = (p.grouped_products || []).join("|");

    const map: Record<string, string> = {
      "id": String(p.id ?? ""),
      "sku": p.sku ?? "",
      "name": p.name ?? "",
      "type": p.type ?? "",
      "category": (p.categories || []).map((c) => c.name).join("|"),
      "status": p.status ?? "",
      "visibility": p.catalog_visibility ?? "",
      "short description": p.short_description ?? "",
      "Description": p.description ?? "",
      "regular price": p.regular_price ?? "",
      "sale price": p.sale_price ?? "",
      "sale from": p.date_on_sale_from ?? "",
      "sale to": p.date_on_sale_to ?? "",
      "manage stock": p.manage_stock ? "1" : "0",
      "quantity": p.stock_quantity == null ? "" : String(p.stock_quantity),
      "backorder": p.backorders ?? "",
      "weight": p.weight ?? "",
      "length": dims.length ?? "",
      "width": dims.width ?? "",
      "height": dims.height ?? "",
      "image url": firstImage,
      "Grouped products": grouped,
      "Attribute 1 name": attrCell(p, 1, "name"),
      "Attribute 1 value(s)": attrCell(p, 1, "value"),
      "Attribute 1 visible": attrCell(p, 1, "visible"),
      "Attribute 1 global": attrCell(p, 1, "global"),
      "Attribute 2 name": attrCell(p, 2, "name"),
      "Attribute 2 value(s)": attrCell(p, 2, "value"),
      "Attribute 2 visible": attrCell(p, 2, "visible"),
      "Attribute 2 global": attrCell(p, 2, "global"),
      "Attribute 3 name": attrCell(p, 3, "name"),
      "Attribute 3 value(s)": attrCell(p, 3, "value"),
      "Attribute 3 visible": attrCell(p, 3, "visible"),
      "Attribute 3 global": attrCell(p, 3, "global"),
      "Attribute 4 name": attrCell(p, 4, "name"),
      "Attribute 4 value(s)": attrCell(p, 4, "value"),
      "Attribute 4 visible": attrCell(p, 4, "visible"),
      "Attribute 4 global": attrCell(p, 4, "global"),
      "Attribute 5 name": attrCell(p, 5, "name"),
      "Attribute 5 value(s)": attrCell(p, 5, "value"),
      "Attribute 5 visible": attrCell(p, 5, "visible"),
      "Attribute 5 global": attrCell(p, 5, "global"),
      "external_id": getExternalId(p),
    };

    return cols.map((c) => esc(map[c] ?? "")).join(",");
  });

  const csv = [header, ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-export-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
