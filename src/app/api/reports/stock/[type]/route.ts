// src/app/api/reports/stock/[type]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

export const dynamic = "force-dynamic";

// Match Next 15 expected shape: params is a Promise<{ type: string }>
type RouteContext = {
  params: Promise<{ type: string }>;
};

type StockRow = {
  id: number;
  name: string;
  parent: number | null;
  stock_status: string;
  stock_quantity: number | null;
};

function toInt(v: any, fallback = 0) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toNumOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function extractWooError(e: any, fallback: string) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    fallback
  );
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();

    const { type: rawType } = await context.params;
    const type = String(rawType || "").toLowerCase();

    // Runtime guard – only allow the three known values
    if (!["low", "out", "most"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid stock report type" },
        { status: 400 }
      );
    }

    const per = 100;

    // Pull products (first few pages is fine for vendor dashboard)
    const first = await woo.get("/products", {
      params: { per_page: per, page: 1, status: "publish" },
    });

    let prods: any[] = Array.isArray(first.data) ? first.data : [];

    const totalPages = Math.min(
      toInt(first.headers?.["x-wp-totalpages"] ?? first.headers?.["X-WP-TotalPages"] ?? "1", 1),
      5
    );

    const ps: Promise<any>[] = [];
    for (let p = 2; p <= totalPages; p++) {
      ps.push(
        woo.get("/products", {
          params: { per_page: per, page: p, status: "publish" },
        })
      );
    }

    if (ps.length) {
      const rs = await Promise.allSettled(ps);
      for (const r of rs) {
        if (r.status === "fulfilled") {
          const rows = Array.isArray(r.value?.data) ? r.value.data : [];
          prods.push(...rows);
        }
      }
    }

    // Optional: if you DON'T want variations here, uncomment this:
    // prods = prods.filter((p: any) => String(p?.type || "") !== "variation");

    const rows: StockRow[] = prods.map((p: any) => ({
      id: Number(p?.id || 0),
      name: String(p?.name || ""),
      parent: p?.parent_id ? Number(p.parent_id) : null,
      stock_status: String(p?.stock_status || "instock"),
      stock_quantity: toNumOrNull(p?.stock_quantity),
    }));

    let filtered: StockRow[] = rows;

    if (type === "low") {
      filtered = rows
        .filter(
          (r) => r.stock_status === "instock" && (r.stock_quantity ?? 0) > 0
        )
        .sort((a, b) => (a.stock_quantity ?? Infinity) - (b.stock_quantity ?? Infinity));
    } else if (type === "out") {
      filtered = rows.filter((r) => r.stock_status === "outofstock");
    } else {
      // "most" → most stocked
      filtered = rows
        .filter((r) => (r.stock_quantity ?? -1) >= 0)
        .sort((a, b) => (b.stock_quantity ?? -1) - (a.stock_quantity ?? -1));
    }

    return NextResponse.json({ type, items: filtered });
  } catch (e: any) {
    const msg = extractWooError(e, "Failed to load stock report");
    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}