import {
  getWooClient,
} from "@/lib/woo";

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

import {
  isDuplicateSkuError,
  openSkuSequence,
  takeNextAvailableSku,
} from "@/lib/productSkuPolicy";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_CREATE_ATTEMPTS = 25;

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const {
      id,
    } = await context.params;

    const sourceId =
      parseProductId(id);

    const woo = await getWooClient();

    const sourceResponse =
      await woo.get(
        `/products/${sourceId}`
      );

    const source =
      sourceResponse.data;

    if (!isRecord(source)) {
      throw new Error(
        "WooCommerce returned an invalid source product"
      );
    }

    const sourceVariations =
      source.type === "variable"
        ? await getAllVariations(
            woo,
            sourceId
          )
        : [];

    const skuCursor =
      await openSkuSequence(
        woo,
        {
          sourceSku: source.sku,
        }
      );

    let createdData: unknown = null;
    let allocatedSku = "";

    for (
      let attempt = 0;
      attempt < MAX_CREATE_ATTEMPTS;
      attempt += 1
    ) {
      allocatedSku =
        await takeNextAvailableSku(
          woo,
          skuCursor
        );

      const parentPayload =
        buildCloneParent(
          source,
          {
            sku: allocatedSku,
            keepImages: true,
          }
        );

      try {
        const createdResponse =
          await woo.post(
            "/products",
            parentPayload
          );

        createdData =
          createdResponse.data;

        break;
      } catch (error: unknown) {
        if (
          isDuplicateSkuError(error)
        ) {
          continue;
        }

        throw error;
      }
    }

    const createdId =
      isRecord(createdData)
        ? Number(createdData.id)
        : 0;

    if (
      !Number.isSafeInteger(createdId) ||
      createdId <= 0
    ) {
      throw new Error(
        "Unable to create a duplicate with a unique SKU"
      );
    }

    if (
      sourceVariations.length > 0
    ) {
      await createVariationCopies(
        woo,
        createdId,
        sourceVariations,
        true
      );
    }

    return privateJson({
      ok: true,
      newId: createdId,
      sku: allocatedSku,
    });
  } catch (error: unknown) {
    return productErrorResponse(
      error,
      "Product duplication failed"
    );
  }
}