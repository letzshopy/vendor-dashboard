import { getWooClient } from "@/lib/woo";
import {
  parseProductId,
  privateJson,
  productErrorResponse,
  productSummary,
} from "@/lib/productPolicy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = parseProductId(id);
    const woo = await getWooClient();
    const response = await woo.delete(`/products/${productId}`, {
      params: { force: true },
    });

    return privateJson({
      ok: true,
      deleted: productId,
      product: productSummary(response.data),
    });
  } catch (error: unknown) {
    return productErrorResponse(error, "Permanent product deletion failed");
  }
}
