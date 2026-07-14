import { getWooClient } from "@/lib/woo";
import {
  parseProductIds,
  privateJson,
  productErrorResponse,
  productSummary,
  readJsonObject,
} from "@/lib/productPolicy";

type StockStatus = "instock" | "outofstock";

function parseStockStatus(value: unknown): StockStatus {
  if (value !== "instock" && value !== "outofstock") {
    throw new TypeError("Invalid stock status");
  }

  return value;
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const ids = parseProductIds(body.ids);
    const status = parseStockStatus(body.status);
    const woo = await getWooClient();
    const response = await woo.post("/products/batch", {
      update: ids.map((id) => ({
        id,
        manage_stock: false,
        stock_status: status,
      })),
    });

    const updates = response.data && typeof response.data === "object"
      ? (response.data as { update?: unknown }).update
      : null;

    const products = Array.isArray(updates)
      ? updates.map(productSummary).filter((item) => item !== null)
      : [];

    return privateJson({
      ok: true,
      requestedCount: ids.length,
      updatedCount: products.length,
      products,
    });
  } catch (error: unknown) {
    return productErrorResponse(error, "Bulk stock update failed");
  }
}
