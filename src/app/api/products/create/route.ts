import {
  isAxiosError,
  type AxiosInstance,
} from "axios";
import { NextResponse } from "next/server";

import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
};

type JsonRecord =
  Record<string, unknown>;

type CreatedProduct = {
  id: number;
  name: string;
  permalink: string;
  status: string;
};

type WooErrorDetails = {
  message: string;
  status: number;
};

function isRecord(
  value: unknown
): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function privateJson(
  body: unknown,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers:
      PRIVATE_RESPONSE_HEADERS,
  });
}

function readString(
  value: unknown
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}

function readNumber(
  value: unknown
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : undefined;
}

function readBoolean(
  value: unknown
): boolean {
  return value === true;
}

function pickValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  const normalized =
    readString(value) as T;

  return allowed.includes(normalized)
    ? normalized
    : fallback;
}

function normalizeCategories(
  value: unknown
): Array<{ id: number }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number(item))
    .filter(
      (id) =>
        Number.isInteger(id) &&
        id > 0
    )
    .map((id) => ({ id }));
}

function normalizeTags(
  value: unknown
): Array<{ name: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  const names = value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (
        isRecord(item) &&
        typeof item.name === "string"
      ) {
        return item.name.trim();
      }

      return "";
    })
    .filter(Boolean);

  return Array.from(
    new Set(names)
  ).map((name) => ({ name }));
}

function normalizeAttributes(
  value: unknown
): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const attributes: JsonRecord[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const id = Number(item.id);
    const name = readString(item.name);

    const options = Array.isArray(
      item.options
    )
      ? item.options
          .map(readString)
          .filter(Boolean)
      : [];

    if (
      (!Number.isInteger(id) ||
        id <= 0) &&
      !name
    ) {
      continue;
    }

    attributes.push({
      ...(Number.isInteger(id) &&
      id > 0
        ? { id }
        : {}),
      ...(name ? { name } : {}),
      visible: readBoolean(
        item.visible
      ),
      variation: readBoolean(
        item.variation
      ),
      options,
    });
  }

  return attributes;
}

function normalizeImages(
  value: unknown
): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const images: JsonRecord[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const id = Number(item.id);
    const src = readString(item.src);
    const position = Number(
      item.position
    );

    const hasValidId =
      Number.isInteger(id) &&
      id > 0;

    const hasValidSource =
      /^https?:\/\//i.test(src);

    if (
      !hasValidId &&
      !hasValidSource
    ) {
      continue;
    }

    images.push({
      ...(hasValidId
        ? { id }
        : {}),
      ...(hasValidSource
        ? { src }
        : {}),
      ...(Number.isInteger(position) &&
      position >= 0
        ? { position }
        : {}),
    });
  }

  return images;
}

function normalizeGroupedProducts(
  value: unknown
): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0
        )
    )
  );
}

function normalizeDimensions(
  value: unknown
): JsonRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const length = readString(
    value.length
  );

  const width = readString(
    value.width
  );

  const height = readString(
    value.height
  );

  if (!length && !width && !height) {
    return null;
  }

  return {
    length,
    width,
    height,
  };
}

function buildMetaData(
  body: JsonRecord
): Array<{
  key: string;
  value: string;
}> {
  const color = readString(
    body.color
  );

  if (!color) {
    return [];
  }

  return [
    {
      key: "_ls_color",
      value: color,
    },
  ];
}

