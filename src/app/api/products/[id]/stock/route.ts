import { getWooClient } from "@/lib/woo";
import {
  type JsonRecord,
  normalizeProductUpdate,
  parseProductId,
  privateJson,
  productErrorResponse,
  productSummary,
  readJsonObject,
} from "@/lib/productPolicy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const STOCK_FIELDS = ["manage_stock", "stock_quantity", "stock_status"] as const;

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = parseProductId(id);
    const body = await readJsonObject(request);
    const stockInput: JsonRecord = {};

    for (const field of STOCK_FIELDS) {
      if (field in body) stockInput[field] = body[field];
    }

    if (Object.keys(stockInput).length === 0) {
      throw new TypeError("No valid stock fields provided");
    }

    const payload = normalizeProductUpdate(stockInput);
    const woo = await getWooClient();
    const response = await woo.put(`/products/${productId}`, payload);
    const product = productSummary(response.data);

    if (!product) throw new Error("WooCommerce returned an invalid product response");

    return privateJson({ ok: true, product });
  } catch (error: unknown) {
    return productErrorResponse(error, "Stock update failed");
  }
}
