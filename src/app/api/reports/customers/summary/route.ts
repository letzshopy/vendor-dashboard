// src/app/api/reports/customers/summary/route.ts
import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

export const dynamic = "force-dynamic";

function headerTotal(h: any) {
  const v = h?.["x-wp-total"] ?? h?.["X-WP-Total"];
  const n = parseInt(String(v || "0"), 10);
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  const woo = await getWooClient();

  // 1) Registered users (Woo /customers)
  let registered = 0;
  try {
    const res = await woo.get("/customers", { params: { per_page: 1, page: 1 } });
    registered = headerTotal(res.headers);
  } catch {
    registered = 0;
  }

  // 2) Orders scan to compute guest count accurately
  // guestOrders = totalOrders - ordersWithRegisteredUser(customer_id > 0)
  let totalOrders = 0;
  let withUser = 0;

  const PER_PAGE = 100;
  const MAX_PAGES = 200; // safety cap (200*100 = 20k orders max scanned)

  try {
    const first = await woo.get("/orders", {
      params: {
        per_page: PER_PAGE,
        page: 1,
        // Optional future optimization:
        // after: "2025-01-01T00:00:00", // ISO string
      },
    });

    totalOrders = headerTotal(first.headers);

    const firstRows = Array.isArray(first.data) ? first.data : [];
    withUser += firstRows.filter((o: any) => Number(o?.customer_id || 0) > 0).length;

    // If there are more pages, continue scanning (accurate)
    let page = 2;
    while (page <= MAX_PAGES && firstRows.length === PER_PAGE) {
      const res = await woo.get("/orders", {
        params: { per_page: PER_PAGE, page },
      });

      const rows = Array.isArray(res.data) ? res.data : [];
      if (rows.length === 0) break;

      withUser += rows.filter((o: any) => Number(o?.customer_id || 0) > 0).length;

      if (rows.length < PER_PAGE) break;
      page++;
    }
  } catch (e: any) {
    // If orders fail, still return registered safely
    return NextResponse.json({
      registered,
      guest: 0,
      totalOrders: 0,
      error:
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to load orders",
    });
  }

  const guest = Math.max(0, totalOrders - withUser);

  return NextResponse.json({ registered, guest, totalOrders });
}