// src/app/api/reports/orders/sales-by-category/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchOrdersRange } from "@/lib/fetch-orders-range";
import { woo } from "@/lib/woo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date_from = searchParams.get("date_from") || "";
  const date_to = searchParams.get("date_to") || "";
  const status = searchParams.get("status") || "all";

  const orders = await fetchOrdersRange({ date_from, date_to, status });

  // gather product ids
  const productIds = new Set<number>();
  for (const o of orders) for (const li of o.line_items || []) productIds.add(Number(li.product_id || 0));

  // fetch products (batched) to get category names
  const ids = Array.from(productIds).filter(Boolean);
  const catMap = new Map<number, string[]>(); // product_id -> category names
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const { data } = await woo.get("/products", { params: { include: batch.join(","), per_page: 50 } });
    for (const p of data || []) {
      const names = (p.categories || []).map((c: any) => c.name).filter(Boolean);
      catMap.set(Number(p.id), names);
    }
  }

  type Row = { category: string; qty: number; total: number };
  const map = new Map<string, Row>();

  for (const o of orders) {
    for (const li of o.line_items || []) {
      const pid = Number(li.product_id || 0);
      const cats = catMap.get(pid) || ["Uncategorized"];
      for (const c of cats) {
        const r = map.get(c) || { category: c, qty: 0, total: 0 };
        r.qty += Number(li.quantity || 0);
        r.total += Number.parseFloat(li.total || "0") || 0;
        map.set(c, r);
      }
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
