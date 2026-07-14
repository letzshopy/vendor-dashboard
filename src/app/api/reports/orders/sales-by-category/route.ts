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
import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const range = reportRange(request.nextUrl.searchParams);
    const orders = await fetchOrdersRange(range);
    const productIds = new Set<number>();

    for (const order of orders) {
      for (const item of records(order.line_items)) {
        const productId = safeId(item.product_id);
        if (productId) productIds.add(productId);
      }
    }

    const categoryNamesByProduct = new Map<number, string[]>();
    const ids = Array.from(productIds);
    const woo = await getWooClient();

    for (let index = 0; index < ids.length; index += 50) {
      const batch = ids.slice(index, index + 50);
      const response = await woo.get("/products", {
        params: {
          include: batch.join(","),
          per_page: batch.length,
          status: "any",
          _fields: "id,categories",
        },
      });

      for (const product of records(response.data)) {
        const productId = safeId(product.id);
        if (!productId) continue;
        const names = records(product.categories)
          .map((category) => safeText(category.name, 200).trim())
          .filter(Boolean);
        categoryNamesByProduct.set(productId, names.length ? names : ["Uncategorized"]);
      }
    }

    const totalsByCategory = new Map<string, { category: string; qty: number; total: number }>();

    for (const order of orders) {
      for (const item of records(order.line_items)) {
        const categories = categoryNamesByProduct.get(safeId(item.product_id)) || ["Uncategorized"];

        for (const category of categories) {
          const name = category || "Uncategorized";
          const row = totalsByCategory.get(name) || { category: name, qty: 0, total: 0 };
          row.qty += Math.max(0, safeNumber(item.quantity));
          row.total += safeNumber(item.total);
          totalsByCategory.set(name, row);
        }
      }
    }

    const rows = Array.from(totalsByCategory.values()).sort((a, b) => b.total - a.total);

    return privateReportJson({
      range,
      rows: rows.map((row) => ({ ...row, total: Number(row.total.toFixed(2)) })),
      totals: {
        qty: rows.reduce((sum, row) => sum + row.qty, 0),
        total: Number(rows.reduce((sum, row) => sum + row.total, 0).toFixed(2)),
      },
    });
  } catch (error: unknown) {
    return reportErrorResponse(error, "Failed to build sales-by-category report");
  }
}
