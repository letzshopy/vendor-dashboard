import { getWooClient } from "@/lib/woo";
import {
  isRecord,
  type JsonRecord,
  normalizeProductUpdate,
  parseProductId,
  privateJson,
  productErrorResponse,
  productSummary,
  readJsonObject,
} from "@/lib/productPolicy";

const STOCK_FIELDS = ["manage_stock", "stock_quantity", "stock_status"] as const;

export async function PUT(request: Request) {
  try {
    const body = await readJsonObject(request);

    if (!Array.isArray(body.updates) || body.updates.length === 0) {
      throw new TypeError("Stock updates are required");
    }

    if (body.updates.length > 100) {
      throw new RangeError("A maximum of 100 products can be changed at once");
    }

    const updates = body.updates.map((item) => {
      if (!isRecord(item) || !isRecord(item.patch)) {
        throw new TypeError("Invalid stock update");
      }

      const id = parseProductId(item.id);
      const stockInput: JsonRecord = {};
      for (const field of STOCK_FIELDS) {
        if (field in item.patch) stockInput[field] = item.patch[field];
      }

      if (Object.keys(stockInput).length === 0) {
        throw new TypeError("No valid stock fields provided");
      }

      return { id, ...normalizeProductUpdate(stockInput) };
    });

    const woo = await getWooClient();
    const response = await woo.post("/products/batch", { update: updates });
    const responseUpdates = isRecord(response.data) && Array.isArray(response.data.update)
      ? response.data.update
      : [];
    const products = responseUpdates
      .map(productSummary)
      .filter((item) => item !== null);

    return privateJson({
      ok: true,
      requestedCount: updates.length,
      updatedCount: products.length,
      updated: products,
    });
  } catch (error: unknown) {
    return productErrorResponse(error, "Bulk stock update failed");
  }
}
