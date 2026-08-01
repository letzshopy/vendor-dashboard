import {
  getWooClient,
} from "@/lib/woo";

import {
  isRecord,
  parseProductId,
  privateJson,
  productErrorResponse,
  readJsonObject,
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

function parseCloneCount(
  value: unknown
): number {
  const count = Number(value);

  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count > 50
  ) {
    throw new RangeError(
      "Clone count must be between 1 and 50"
    );
  }

  return count;
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const {
      id,
    } = await context.params;

    const sourceId =
      parseProductId(id);

    const body =
      await readJsonObject(request);

    const count =
      parseCloneCount(
        body.count ?? 1
      );

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

    const createdIds: number[] = [];
    const createdSkus: string[] = [];

    for (
      let cloneIndex = 0;
      cloneIndex < count;
      cloneIndex += 1
    ) {
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
              keepImages: false,
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
          "Unable to create a clone with a unique SKU"
        );
      }

      createdIds.push(createdId);
      createdSkus.push(allocatedSku);

      if (
        sourceVariations.length > 0
      ) {
        await createVariationCopies(
          woo,
          createdId,
          sourceVariations,
          false
        );
      }
    }

    return privateJson({
      ok: true,
      createdIds,
      createdSkus,
    });
  } catch (error: unknown) {
    return productErrorResponse(
      error,
      "Bulk product cloning failed"
    );
  }
}