function buildProductPayload(
  body: JsonRecord,
  sku?: string
): JsonRecord {
  const manageStock = readBoolean(
    body.manage_stock
  );

  const stockQuantity = readNumber(
    body.stock_quantity
  );

  const dimensions =
    normalizeDimensions(
      body.dimensions
    );

  const groupedProducts =
    normalizeGroupedProducts(
      body.grouped_products
    );

  const metaData =
    buildMetaData(body);

  const payload: JsonRecord = {
    name: readString(body.name),
    type: pickValue(
      body.type,
      [
        "simple",
        "variable",
        "grouped",
      ] as const,
      "simple"
    ),
    status: pickValue(
      body.status,
      [
        "draft",
        "publish",
        "pending",
        "private",
      ] as const,
      "draft"
    ),
    catalog_visibility:
      pickValue(
        body.catalog_visibility,
        [
          "visible",
          "catalog",
          "search",
          "hidden",
        ] as const,
        "visible"
      ),
    description: readString(
      body.description
    ),
    short_description: readString(
      body.short_description
    ),
    regular_price: readString(
      body.regular_price
    ),
    sale_price: readString(
      body.sale_price
    ),
    manage_stock: manageStock,
    backorders: pickValue(
      body.backorders,
      [
        "no",
        "notify",
        "yes",
      ] as const,
      "no"
    ),
    tax_status: pickValue(
      body.tax_status,
      [
        "taxable",
        "shipping",
        "none",
      ] as const,
      "taxable"
    ),
    images: normalizeImages(
      body.images
    ),
    categories:
      normalizeCategories(
        body.categories
      ),
    tags: normalizeTags(
      body.tags
    ),
    attributes:
      normalizeAttributes(
        body.attributes
      ),
  };

  if (sku) {
    payload.sku = sku;
  }

  const saleFrom = readString(
    body.date_on_sale_from
  );

  const saleTo = readString(
    body.date_on_sale_to
  );

  if (saleFrom) {
    payload.date_on_sale_from =
      saleFrom;
  }

  if (saleTo) {
    payload.date_on_sale_to =
      saleTo;
  }

  if (
    manageStock &&
    stockQuantity !== undefined
  ) {
    payload.stock_quantity =
      stockQuantity;
  }

  const taxClass = readString(
    body.tax_class
  );

  if (taxClass) {
    payload.tax_class = taxClass;
  }

  const weight = readString(
    body.weight
  );

  if (weight) {
    payload.weight = weight;
  }

  if (dimensions) {
    payload.dimensions =
      dimensions;
  }

  if (
    groupedProducts.length > 0
  ) {
    payload.grouped_products =
      groupedProducts;
  }

  if (metaData.length > 0) {
    payload.meta_data = metaData;
  }

  return payload;
}

function extractCreatedProduct(
  value: unknown
): CreatedProduct | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = Number(value.id);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return {
    id,
    name: readString(value.name),
    permalink: readString(
      value.permalink
    ),
    status: readString(
      value.status
    ),
  };
}

function extractWooError(
  error: unknown
): WooErrorDetails {
  if (isAxiosError(error)) {
    const responseData: unknown =
      error.response?.data;

    let message = "";

    if (isRecord(responseData)) {
      message =
        readString(
          responseData.message
        ) ||
        readString(
          responseData.error
        );
    }

    return {
      message:
        message ||
        error.message ||
        "WooCommerce request failed",
      status:
        error.response?.status ||
        500,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      status: 500,
    };
  }

  return {
    message:
      "WooCommerce request failed",
    status: 500,
  };
}

function isSkuLookupFailure(
  error: unknown
): boolean {
  const details =
    extractWooError(error);

  return (
    /lookup/i.test(details.message) &&
    /sku/i.test(details.message)
  );
}

async function createProduct(
  woo: AxiosInstance,
  payload: JsonRecord
): Promise<CreatedProduct> {
  const response =
    await woo.post(
      "/products",
      payload
    );

  const product =
    extractCreatedProduct(
      response.data
    );

  if (!product) {
    throw new Error(
      "WooCommerce created the product but returned an invalid response"
    );
  }

  return product;
}

export async function POST(
  request: Request
) {
  try {
    const bodyValue: unknown =
      await request
        .json()
        .catch(() => null);

    if (!isRecord(bodyValue)) {
      return privateJson(
        {
          error:
            "Invalid request body",
        },
        400
      );
    }

    const name = readString(
      bodyValue.name
    );

    if (!name) {
      return privateJson(
        {
          error:
            "Product name is required",
        },
        400
      );
    }

    const sku = readString(
      bodyValue.sku
    );

    const woo =
      await getWooClient();

    const payload =
      buildProductPayload(
        bodyValue,
        sku || undefined
      );

    try {
      const product =
        await createProduct(
          woo,
          payload
        );

      return privateJson({
        ok: true,
        id: product.id,
        permalink:
          product.permalink,
        status:
          product.status,
      });
    } catch (error: unknown) {
      if (
        !sku ||
        !isSkuLookupFailure(error)
      ) {
        throw error;
      }

      /*
       * Preserve the established operational
       * fallback for the known WooCommerce SKU
       * lookup-table failure.
       *
       * The local SQLite database was never able
       * to repair the remote WordPress lookup
       * table, so it is intentionally not used.
       */
      const payloadWithoutSku =
        buildProductPayload(
          bodyValue
        );

      const product =
        await createProduct(
          woo,
          payloadWithoutSku
        );

      return privateJson({
        ok: true,
        id: product.id,
        permalink:
          product.permalink,
        status:
          product.status,
        note:
          "Created without SKU because WooCommerce rejected the SKU lookup.",
      });
    }
  } catch (error: unknown) {
    const details =
      extractWooError(error);

    return privateJson(
      {
        error: details.message,
      },
      details.status
    );
  }
}