import { getWooClient } from "@/lib/woo";
import {
  parseProductId,
  privateJson,
  productErrorResponse,
} from "@/lib/productPolicy";
import { productDetail } from "@/lib/productReadPolicy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = parseProductId(id);
    const woo = await getWooClient();
    const response = await woo.get(`/products/${productId}`);
    const product = productDetail(response.data);

    if (!product) throw new Error("WooCommerce returned an invalid product");

    return privateJson(product);
  } catch (error: unknown) {
    return productErrorResponse(error, "Failed to load product");
  }
}
