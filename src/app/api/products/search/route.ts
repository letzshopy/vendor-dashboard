import { getWooClient } from "@/lib/woo";
import {
  boundedString,
  privateJson,
  productErrorResponse,
} from "@/lib/productPolicy";
import { productSearchSummary } from "@/lib/productReadPolicy";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q");

    if (!rawQuery || !rawQuery.trim()) {
      return privateJson({ results: [] });
    }

    const query = boundedString(rawQuery, "Search query", 100);
    const woo = await getWooClient();
    const commonParams = {
      per_page: 20,
      status: "any",
      _fields: "id,name,sku,price,regular_price,sale_price,images",
    };
    const [nameResult, skuResult] = await Promise.allSettled([
      woo.get("/products", { params: { ...commonParams, search: query } }),
      woo.get("/products", { params: { ...commonParams, sku: query } }),
    ]);

    if (nameResult.status === "rejected" && skuResult.status === "rejected") {
      throw nameResult.reason;
    }

    const candidates: unknown[] = [];
    if (nameResult.status === "fulfilled" && Array.isArray(nameResult.value.data)) {
      candidates.push(...nameResult.value.data);
    }
    if (skuResult.status === "fulfilled" && Array.isArray(skuResult.value.data)) {
      candidates.push(...skuResult.value.data);
    }

    const results = new Map<number, ReturnType<typeof productSearchSummary>>();

    for (const candidate of candidates) {
      const summary = productSearchSummary(candidate);
      if (summary) results.set(Number(summary.id), summary);
    }

    return privateJson({ results: Array.from(results.values()) });
  } catch (error: unknown) {
    return productErrorResponse(error, "Product search failed");
  }
}
