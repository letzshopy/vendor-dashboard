import { NextRequest } from "next/server";

import { fetchOrdersRange } from "@/lib/fetch-orders-range";
import {
  privateReportJson,
  records,
  reportErrorResponse,
  reportRange,
  safeNumber,
  safeText,
} from "@/lib/reportPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type DayTotals = {
  orders: number;
  items: number;
  gross: number;
  shipping: number;
  refunds: number;
  coupons: number;
};

export async function GET(request: NextRequest) {
  try {
    const range = reportRange(request.nextUrl.searchParams);
    const orders = await fetchOrdersRange(range);
    const byDay = new Map<string, DayTotals>();

    for (const order of orders) {
      const rawDate = safeText(order.date_created_gmt || order.date_created, 40);
      const day = /^\d{4}-\d{2}-\d{2}/.test(rawDate) ? rawDate.slice(0, 10) : "unknown";
      const totals = byDay.get(day) || {
        orders: 0,
        items: 0,
        gross: 0,
        shipping: 0,
        refunds: 0,
        coupons: 0,
      };

      totals.orders += 1;
      totals.items += records(order.line_items).reduce(
        (sum, item) => sum + Math.max(0, safeNumber(item.quantity)),
        0,
      );
      totals.gross += safeNumber(order.total);
      totals.shipping += safeNumber(order.shipping_total);
      totals.refunds += safeNumber(order.refund_total);

      for (const fee of records(order.fee_lines)) {
        if (safeText(fee.name, 200).toLowerCase().includes("coupon")) {
          totals.coupons += Math.abs(safeNumber(fee.total));
        }
      }
      byDay.set(day, totals);
    }

    const rows = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, totals]) => ({ date, ...totals }));

    return privateReportJson({
      range,
      totals: {
        gross: rows.reduce((sum, row) => sum + row.gross, 0),
        orders: rows.reduce((sum, row) => sum + row.orders, 0),
        items: rows.reduce((sum, row) => sum + row.items, 0),
        shipping: rows.reduce((sum, row) => sum + row.shipping, 0),
        refunds: rows.reduce((sum, row) => sum + row.refunds, 0),
        coupons: rows.reduce((sum, row) => sum + row.coupons, 0),
      },
      rows,
    });
  } catch (error: unknown) {
    return reportErrorResponse(error, "Failed to build sales-by-date report");
  }
}
