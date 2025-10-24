// src/app/api/reports/orders/sales-by-date/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchOrdersRange } from "@/lib/fetch-orders-range";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date_from = searchParams.get("date_from") || "";
  const date_to = searchParams.get("date_to") || "";
  const status = searchParams.get("status") || "all";

  const orders = await fetchOrdersRange({ date_from, date_to, status });

  // group by YYYY-MM-DD
  const byDay = new Map<string, { orders: number; items: number; gross: number; shipping: number; refunds: number; coupons: number }>();
  const isoDay = (s: string) => (s ? (s.split("T")[0] || s) : "unknown");

  for (const o of orders) {
    const d = isoDay(o.date_created_gmt || o.date_created);
    const v = byDay.get(d) || { orders: 0, items: 0, gross: 0, shipping: 0, refunds: 0, coupons: 0 };
    v.orders += 1;
    for (const li of o.line_items || []) v.items += Number(li.quantity || 0);
    v.gross += Number.parseFloat(o.total || "0") || 0;
    v.shipping += Number.parseFloat(o.shipping_total || "0") || 0;
    v.refunds += Number.parseFloat(o.refund_total || "0") || 0;
    // Basic coupon sum if present
    for (const f of o.fee_lines || []) if (String(f.name || "").toLowerCase().includes("coupon")) v.coupons += Math.abs(Number(f.total || 0));
    byDay.set(d, v);
  }

  // totals
  let gross = 0, ordersCount = 0, items = 0, shipping = 0, refunds = 0, coupons = 0;
  for (const v of byDay.values()) {
    gross += v.gross; ordersCount += v.orders; items += v.items; shipping += v.shipping; refunds += v.refunds; coupons += v.coupons;
  }

  const rows = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, m]) => ({ date, ...m }));

  return NextResponse.json({
    range: { date_from, date_to, status },
    totals: { gross, orders: ordersCount, items, shipping, refunds, coupons },
    rows,
  });
}
