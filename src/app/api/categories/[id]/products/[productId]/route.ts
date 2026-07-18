import { getWooClient } from "@/lib/woo";
import {
  parseTermId,
  privateJson,
  taxonomyErrorResponse,
} from "@/lib/taxonomyPolicy";

type RouteContext = {
  params: Promise<{ id: string; productId: string }>;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id, productId } = await context.params;
    const categoryId = parseTermId(id, "Category");
    const parsedProductId = parseTermId(productId, "Product");
    const woo = await getWooClient();
    const response = await woo.get(`/products/${parsedProductId}`, {
      params: { _fields: "id,categories" },
    });

    if (!isRecord(response.data)) {
      throw new Error("WooCommerce returned an invalid product");
    }

    const categories = Array.isArray(response.data.categories)
      ? response.data.categories.flatMap((value) => {
          if (!isRecord(value)) return [];
          const termId = Number(value.id);
          return Number.isSafeInteger(termId) && termId > 0 ? [termId] : [];
        })
      : [];

    if (!categories.includes(categoryId)) {
      return privateJson({
        ok: true,
        productId: parsedProductId,
        categoryId,
        changed: false,
      });
    }

    await woo.put(`/products/${parsedProductId}`, {
      categories: categories
        .filter((termId) => termId !== categoryId)
        .map((termId) => ({ id: termId })),
    });

    return privateJson({
      ok: true,
      productId: parsedProductId,
      categoryId,
      changed: true,
    });
  } catch (error: unknown) {
    return taxonomyErrorResponse(error, "Could not remove product from category");
  }
}
