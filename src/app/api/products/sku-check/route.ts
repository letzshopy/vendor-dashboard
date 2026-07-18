import { getWooClient } from "@/lib/woo";
import {
  boundedString,
  privateJson,
  productErrorResponse,
} from "@/lib/productPolicy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sku = boundedString(searchParams.get("sku"), "SKU", 100);
    const woo = await getWooClient();
    const response = await woo.get("/products", {
      params: {
        per_page: 1,
        sku,
        status: "any",
        _fields: "id",
      },
    });

    const exists = Array.isArray(response.data) &&
      response.data.some((item: unknown) => {
        if (!item || typeof item !== "object") return false;
        return Number((item as { id?: unknown }).id) > 0;
      });

    return privateJson({ exists });
  } catch (error: unknown) {
    return productErrorResponse(error, "SKU availability check failed");
  }
}
