// src/lib/fetch-orders-range.ts
import { getWooClient } from "@/lib/woo";

type FetchOrdersRangeParams = {
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  status?: string;    // optional ("all" allowed)
  maxPages?: number;  // default 20
};

function isYMD(s?: string) {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function getHeaderInt(headers: any, key: string, fallback = 1) {
  const v =
    headers?.[key] ??
    headers?.[key.toLowerCase()] ??
    headers?.[key.toUpperCase()];
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function fetchOrdersRange(params: FetchOrdersRangeParams) {
  const woo = await getWooClient();

  const { date_from, date_to, status, maxPages = 20 } = params;

  const per = 100;
  const baseParams: any = {
    per_page: per,
    page: 1,
    orderby: "date",
    order: "desc",
  };

  if (status && status !== "all") baseParams.status = status;

  // Woo expects ISO-ish strings. Keep store timezone behavior; just validate input format.
  if (isYMD(date_from)) baseParams.after = `${date_from}T00:00:00`;
  if (isYMD(date_to)) baseParams.before = `${date_to}T23:59:59`;

  const first = await woo.get("/orders", { params: baseParams });

  let orders: any[] = Array.isArray(first.data) ? first.data : [];

  const totalPagesHeader = getHeaderInt(first.headers, "x-wp-totalpages", 1);
  const totalPages = Math.min(totalPagesHeader, Math.max(1, Number(maxPages) || 20));

  const promises: Promise<any>[] = [];
  for (let p = 2; p <= totalPages; p++) {
    promises.push(
      woo.get("/orders", { params: { ...baseParams, page: p } })
    );
  }

  if (promises.length) {
    const rs = await Promise.allSettled(promises);
    for (const r of rs) {
      if (r.status === "fulfilled") {
        const rows = Array.isArray(r.value?.data) ? r.value.data : [];
        orders.push(...rows);
      }
    }
  }

  return orders;
}