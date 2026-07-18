import { getWooClient } from "@/lib/woo";
import {
  isRecord,
  parseProductIds,
  privateJson,
  productErrorResponse,
  productSummary,
  readJsonObject,
} from "@/lib/productPolicy";

type InventoryAction = "instock" | "outofstock" | "setqty";

function parseAction(value: unknown): InventoryAction {
  if (value === "instock" || value === "outofstock" || value === "setqty") {
    return value;
  }

  throw new TypeError("Invalid inventory action");
}

function parseQuantity(value: unknown): number {
  const quantity = Number(value);

  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new TypeError("Quantity must be a non-negative whole number");
  }

  return quantity;
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const ids = parseProductIds(body.ids);
    const action = parseAction(body.action);
    const quantity = action === "setqty" ? parseQuantity(body.qty ?? 0) : null;
    const updates = ids.map((id) => {
      if (action === "setqty") {
        return { id, manage_stock: true, stock_quantity: quantity };
      }

      return { id, stock_status: action };
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
      requestedCount: ids.length,
      updatedCount: products.length,
      updated: products,
    });
  } catch (error: unknown) {
    return productErrorResponse(error, "Bulk inventory update failed");
  }
}
