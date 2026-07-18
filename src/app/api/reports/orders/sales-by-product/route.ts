import { NextRequest } from "next/server";

import { fetchOrdersRange } from "@/lib/fetch-orders-range";
import {
  privateReportJson,
  records,
  reportErrorResponse,
  reportRange,
  safeId,
  safeNumber,
  safeText,
} from "@/lib/reportPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProductTotals = {
  product_id: number;
  name: string;
  sku: string;
  qty: number;
  total: number;
};

export async function GET(request: NextRequest) {
  try {
    const range = reportRange(request.nextUrl.searchParams);
    const orders = await fetchOrdersRange(range);
    const totalsByProduct = new Map<number, ProductTotals>();

    for (const order of orders) {
      for (const item of records(order.line_items)) {
        const productId = safeId(item.product_id);
        if (!productId) continue;
        const row = totalsByProduct.get(productId) || {
          product_id: productId,
          name: safeText(item.name, 300) || "(unknown)",
          sku: safeText(item.sku, 100),
          qty: 0,
          total: 0,
        };
        row.qty += Math.max(0, safeNumber(item.quantity));
        row.total += safeNumber(item.total);
        totalsByProduct.set(productId, row);
      }
    }

    const rows = Array.from(totalsByProduct.values())
      .map((row) => ({ ...row, total: Number(row.total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total);

    return privateReportJson({
      range,
      rows,
      totals: {
        qty: rows.reduce((sum, row) => sum + row.qty, 0),
        total: Number(rows.reduce((sum, row) => sum + row.total, 0).toFixed(2)),
      },
    });
  } catch (error: unknown) {
    return reportErrorResponse(error, "Failed to build sales-by-product report");
  }
}
