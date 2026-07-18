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

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = parseProductId(id);
    const woo = await getWooClient();
    const response = await woo.put(`/products/${productId}`, {
      status: "draft",
    });

    return privateJson({
      ok: true,
      restored: productId,
      product: productSummary(response.data),
    });
  } catch (error: unknown) {
    return productErrorResponse(error, "Product restore failed");
  }
}
