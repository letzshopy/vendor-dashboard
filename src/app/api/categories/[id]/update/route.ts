import { getWooClient } from "@/lib/woo";
import {
  categoryPayload,
  categorySummary,
  parseTermId,
  privateJson,
  readJsonObject,
  taxonomyErrorResponse,
} from "@/lib/taxonomyPolicy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const categoryId = parseTermId(id, "Category");
    const body = await readJsonObject(request);
    const payload = categoryPayload(body);

    if (payload.parent === categoryId) {
      throw new TypeError("A category cannot be its own parent");
    }

    const woo = await getWooClient();
    const response = await woo.put(`/products/categories/${categoryId}`, payload);
    const category = categorySummary(response.data);

    if (!category) throw new Error("WooCommerce returned an invalid category");

    return privateJson({ ok: true, category });
  } catch (error: unknown) {
    return taxonomyErrorResponse(error, "Category update failed");
  }
}
