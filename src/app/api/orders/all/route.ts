// src/app/api/orders/all/route.ts
import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";
import { WCOrder } from "@/lib/order-utils";

export const dynamic = "force-dynamic";

/**
 * Fetch all orders by paging WooCommerce (per_page max 100).
 * Bounded by MAX_PAGES as a safety cap.
 */
async function fetchMany(): Promise<WCOrder[]> {
  const PER_PAGE = 100;      // Woo max per request
  const MAX_PAGES = 50;      // safety cap (up to 5,000 orders)
  const out: WCOrder[] = [];

  let page = 1;
  while (page <= MAX_PAGES) {
    const { data } = await woo.get<WCOrder[]>("/orders", {
      params: {
        per_page: PER_PAGE,
        page,
        order: "desc",
        orderby: "date",
        status: "any",
      },
    });

    if (!Array.isArray(data) || data.length === 0) break;

    out.push(...data);

    if (data.length < PER_PAGE) break; // last page reached
    page += 1;
  }

  return out;
}

export async function GET() {
  try {
    const data = await fetchMany();
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    const msg = e?.response?.data || e?.message || "Failed to load orders";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
