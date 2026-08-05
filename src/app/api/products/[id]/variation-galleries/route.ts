import {
  isRecord,
  parseProductId,
  privateJson,
  productErrorResponse,
  readJsonObject,
} from "@/lib/productPolicy";
import {
  fetchInternalWp,
} from "@/lib/wpClient";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizedImageIds(
  value: unknown
): number[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 20
  ) {
    throw new TypeError(
      "Each variation gallery requires between 1 and 20 images"
    );
  }

  return Array.from(
    new Set(
      value.map(parseProductId)
    )
  );
}

function normalizedGalleries(
  value: unknown
): Array<{
  variation_id: number;
  image_ids: number[];
}> {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 100
  ) {
    throw new TypeError(
      "Provide between 1 and 100 variation galleries"
    );
  }

  const seen = new Set<number>();

  return value.map((item) => {
    if (!isRecord(item)) {
      throw new TypeError(
        "Invalid variation gallery"
      );
    }

    const variationId =
      parseProductId(
        item.variation_id
      );

    if (seen.has(variationId)) {
      throw new TypeError(
        "Each variation may appear only once"
      );
    }

    seen.add(variationId);

    return {
      variation_id: variationId,
      image_ids:
        normalizedImageIds(
          item.image_ids
        ),
    };
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const productId = parseProductId(id);
    const body = await readJsonObject(
      request
    );
    const galleries =
      normalizedGalleries(
        body.galleries
      );

    const response =
      await fetchInternalWp(
        "/wp-json/letz/v1/variation-galleries",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            product_id: productId,
            galleries,
          }),
          cache: "no-store",
        },
        60_000
      );

    const json: unknown =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      const message =
        isRecord(json) &&
        typeof json.message === "string"
          ? json.message
          : "Unable to save variation galleries.";

      const status =
        response.status >= 400 &&
        response.status < 500
          ? response.status
          : 502;

      return privateJson(
        {
          ok: false,
          error: message,
        },
        status
      );
    }

    if (
      !isRecord(json) ||
      json.ok !== true ||
      !Array.isArray(json.updated)
    ) {
      throw new Error(
        "WordPress returned an invalid variation-gallery response"
      );
    }

    return privateJson({
      ok: true,
      updated_count:
        json.updated.length,
    });
  } catch (error: unknown) {
    return productErrorResponse(
      error,
      "Failed to save variation galleries"
    );
  }
}
