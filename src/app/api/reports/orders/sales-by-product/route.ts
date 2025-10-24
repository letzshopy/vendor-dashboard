// src/app/api/reports/orders/sales-by-product/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchOrdersRange } from "@/lib/fetch-orders-range";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date_from = searchParams.get("date_from") || "";
  const date_to = searchParams.get("date_to") || "";
  const status = searchParams.get("status") || "all";

  const orders = await fetchOrdersRange({ date_from, date_to, status });

  type Row = { product_id: number; name: string; sku?: string; qty: number; total: number };
  const map = new Map<number, Row>();

  for (const o of orders) {
    for (const li of o.line_items || []) {
      const id = Number(li.product_id || 0);
      const r = map.get(id) || { product_id: id, name: li.name || "(unknown)", sku: li.sku || "", qty: 0, total: 0 };
      r.qty += Number(li.quantity || 0);
      r.total += Number.parseFloat(li.total || "0") || 0;
      map.set(id, r);
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => b.total - a.total);

  return NextResponse.json({
    range: { date_from, date_to, status },
    rows,
    totals: {
      qty: rows.reduce((n, r) => n + r.qty, 0),
      total: Number(rows.reduce((n, r) => n + r.total, 0).toFixed(2)),
    },
  });
}
