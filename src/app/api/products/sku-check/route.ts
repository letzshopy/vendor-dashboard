import {
  getWooClient,
} from "@/lib/woo";

import {
  boundedString,
  privateJson,
  productErrorResponse,
} from "@/lib/productPolicy";

import {
  skuExists,
} from "@/lib/productSkuPolicy";

export const runtime = "nodejs";

export async function GET(
  request: Request
) {
  try {
    const {
      searchParams,
    } = new URL(request.url);

    const sku = boundedString(
      searchParams.get("sku"),
      "SKU",
      100
    );

    const woo = await getWooClient();

    const exists =
      await skuExists(woo, sku);

    return privateJson({
      exists,
    });
  } catch (error: unknown) {
    return productErrorResponse(
      error,
      "SKU availability check failed"
    );
  }
}