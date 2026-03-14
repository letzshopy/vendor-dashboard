// src/app/api/metrics/orders/route.ts
import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type WooOrder = {
  id: number;
  number?: string;
  status: string;
  total: string;
  date_created: string;
  payment_method: string;
  billing?: {
    first_name?: string;
    last_name?: string;
  };
};

type OrdersSummary = {
  todaySales: number;
  monthSales: number;
  totalOrders: number;
  ordersLast30: number;
  pendingOnHold: number;
  statusLast30: {
    completed: number;
    processing: number;
    onHold: number;
  };
  revenueByWeek: {
    label: string;
    total: number;
  }[];
  recentOrders: {
    id: number;
    number: string;
    customer: string;
    total: number;
    status: string;
    date_created: string;
  }[];
};

function isPaidStatus(status: string): boolean {
  const s = (status || "").toLowerCase();
  return s === "completed" || s === "processing";
}

function sameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(date: Date, monthAnchor: Date): boolean {
  return (
    date.getFullYear() === monthAnchor.getFullYear() &&
    date.getMonth() === monthAnchor.getMonth()
  );
}

function parseMoney(v: any): number {
  const n = Number.parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

function toInt(v: any, fallback = 0) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function extractWooError(e: any, fallback: string) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    fallback
  );
}

/** Pull enough orders to compute last-30-day metrics accurately (safety capped). */
async function fetchOrdersForMetrics() {
  const woo = await getWooClient();

  const PER_PAGE = 100;
  const MAX_PAGES = 10; // safety cap (1000 latest orders)
  const all: WooOrder[] = [];

  // first page (also gives totals in headers)
  const first = await woo.get("/orders", {
    params: {
      per_page: PER_PAGE,
      page: 1,
      orderby: "date",
      order: "desc",
      status: "any",
    },
  });

  const totalOrders = toInt(
    first.headers?.["x-wp-total"] ?? first.headers?.["X-WP-Total"] ?? "0",
    0
  );

  const firstRows = Array.isArray(first.data) ? (first.data as WooOrder[]) : [];
  all.push(...firstRows);

  const totalPagesFromHeader = toInt(
    first.headers?.["x-wp-totalpages"] ?? first.headers?.["X-WP-TotalPages"] ?? "1",
    1
  );

  const pagesToFetch = Math.min(totalPagesFromHeader, MAX_PAGES);

  if (pagesToFetch > 1) {
    const ps: Promise<any>[] = [];
    for (let p = 2; p <= pagesToFetch; p++) {
      ps.push(
        woo.get("/orders", {
          params: {
            per_page: PER_PAGE,
            page: p,
            orderby: "date",
            order: "desc",
            status: "any",
          },
        })
      );
    }

    const rs = await Promise.allSettled(ps);
    for (const r of rs) {
      if (r.status === "fulfilled") {
        const rows = Array.isArray(r.value?.data) ? r.value.data : [];
        all.push(...(rows as WooOrder[]));
      }
    }
  }

  return { orders: all, totalOrders };
}

function computeBaseStats(orders: WooOrder[], totalOrdersFromHeader: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthAnchor = new Date(now.getFullYear(), now.getMonth(), 1);
  const last30 = new Date(today);
  last30.setDate(last30.getDate() - 29); // inclusive last 30 days

  let todaySales = 0;
  let monthSales = 0;
  let pendingOnHold = 0;

  let ordersLast30 = 0;
  let completed30 = 0;
  let processing30 = 0;
  let onHold30 = 0;

  for (const o of orders) {
    const date = new Date(o.date_created);
    const status = (o.status || "").toLowerCase();
    const total = parseMoney(o.total);

    // pending + on-hold
    if (status === "pending" || status === "on-hold") {
      pendingOnHold += 1;
    }

    if (isPaidStatus(status)) {
      if (sameDate(date, today)) todaySales += total;
      if (isSameMonth(date, monthAnchor)) monthSales += total;
    }

    if (date >= last30) {
      ordersLast30 += 1;
      if (status === "completed") completed30 += 1;
      else if (status === "processing") processing30 += 1;
      else if (status === "on-hold") onHold30 += 1;
    }
  }

  return {
    todaySales,
    monthSales,
    totalOrders: totalOrdersFromHeader || orders.length, // prefer true total from headers
    ordersLast30,
    pendingOnHold,
    statusLast30: {
      completed: completed30,
      processing: processing30,
      onHold: onHold30,
    },
  };
}

export async function GET() {
  try {
    const { orders, totalOrders } = await fetchOrdersForMetrics();

    // Base stats for top cards + status bar
    const base = computeBaseStats(orders, totalOrders);

    // Revenue by week (last 30 days, completed + processing)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last30 = new Date(today);
    last30.setDate(last30.getDate() - 29);

    const revenueBuckets = [
      { label: "Week 1", total: 0 }, // 22–29 days ago
      { label: "Week 2", total: 0 }, // 15–21
      { label: "Week 3", total: 0 }, // 8–14
      { label: "Week 4", total: 0 }, // 0–7
    ];

    const msPerDay = 24 * 60 * 60 * 1000;

    for (const o of orders) {
      const date = new Date(o.date_created);
      if (date < last30) continue;

      const status = (o.status || "").toLowerCase();
      if (!isPaidStatus(status)) continue;

      const total = parseMoney(o.total);

      const dateMidnight = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      const diffDays = Math.floor(
        (today.getTime() - dateMidnight.getTime()) / msPerDay
      );

      let index = 0;
      if (diffDays <= 6) index = 3;
      else if (diffDays <= 13) index = 2;
      else if (diffDays <= 20) index = 1;
      else index = 0;

      revenueBuckets[index].total += total;
    }

    // Recent orders (latest 5, any status)
    const sorted = [...orders].sort(
      (a, b) =>
        new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
    );

    const recentOrders = sorted.slice(0, 5).map((o) => {
      const nameParts = [o.billing?.first_name || "", o.billing?.last_name || ""].filter(Boolean);
      const customer = nameParts.join(" ") || "Customer";
      const num = (o.number || String(o.id)).toString();

      return {
        id: o.id,
        number: num.startsWith("#") ? num : `#${num}`,
        customer,
        total: parseMoney(o.total),
        status: o.status || "",
        date_created: o.date_created,
      };
    });

    const summary: OrdersSummary = {
      ...base,
      revenueByWeek: revenueBuckets.map((b) => ({
        ...b,
        total: Number(b.total.toFixed(2)),
      })),
      recentOrders,
    };

    return NextResponse.json(summary);
  } catch (e: any) {
    const msg = extractWooError(e, "Failed to load order metrics");
    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}