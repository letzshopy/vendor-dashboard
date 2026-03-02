import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

// base64url decode
function b64urlDecode(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64").toString("utf8");
}

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * Resolve a "customer id" (base64url of email or "guest:<name|phone>") to:
 *  - Profile (from latest order billing/shipping)
 *  - Orders list (all orders matching email, or heuristic for guest key)
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const decoded = b64urlDecode(id || "");
  const isGuestKey = decoded.startsWith("guest:");
  const email = isGuestKey ? "" : decoded;

  // Pull a reasonable set of orders for searching
  const ORDERS_PER_PULL = 100;
  const first = await woo.get("/orders", {
    params: { per_page: ORDERS_PER_PULL, page: 1, order: "desc" },
  });

  let orders: any[] = first.data || [];
  const totalPages = parseInt(first.headers["x-wp-totalpages"] || "1", 10);

  const more: Promise<any>[] = [];
  for (let p = 2; p <= Math.min(totalPages, 20); p++) {
    more.push(
      woo.get("/orders", {
        params: { per_page: ORDERS_PER_PULL, page: p, order: "desc" },
      })
    );
  }

  if (more.length) {
    const rs = await Promise.allSettled(more);
    for (const r of rs) {
      if (r.status === "fulfilled") {
        orders.push(...(r.value.data || []));
      }
    }
  }

  // Filter orders for this customer
  let filtered = orders.filter((o) => {
    const b = o?.billing || {};
    if (email) {
      return (
        String(b.email || "").trim().toLowerCase() === email.toLowerCase()
      );
    }
    // guest key => match name OR phone (best-effort)
    const name = [b.first_name, b.last_name]
      .filter(Boolean)
      .join(" ")
      .trim()
      .toLowerCase();
    const phone = String(b.phone || "").trim().toLowerCase();
    const key = `guest:${(name || phone || "unknown").toLowerCase()}`;
    return key === decoded;
  });

  // Build profile from the most recent order
  const latest = filtered[0] || null;
  const billing = latest?.billing || {};
  const shipping = latest?.shipping || {};
  const name =
    [billing.first_name, billing.last_name].filter(Boolean).join(" ").trim() ||
    [shipping.first_name, shipping.last_name].filter(Boolean).join(" ").trim() ||
    "(guest)";

  // Totals
  let total_spent = 0;
  for (const o of filtered) {
    total_spent +=
      Number.parseFloat(String(o.total || "0")) || 0;
  }

  // Normalize orders payload for UI
  const normOrders = filtered.map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    date_created_gmt: o.date_created_gmt || o.date_created,
    total: o.total,
    payment_method_title: o.payment_method_title,
    line_items: o.line_items || [],
  }));

  return NextResponse.json({
    customer: {
      id,
      email: billing.email || "",
      first_name: billing.first_name || "",
      last_name: billing.last_name || "",
      billing,
      shipping,
      total_spent: Number(total_spent.toFixed(2)),
      date_created: filtered.length
        ? filtered[filtered.length - 1].date_created_gmt ||
          filtered[filtered.length - 1].date_created
        : null,
    },
    orders: normOrders,
    order_total: filtered.length,
  });
}
