import { getWooClient } from "@/lib/woo";
import {
  isRecord,
  parseProductId,
  privateJson,
  productErrorResponse,
} from "@/lib/productPolicy";
import {
  buildCloneParent,
  createVariationCopies,
  getAllVariations,
} from "@/lib/productOperationsPolicy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const sourceId = parseProductId(id);
    const woo = await getWooClient();
    const sourceResponse = await woo.get(`/products/${sourceId}`);
    const source = sourceResponse.data;
    const sourceType = isRecord(source) ? source.type : null;
    const sourceVariations = sourceType === "variable"
      ? await getAllVariations(woo, sourceId)
      : [];
    const parentPayload = buildCloneParent(source, {
      sku: "",
      keepImages: true,
    });
    const createdResponse = await woo.post("/products", parentPayload);
    const createdId = isRecord(createdResponse.data)
      ? Number(createdResponse.data.id)
      : 0;

    if (!Number.isSafeInteger(createdId) || createdId <= 0) {
      throw new Error("WooCommerce returned an invalid cloned product");
    }

    if (sourceVariations.length > 0) {
      await createVariationCopies(woo, createdId, sourceVariations, true);
    }

    return privateJson({ ok: true, newId: createdId });
  } catch (error: unknown) {
    return productErrorResponse(error, "Product duplication failed");
  }
}
