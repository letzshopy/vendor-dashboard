// src/app/api/reports/customers/summary/route.ts
import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export const dynamic = "force-dynamic";

export async function GET() {
  // Registered users (Woo /customers)
  let registered = 0;
  try {
    const res = await woo.get("/customers", { params: { per_page: 1, page: 1 } });
    registered = parseInt(res.headers["x-wp-total"] || "0", 10);
  } catch {}

  // Guest orders: total orders - orders with a customer_id > 0
  // Get a small sample to estimate; for accuracy we can scan like we do elsewhere:
  let totalOrders = 0, withUser = 0;
  const per = 100;
  const first = await woo.get("/orders", { params: { per_page: per, page: 1 } });
  totalOrders = parseInt(first.headers["x-wp-total"] || "0", 10);
  const sample = first.data || [];
  withUser += sample.filter((o: any) => Number(o.customer_id || 0) > 0).length;
  const guest = Math.max(0, totalOrders - withUser); // rough; good enough for dashboard

  return NextResponse.json({ registered, guest, totalOrders });
}
