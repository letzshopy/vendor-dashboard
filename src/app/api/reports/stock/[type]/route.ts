import { NextRequest } from "next/server";

import {
  privateReportJson,
  records,
  reportErrorResponse,
  responsePages,
  safeId,
  safeNumber,
  safeText,
} from "@/lib/reportPolicy";
import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function stockQuantity(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const quantity = safeNumber(value);
  return Number.isFinite(quantity) ? quantity : null;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { type: rawType } = await params;
    const type = String(rawType || "").toLowerCase();
    if (!(["low", "out", "most"] as string[]).includes(type)) {
      throw new TypeError("Invalid stock report type");
    }

    const woo = await getWooClient();
    const first = await woo.get("/products", {
      params: {
        per_page: 100,
        page: 1,
        status: "publish",
        _fields: "id,name,parent_id,stock_status,stock_quantity",
      },
    });
    const products = records(first.data);
    const totalPages = responsePages(first.headers, 5);

    if (totalPages > 1) {
      const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          woo.get("/products", {
            params: {
              per_page: 100,
              page: index + 2,
              status: "publish",
              _fields: "id,name,parent_id,stock_status,stock_quantity",
            },
          }),
        ),
      );
      for (const response of remaining) products.push(...records(response.data));
    }

    const rows: StockRow[] = products.flatMap((product) => {
      const id = safeId(product.id);
      if (!id) return [];
      const parentId = safeId(product.parent_id);

      return [{
        id,
        name: safeText(product.name, 300),
        parent: parentId || null,
        stock_status: safeText(product.stock_status, 40) || "instock",
        stock_quantity: stockQuantity(product.stock_quantity),
      }];
    });

    let items: StockRow[];
    if (type === "low") {
      items = rows
        .filter((row) => row.stock_status === "instock" && (row.stock_quantity ?? 0) > 0)
        .sort((a, b) => (a.stock_quantity ?? Infinity) - (b.stock_quantity ?? Infinity));
    } else if (type === "out") {
      items = rows.filter((row) => row.stock_status === "outofstock");
    } else {
      items = rows
        .filter((row) => (row.stock_quantity ?? -1) >= 0)
        .sort((a, b) => (b.stock_quantity ?? -1) - (a.stock_quantity ?? -1));
    }

    return privateReportJson({ type, items });
  } catch (error: unknown) {
    return reportErrorResponse(error, "Failed to load stock report");
  }
}
