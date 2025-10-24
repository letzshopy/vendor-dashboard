// src/app/api/reports/stock/[type]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { type: "low" | "out" | "most" } }
) {
  const type = params.type;
  const per = 100;

  // Pull products (first few pages is fine for vendor dashboard)
  const first = await woo.get("/products", { params: { per_page: per, page: 1, status: "publish" } });
  let prods = first.data || [];
  const totalPages = Math.min(parseInt(first.headers["x-wp-totalpages"] || "1", 10), 5);
  const ps: Promise<any>[] = [];
  for (let p = 2; p <= totalPages; p++) {
    ps.push(woo.get("/products", { params: { per_page: per, page: p, status: "publish" } }));
  }
  if (ps.length) {
    const rs = await Promise.allSettled(ps);
    for (const r of rs) if (r.status === "fulfilled") prods.push(...(r.value.data || []));
  }

  // Normalize stock qty
  const rows = prods.map((p: any) => ({
    id: p.id,
    name: p.name,
    parent: p.parent_id || null,
    stock_status: p.stock_status || "instock",
    stock_quantity: Number.isFinite(p.stock_quantity) ? Number(p.stock_quantity) : null,
  }));

  let filtered = rows;
  if (type === "low") {
    filtered = rows.filter((r) => r.stock_status === "instock" && (r.stock_quantity ?? 0) > 0)
                   .sort((a, b) => (a.stock_quantity ?? Infinity) - (b.stock_quantity ?? Infinity));
  } else if (type === "out") {
    filtered = rows.filter((r) => r.stock_status === "outofstock");
  } else {
    // most stocked
    filtered = rows.filter((r) => (r.stock_quantity ?? -1) >= 0)
                   .sort((a, b) => (b.stock_quantity ?? -1) - (a.stock_quantity ?? -1));
  }

  return NextResponse.json({ type, items: filtered });
}
