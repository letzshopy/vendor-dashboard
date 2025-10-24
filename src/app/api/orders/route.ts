// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";
import { WCOrder } from "@/lib/order-utils";

/* ---------------- helpers ---------------- */
const norm = (s?: string) => (s || "").trim().toLowerCase();

// map many possible status spellings to one canonical key
const STATUS_CANON: Record<string, "pending" | "processing" | "on-hold" | "completed" | "cancelled" | "refunded" | "failed" | "trash"> = {
  pending: "pending",
  "wc-pending": "pending",

  processing: "processing",
  "wc-processing": "processing",

  "on-hold": "on-hold",
  "on hold": "on-hold",
  on_hold: "on-hold",
  "wc-on-hold": "on-hold",

  completed: "completed",
  complete: "completed",
  "wc-completed": "completed",

  cancelled: "cancelled",
  canceled: "cancelled",
  "wc-cancelled": "cancelled",

  refunded: "refunded",
  "wc-refunded": "refunded",

  failed: "failed",
  "wc-failed": "failed",

  trash: "trash",
  trashed: "trash",
  "wc-trash": "trash",
};

function canonStatus(s?: string) {
  const n = norm(s).replace(/[^a-z-]/g, ""); // strip spaces/underscores/numbers
  return STATUS_CANON[n] || (n as any);
}

function dayStartISO(d: string) {
  const dt = new Date(d + "T00:00:00");
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString();
}
function dayEndISO(d: string) {
  const dt = new Date(d + "T23:59:59");
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString();
}
function inDateRange(gmt?: string, fromISO?: string, toISO?: string) {
  if (!gmt) return true;
  const t = Date.parse(gmt + "Z");
  if (fromISO && t < Date.parse(fromISO)) return false;
  if (toISO && t > Date.parse(toISO)) return false;
  return true;
}

async function fetchManyFromWoo(paramsBase: Record<string, string | number>): Promise<WCOrder[]> {
  const MAX_WOO_PAGES = 5; // up to 500 latest orders
  const PER = 100;
  const out: WCOrder[] = [];
  for (let p = 1; p <= MAX_WOO_PAGES; p++) {
    const params = { ...paramsBase, per_page: PER, page: p };
    const { data } = await woo.get<WCOrder[]>("/orders", params);
    out.push(...data);
    if (data.length < PER) break;
  }
  return out;
}

/* ---------------- route ---------------- */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const per_page = Math.max(1, Math.min(100, Number(searchParams.get("per_page") || 20)));

  // two modes (like Products)
  const s = (searchParams.get("s") || "").trim(); // search-only
  const statusParam = (searchParams.get("status") || "all").trim(); // filter-only
  const date_from = searchParams.get("date_from") || "";
  const date_to = searchParams.get("date_to") || "";

  const afterISO = date_from ? dayStartISO(date_from) : undefined;
  const beforeISO = date_to ? dayEndISO(date_to) : undefined;

  // Woo hints (we filter locally anyway)
  const hints: Record<string, string | number> = { orderby: "date", order: "desc" };
  if (afterISO) hints.after = afterISO;
  if (beforeISO) hints.before = beforeISO;
  if (s) hints.search = s;

  try {
    const raw = await fetchManyFromWoo(hints);

    let filtered: WCOrder[];

    if (s) {
      // SEARCH MODE: order id/number, name, email, phone, SKU, product title
      const q = norm(s);
      filtered = raw.filter((o) => {
        const idStr = String(o.id || "");
        const number = String(o.number || idStr);
        const name = `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`;
        const email = o.billing?.email || "";
        const phone = o.billing?.phone || "";

        const hit =
          norm(idStr) === q ||
          norm(number).includes(q) ||
          norm(name).includes(q) ||
          norm(email).includes(q) ||
          norm(phone).includes(q) ||
          (o.line_items || []).some((li) => norm(li.sku).includes(q) || norm(li.name).includes(q));

        if (!hit) return false;
        // Date range still respected in search mode if provided via hints
        if (!inDateRange(o.date_created_gmt, afterISO, beforeISO)) return false;
        return true;
      });
    } else {
      // FILTER MODE: status + date range
      const want = canonStatus(statusParam);
      filtered = raw.filter((o) => {
        if (want && want !== "all" && canonStatus(o.status) !== want) return false;
        if (!inDateRange(o.date_created_gmt, afterISO, beforeISO)) return false;
        return true;
      });
    }

    // paginate the filtered list
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / per_page));
    const start = (page - 1) * per_page;
    const end = start + per_page;
    const data = filtered.slice(start, end);

    return NextResponse.json({ data, page, per_page, total, totalPages });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to fetch orders" }, { status: 500 });
  }
}

/* ------------- bulk actions unchanged ------------- */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ids: number[] = body?.ids || [];
  const action: string = body?.action;

  if (!ids.length || !action) {
    return NextResponse.json({ error: "ids[] and action are required" }, { status: 400 });
  }

  try {
    if (action === "trash") {
      const results = [];
      for (const id of ids) {
        const { data } = await woo.delete(`/orders/${id}`); // soft delete
        results.push(data);
      }
      return NextResponse.json({ ok: true, results });
    }

    if (action === "status") {
      const newStatus: string = body?.status;
      if (!newStatus) return NextResponse.json({ error: "status is required" }, { status: 400 });
      const results = [];
      for (const id of ids) {
        const { data } = await woo.put(`/orders/${id}`, { status: newStatus });
        results.push(data);
      }
      return NextResponse.json({ ok: true, results });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Bulk action failed" }, { status: 500 });
  }
}
