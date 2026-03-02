// src/app/api/export/orders/route.ts
import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

// ---------- small helpers ----------
const q = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;

const ALLOWED_STATUSES = new Set([
  "pending", "processing", "on-hold",
  "completed", "cancelled", "refunded", "failed",
]);

function normStatus(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  if (s === "all" || s === "any") return undefined;
  return ALLOWED_STATUSES.has(s) ? s : undefined;
}

function presetRange(preset?: string): { from?: string; to?: string } {
  const today = new Date();
  const d0 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch ((preset || "").toLowerCase()) {
    case "today": {
      const from = fmt(d0), to = fmt(d0);
      return { from, to };
    }
    case "yesterday": {
      const y = new Date(d0); y.setUTCDate(y.getUTCDate() - 1);
      const from = fmt(y), to = fmt(y);
      return { from, to };
    }
    case "this_week": {
      const start = new Date(d0);
      const dow = start.getUTCDay() || 7; // Monday start
      start.setUTCDate(start.getUTCDate() - (dow - 1));
      const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
      return { from: fmt(start), to: fmt(end) };
    }
    case "this_month": {
      const start = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1));
      const end = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 0));
      return { from: fmt(start), to: fmt(end) };
    }
    case "last_month": {
      const start = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 0));
      return { from: fmt(start), to: fmt(end) };
    }
    default:
      return {};
  }
}

function within(date_gmt?: string, from?: string, to?: string) {
  if (!from && !to) return true;
  if (!date_gmt) return false;
  const t = Date.parse(date_gmt + "Z");
  if (from) {
    const tf = Date.parse(from + "T00:00:00Z");
    if (t < tf) return false;
  }
  if (to) {
    const tt = Date.parse(to + "T23:59:59Z");
    if (t > tt) return false;
  }
  return true;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// product_id -> set(category_id)
async function fetchProductCategoryMap(productIds: number[]): Promise<Map<number, Set<number>>> {
  const map = new Map<number, Set<number>>();
  const dedup = Array.from(new Set(productIds.filter((n) => Number.isFinite(n))));
  if (dedup.length === 0) return map;

  for (const ids of chunk(dedup, 100)) {
    const { data } = await woo.get("/products", {
      params: {
        include: ids.join(","),
        per_page: Math.min(ids.length, 100),
        status: "any",
        orderby: "id",
        order: "asc",
      },
    });
    if (Array.isArray(data)) {
      for (const p of data) {
        const pid = Number(p?.id);
        const cats: any[] = Array.isArray(p?.categories) ? p.categories : [];
        map.set(pid, new Set<number>(cats.map((c: any) => Number(c?.id)).filter(Number.isFinite)));
      }
    }
  }
  return map;
}

// ---------- route ----------
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const statusRaw = url.searchParams.get("status") || undefined;
    const preset = url.searchParams.get("preset") || undefined;
    const fromQ = url.searchParams.get("from") || undefined;
    const toQ = url.searchParams.get("to") || undefined;
    const catRaw = url.searchParams.get("category") || ""; // category id

    const status = normStatus(statusRaw);
    const { from: pFrom, to: pTo } = presetRange(preset);
    const from = fromQ ?? pFrom;
    const to = toQ ?? pTo;

    // 1) fetch orders
    const PER = 100;
    const MAX_PAGES = 50;
    const orders: any[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data } = await woo.get("/orders", {
        params: {
          per_page: PER,
          page,
          orderby: "date",
          order: "desc",
          status: status ?? "any",
        },
      });
      if (!Array.isArray(data) || data.length === 0) break;
      orders.push(...data);
      if (data.length < PER) break;
    }

    // 2) date filter
    let rows = orders.filter((o) => within(o.date_created_gmt, from, to));

    // 3) category filter (by product's categories)
    const catId = Number(catRaw);
    if (Number.isFinite(catId) && catId > 0) {
      const productIds: number[] = [];
      for (const o of rows) {
        for (const li of o?.line_items || []) {
          const pid = Number(li?.product_id);
          if (Number.isFinite(pid)) productIds.push(pid);
        }
      }
      const prodCatMap = await fetchProductCategoryMap(productIds);
      rows = rows.filter((o) =>
        (o?.line_items || []).some((li: any) => {
          const pid = Number(li?.product_id);
          const set = prodCatMap.get(pid);
          return set ? set.has(catId) : false;
        })
      );
    }

    // 4) CSV headers exactly as requested
    const headers = [
      "id",
      "number",
      "date",
      "status",
      "payment_method",
      "payment_title",
      "currency",
      "total",
      "customer_name",
      "customer_email",
      "customer_phone",
      "billing_address_1",
      "billing_city",
      "billing_state",
      "billing_postcode",
      "billing_country",
      "shipping_address_1",
      "shipping_city",
      "shipping_state",
      "shipping_postcode",
      "shipping_country",
      "items",
    ];

    const lines: string[] = [headers.join(",")];

    for (const o of rows) {
      const itemsStr = (o?.line_items || [])
        .map((li: any) => `${li?.name || ""} x ${li?.quantity ?? ""}`)
        .join("; ");

      const line = [
        String(o?.id ?? ""),
        String(o?.number ?? o?.id ?? ""),
        String(o?.date_created ?? "").slice(0, 19),
        String(o?.status ?? ""),
        String(o?.payment_method ?? ""),
        String(o?.payment_method_title ?? ""),
        String(o?.currency ?? ""),
        String(o?.total ?? ""),
        `${o?.billing?.first_name || ""} ${o?.billing?.last_name || ""}`.trim(),
        String(o?.billing?.email ?? ""),
        String(o?.billing?.phone ?? ""),
        String(o?.billing?.address_1 ?? ""),
        String(o?.billing?.city ?? ""),
        String(o?.billing?.state ?? ""),
        String(o?.billing?.postcode ?? ""),
        String(o?.billing?.country ?? ""),
        String(o?.shipping?.address_1 ?? ""),
        String(o?.shipping?.city ?? ""),
        String(o?.shipping?.state ?? ""),
        String(o?.shipping?.postcode ?? ""),
        String(o?.shipping?.country ?? ""),
        itemsStr,
      ].map(q).join(",");

      lines.push(line);
    }

    const csv = lines.join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="orders-export.csv"',
      },
    });
  } catch (err: any) {
    const msg = err?.response?.data || err?.message || "Export failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
