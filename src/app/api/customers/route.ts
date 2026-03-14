import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

/**
 * Build customers from ORDERS so guests are included.
 * - Aggregates across all orders (up to a safe cap) and groups by billing email (or "guest:<name|phone>").
 * - Supports ?search= (name/email/phone substring)
 * - Paginates customers (page/per_page) AFTER aggregation.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const per_page = Math.min(50, Math.max(1, parseInt(searchParams.get("per_page") || "20", 10)));
  const search = (searchParams.get("search") || "").trim().toLowerCase();

  // Pull orders in pages of 100, up to a cap (e.g., 2000 orders)
  const ORDERS_PER_PULL = 100;
  const MAX_ORDER_PAGES = 20; // 20 * 100 = 2000 orders max
  let orders: any[] = [];

  // First call to know total pages
  const woo = await getWooClient();
  const first = await woo.get("/orders", { params: { per_page: ORDERS_PER_PULL, page: 1, order: "desc" } });
  orders = first.data || [];
  const totalPages = Math.min(
    parseInt(first.headers["x-wp-totalpages"] || "1", 10),
    MAX_ORDER_PAGES
  );

  // Fetch remaining pages in parallel (bounded)
  const morePages = [];
  for (let p = 2; p <= totalPages; p++) {
    morePages.push(woo.get("/orders", { params: { per_page: ORDERS_PER_PULL, page: p, order: "desc" } }));
  }
  if (morePages.length) {
    const results = await Promise.allSettled(morePages);
    for (const r of results) {
      if (r.status === "fulfilled") orders.push(...(r.value.data || []));
    }
  }

  // Group orders into customers
  type Cust = {
    id: string;                  // stable string (base64url of email or guest key)
    name: string;
    email: string;
    phone: string;
    city?: string;
    state?: string;
    country?: string;
    total_spent: number;
    order_count: number;
    first_order?: string;        // ISO
    last_order?: string;         // ISO
  };

  const map = new Map<string, Cust>();

  const b64url = (s: string) =>
    Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

  for (const o of orders) {
    const b = o?.billing || {};
    const name = [b.first_name, b.last_name].filter(Boolean).join(" ").trim() || "(guest)";
    const email = String(b.email || "").trim().toLowerCase();
    const phone = String(b.phone || "").trim();
    const key = email || `guest:${(name || phone || "unknown").toLowerCase()}`;
    const id = b64url(email || key);

    const prev = map.get(key);
    const totalNum = Number.parseFloat(String(o.total || "0")) || 0;
    const dateISO = o.date_created_gmt || o.date_created || null;

    if (!prev) {
      map.set(key, {
        id,
        name,
        email,
        phone,
        city: b.city || "",
        state: b.state || "",
        country: b.country || "",
        total_spent: totalNum,
        order_count: 1,
        first_order: dateISO || undefined,
        last_order: dateISO || undefined,
      });
    } else {
      prev.total_spent += totalNum;
      prev.order_count += 1;
      if (dateISO) {
        if (!prev.first_order || dateISO < prev.first_order) prev.first_order = dateISO;
        if (!prev.last_order || dateISO > prev.last_order) prev.last_order = dateISO;
      }
    }
  }

  // To array
  let customers = Array.from(map.values());

  // Search filter
  if (search) {
    customers = customers.filter((c) =>
      c.name.toLowerCase().includes(search) ||
      c.email.toLowerCase().includes(search) ||
      c.phone.toLowerCase().includes(search)
    );
  }

  // Sort by last activity desc, then total spent desc
  customers.sort((a, b) => {
    const ad = a.last_order || "";
    const bd = b.last_order || "";
    if (ad !== bd) return bd.localeCompare(ad);
    return b.total_spent - a.total_spent;
    });

  const total = customers.length;
  const pages = Math.max(1, Math.ceil(total / per_page));
  const start = (page - 1) * per_page;
  const items = customers.slice(start, start + per_page).map((c) => ({
    ...c,
    total_spent: Number(c.total_spent.toFixed(2)),
  }));

  return NextResponse.json({ items, total, pages, page, per_page, search });
}
