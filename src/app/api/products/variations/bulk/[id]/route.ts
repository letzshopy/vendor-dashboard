import { getWooClient } from "@/lib/woo";
import {
  parseProductId,
  privateJson,
  productErrorResponse,
  readJsonObject,
} from "@/lib/productPolicy";
import {
  normalizeVariationList,
  variationSummary,
} from "@/lib/productOperationsPolicy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = parseProductId(id);
    const body = await readJsonObject(request);
    const variations = normalizeVariationList(body.variations, 100).map((item) => {
      const createPayload = { ...item };
      delete createPayload.id;
      return createPayload;
    });
    const woo = await getWooClient();
    const created: unknown[] = [];

    for (let offset = 0; offset < variations.length; offset += 50) {
      const response = await woo.post(`/products/${productId}/variations/batch`, {
        create: variations.slice(offset, offset + 50),
      });
      const responseData = response.data && typeof response.data === "object"
        ? (response.data as { create?: unknown }).create
        : null;
      if (Array.isArray(responseData)) created.push(...responseData);
    }

    const summaries = created.map(variationSummary).filter((item) => item !== null);

    return privateJson({
      ok: true,
      requestedCount: variations.length,
      createdCount: summaries.length,
      created: summaries,
    });
  } catch (error: unknown) {
    return productErrorResponse(error, "Bulk variation creation failed");
  }
}
