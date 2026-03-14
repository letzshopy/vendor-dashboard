// src/app/api/reports/orders/sales-by-category/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchOrdersRange } from "@/lib/fetch-orders-range";
import { getWooClient } from "@/lib/woo";

export const dynamic = "force-dynamic";

function extractWooError(e: any, fallback: string) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    fallback
  );
}

export async function GET(req: NextRequest) {
  try {
    const woo = await getWooClient();

    const { searchParams } = new URL(req.url);
    const date_from = String(searchParams.get("date_from") || "").trim();
    const date_to = String(searchParams.get("date_to") || "").trim();
    const status = String(searchParams.get("status") || "all").trim() || "all";

    const orders = await fetchOrdersRange({ date_from, date_to, status });

    // gather product ids from line items
    const productIds = new Set<number>();
    for (const o of orders || []) {
      for (const li of o?.line_items || []) {
        const pid = Number(li?.product_id || 0);
        if (pid) productIds.add(pid);
      }
    }

    const ids = Array.from(productIds);
    const catMap = new Map<number, string[]>(); // product_id -> category names

    // fetch products (batched) to get category names
    const BATCH = 50;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);

      const { data } = await woo.get("/products", {
        params: { include: batch, per_page: BATCH, status: "any" },
      });

      const products = Array.isArray(data) ? data : [];
      for (const p of products) {
        const names = Array.isArray(p?.categories)
          ? p.categories.map((c: any) => String(c?.name || "").trim()).filter(Boolean)
          : [];

        catMap.set(Number(p?.id || 0), names.length ? names : ["Uncategorized"]);
      }
    }

    type Row = { category: string; qty: number; total: number };
    const map = new Map<string, Row>();

    for (const o of orders || []) {
      for (const li of o?.line_items || []) {
        const pid = Number(li?.product_id || 0);
        const cats = (pid && catMap.get(pid)) || ["Uncategorized"];

        for (const c of cats) {
          const key = c || "Uncategorized";
          const r = map.get(key) || { category: key, qty: 0, total: 0 };

          r.qty += Number(li?.quantity || 0);
          r.total += Number.parseFloat(String(li?.total || "0")) || 0;

          map.set(key, r);
        }
      }
    }

    const rows = Array.from(map.values()).sort((a, b) => b.total - a.total);

    const totalsQty = rows.reduce((n, r) => n + r.qty, 0);
    const totalsTotal = Number(rows.reduce((n, r) => n + r.total, 0).toFixed(2));

    return NextResponse.json({
      range: { date_from, date_to, status },
      rows,
      totals: { qty: totalsQty, total: totalsTotal },
    });
  } catch (e: any) {
    const msg = extractWooError(e, "Failed to build sales-by-category report");
    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}