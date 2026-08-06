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

function variationDeleteIds(value: unknown): number[] {
  if (value === undefined) return [];

  if (!Array.isArray(value)) {
    throw new TypeError("Variation delete IDs must be an array");
  }

  if (value.length > 100) {
    throw new RangeError(
      "A maximum of 100 variations can be deleted at once"
    );
  }

  return Array.from(
    new Set(value.map((item) => parseProductId(item)))
  );
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const productId = parseProductId(id);
    const woo = await getWooClient();
    const variations = (
      await getAllVariations(woo, productId)
    )
      .map(variationSummary)
      .filter((item) => item !== null);

    return privateJson({ variations });
  } catch (error: unknown) {
    return productErrorResponse(
      error,
      "Failed to load product variations"
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const productId = parseProductId(id);
    const body = await readJsonObject(request);
    const deleteIds = variationDeleteIds(
      body.delete_ids
    );
    const variationValue = body.variations;
    const items =
      variationValue === undefined ||
      (Array.isArray(variationValue) &&
        variationValue.length === 0)
        ? []
        : normalizeVariationList(
            variationValue,
            100
          );

    if (
      items.length === 0 &&
      deleteIds.length === 0
    ) {
      throw new TypeError(
        "No variation changes were provided"
      );
    }

    const update = items.filter(
      (item) => "id" in item
    );
    const create = items.filter(
      (item) => !("id" in item)
    );
    const woo = await getWooClient();
    const response = await woo.post(
      `/products/${productId}/variations/batch`,
      {
        ...(update.length
          ? { update }
          : {}),
        ...(create.length
          ? { create }
          : {}),
        ...(deleteIds.length
          ? { delete: deleteIds }
          : {}),
      }
    );
    const data =
      response.data &&
      typeof response.data === "object"
        ? (response.data as {
            update?: unknown;
            create?: unknown;
            delete?: unknown;
          })
        : {};

    const results = [
      ...(Array.isArray(data.update)
        ? data.update
        : []),
      ...(Array.isArray(data.create)
        ? data.create
        : []),
    ]
      .map(variationSummary)
      .filter((item) => item !== null);

    return privateJson({
      variations: results,
      deleted_ids: deleteIds,
      deleted_count: deleteIds.length,
    });
  } catch (error: unknown) {
    return productErrorResponse(
      error,
      "Failed to save product variations"
    );
  }
}