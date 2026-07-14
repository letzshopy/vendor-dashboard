import { getWooClient } from "@/lib/woo";
import {
  parseProductId,
  privateJson,
  productErrorResponse,
  readJsonObject,
} from "@/lib/productPolicy";
import {
  getAllVariations,
  normalizeVariationList,
  variationSummary,
} from "@/lib/productOperationsPolicy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = parseProductId(id);
    const woo = await getWooClient();
    const variations = (await getAllVariations(woo, productId))
      .map(variationSummary)
      .filter((item) => item !== null);

    return privateJson({ variations });
  } catch (error: unknown) {
    return productErrorResponse(error, "Failed to load product variations");
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = parseProductId(id);
    const body = await readJsonObject(request);
    const items = normalizeVariationList(body.variations, 100);
    const update = items.filter((item) => "id" in item);
    const create = items.filter((item) => !("id" in item));
    const woo = await getWooClient();
    const response = await woo.post(`/products/${productId}/variations/batch`, {
      ...(update.length ? { update } : {}),
      ...(create.length ? { create } : {}),
    });
    const data = response.data && typeof response.data === "object"
      ? response.data as { update?: unknown; create?: unknown }
      : {};
    const results = [
      ...(Array.isArray(data.update) ? data.update : []),
      ...(Array.isArray(data.create) ? data.create : []),
    ].map(variationSummary).filter((item) => item !== null);

    return privateJson({ variations: results });
  } catch (error: unknown) {
    return productErrorResponse(error, "Failed to save product variations");
  }
}
