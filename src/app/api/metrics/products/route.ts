import {
  privateReportJson,
  records,
  reportErrorResponse,
  responsePages,
  safeText,
} from "@/lib/reportPolicy";
import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const woo = await getWooClient();
    const first = await woo.get("/products", {
      params: {
        per_page: 100,
        page: 1,
        status: "publish",
        _fields: "id,stock_status",
      },
    });
    const products = records(first.data);
    const totalPages = responsePages(first.headers, 20);

    if (totalPages > 1) {
      const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          woo.get("/products", {
            params: {
              per_page: 100,
              page: index + 2,
              status: "publish",
              _fields: "id,stock_status",
            },
          }),
        ),
      );
      for (const response of remaining) products.push(...records(response.data));
    }

    let inStock = 0;
    let outOfStock = 0;
    for (const product of products) {
      const status = safeText(product.stock_status, 40).toLowerCase();
      if (status === "instock") inStock += 1;
      if (status === "outofstock") outOfStock += 1;
    }

    return privateReportJson({ total: products.length, inStock, outOfStock });
  } catch (error: unknown) {
    return reportErrorResponse(error, "Failed to load product metrics");
  }
}
