// src/lib/fetch-orders-range.ts
import { woo } from "@/lib/woo";

export async function fetchOrdersRange(params: {
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  status?: string;    // optional
  maxPages?: number;  // default 20
}) {
  const { date_from, date_to, status, maxPages = 20 } = params;
  const per = 100;
  const baseParams: any = { per_page: per, page: 1, orderby: "date", order: "desc" };
  if (status && status !== "all") baseParams.status = status;
  if (date_from) baseParams.after = `${date_from}T00:00:00`;
  if (date_to) baseParams.before = `${date_to}T23:59:59`;

  const first = await woo.get("/orders", { params: baseParams });
  let orders: any[] = first.data || [];
  const totalPages = Math.min(parseInt(first.headers["x-wp-totalpages"] || "1", 10), maxPages);

  const promises: Promise<any>[] = [];
  for (let p = 2; p <= totalPages; p++) {
    promises.push(woo.get("/orders", { params: { ...baseParams, page: p } }));
  }
  if (promises.length) {
    const rs = await Promise.allSettled(promises);
    for (const r of rs) if (r.status === "fulfilled") orders.push(...(r.value.data || []));
  }
  return orders;
}
