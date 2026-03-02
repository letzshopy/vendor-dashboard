// src/app/api/reports/stock/[type]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

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

export async function GET(req: NextRequest, context: RouteContext) {
  const { type } = await context.params; // type is string here
  const per = 100;

  // Runtime guard – only allow the three known values
  if (!["low", "out", "most"].includes(type)) {
    return NextResponse.json(
      { error: "Invalid stock report type" },
      { status: 400 }
    );
  }

  // Pull products (first few pages is fine for vendor dashboard)
  const first = await woo.get("/products", {
    params: { per_page: per, page: 1, status: "publish" },
  });

  let prods: any[] = first.data || [];
  const totalPages = Math.min(
    parseInt(first.headers["x-wp-totalpages"] || "1", 10),
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
        prods.push(...(r.value.data || []));
      }
    }
  }

  // Normalize stock qty
  const rows: StockRow[] = prods.map((p: any) => ({
    id: p.id,
    name: p.name,
    parent: p.parent_id || null,
    stock_status: p.stock_status || "instock",
    stock_quantity: Number.isFinite(p.stock_quantity)
      ? Number(p.stock_quantity)
      : null,
  }));

  let filtered: StockRow[] = rows;

  if (type === "low") {
    filtered = rows
      .filter(
        (r: StockRow) =>
          r.stock_status === "instock" && (r.stock_quantity ?? 0) > 0
      )
      .sort(
        (a: StockRow, b: StockRow) =>
          (a.stock_quantity ?? Infinity) - (b.stock_quantity ?? Infinity)
      );
  } else if (type === "out") {
    filtered = rows.filter(
      (r: StockRow) => r.stock_status === "outofstock"
    );
  } else {
    // "most" → most stocked
    filtered = rows
      .filter((r: StockRow) => (r.stock_quantity ?? -1) >= 0)
      .sort(
        (a: StockRow, b: StockRow) =>
          (b.stock_quantity ?? -1) - (a.stock_quantity ?? -1)
      );
  }

  return NextResponse.json({ type, items: filtered });
}
