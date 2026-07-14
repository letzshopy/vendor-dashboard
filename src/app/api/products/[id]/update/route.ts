import { getWooClient } from "@/lib/woo";
import {
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

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = parseProductId(id);
    const body = await readJsonObject(request);
    const payload = normalizeProductUpdate(body);
    const woo = await getWooClient();
    const response = await woo.put(`/products/${productId}`, payload);
    const product = productSummary(response.data);

    if (!product) {
      throw new Error("WooCommerce returned an invalid product response");
    }

    return privateJson({ ok: true, product });
  } catch (error: unknown) {
    return productErrorResponse(error, "Product update failed");
  }
}
