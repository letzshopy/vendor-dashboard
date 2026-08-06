import { getWooClient } from "@/lib/woo";
import {
  isRecord,
  parseProductId,
  privateJson,
  productErrorResponse,
  readJsonObject,
} from "@/lib/productPolicy";
import {
  getAllVariations,
} from "@/lib/productOperationsPolicy";
import {
  fetchInternalWp,
} from "@/lib/wpClient";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type GalleryImage = {
  id: number;
  url: string;
  thumbnail: string;
  alt: string;
};

type VariationGallery = {
  variation_id: number;
  image_ids: number[];
  images: GalleryImage[];
};

const MAX_GALLERY_IMAGES = 3;
const GALLERY_READ_CONCURRENCY = 4;

function normalizedImageIds(
  value: unknown
): number[] {
  if (
    !Array.isArray(value) ||
    value.length > MAX_GALLERY_IMAGES
  ) {
    throw new TypeError(
      "Each variation gallery allows up to 3 images"
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

function galleryImage(
  value: unknown
): GalleryImage | null {
  if (!isRecord(value)) return null;

  const id = Number(value.id);
  const url =
    typeof value.full === "string"
      ? value.full
      : typeof value.url === "string"
        ? value.url
        : "";
  const thumbnail =
    typeof value.thumbnail === "string"
      ? value.thumbnail
      : url;
  const alt =
    typeof value.alt === "string"
      ? value.alt.slice(0, 300)
      : "";

  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !/^https?:\/\//i.test(url)
  ) {
    return null;
  }

  return {
    id,
    url,
    thumbnail:
      /^https?:\/\//i.test(thumbnail)
        ? thumbnail
        : url,
    alt,
  };
}

async function readVariationGallery(
  variationId: number
): Promise<VariationGallery> {
  const response =
    await fetchInternalWp(
      `/wp-json/letz/v1/variation-gallery/${variationId}`,
      {
        method: "GET",
        cache: "no-store",
      },
      30_000
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
        : "Unable to load a variation gallery.";

    throw new Error(message);
  }

  if (
    !isRecord(json) ||
    Number(json.variation_id) !== variationId ||
    !Array.isArray(json.gallery)
  ) {
    throw new Error(
      "WordPress returned an invalid variation-gallery response"
    );
  }

  const images =
    json.gallery
      .flatMap((item) => {
        const image = galleryImage(item);
        return image ? [image] : [];
      })
      .slice(0, MAX_GALLERY_IMAGES);

  return {
    variation_id: variationId,
    image_ids: images.map((image) => image.id),
    images,
  };
}

async function readVariationGalleries(
  variationIds: number[]
): Promise<VariationGallery[]> {
  if (variationIds.length === 0) {
    return [];
  }

  const results =
    new Array<VariationGallery>(
      variationIds.length
    );
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= variationIds.length) {
        return;
      }

      results[index] =
        await readVariationGallery(
          variationIds[index]
        );
    }
  }

  const workerCount = Math.min(
    GALLERY_READ_CONCURRENCY,
    variationIds.length
  );

  await Promise.all(
    Array.from(
      { length: workerCount },
      () => worker()
    )
  );

  return results;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const productId = parseProductId(id);
    const woo = await getWooClient();
    const variations =
      await getAllVariations(
        woo,
        productId
      );

    const variationIds =
      variations.flatMap((variation) => {
        const variationId =
          Number(variation.id);

        return Number.isSafeInteger(variationId) &&
          variationId > 0
          ? [variationId]
          : [];
      });

    const galleries =
      await readVariationGalleries(
        variationIds
      );

    return privateJson({
      galleries,
      max_images_per_variation:
        MAX_GALLERY_IMAGES,
    });
  } catch (error: unknown) {
    return productErrorResponse(
      error,
      "Failed to load variation galleries"
    );
  }
}

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
