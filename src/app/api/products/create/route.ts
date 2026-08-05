import { getWooClient } from "@/lib/woo";
import {
  isRecord,
  type JsonRecord,
  normalizeProductUpdate,
  privateJson,
  productErrorResponse,
  readJsonObject,
} from "@/lib/productPolicy";
import {
  isDuplicateSkuError,
  skuExists,
} from "@/lib/productSkuPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProductType =
  | "simple"
  | "variable"
  | "grouped";

function createdProduct(
  value: unknown
): JsonRecord | null {
  if (!isRecord(value)) return null;

  const id = Number(value.id);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return {
    id,
    permalink:
      typeof value.permalink === "string"
        ? value.permalink.slice(0, 2_000)
        : "",
    status:
      typeof value.status === "string"
        ? value.status.slice(0, 40)
        : "",
    sku:
      typeof value.sku === "string"
        ? value.sku.slice(0, 100)
        : "",
  };
}

function resolveProductType(
  payload: JsonRecord
): ProductType {
  if (
    payload.type === "variable" ||
    payload.type === "grouped"
  ) {
    return payload.type;
  }

  return "simple";
}

function applyCreationDefaults(
  payload: JsonRecord
): void {
  if (!("type" in payload)) {
    payload.type = "simple";
  }

  if (!("status" in payload)) {
    payload.status = "draft";
  }

  if (!("catalog_visibility" in payload)) {
    payload.catalog_visibility = "visible";
  }

  if (!("backorders" in payload)) {
    payload.backorders = "no";
  }

  if (!("tax_status" in payload)) {
    payload.tax_status = "taxable";
  }

  if (!("images" in payload)) {
    payload.images = [];
  }

  if (!("categories" in payload)) {
    payload.categories = [];
  }

  if (!("tags" in payload)) {
    payload.tags = [];
  }

  if (!("attributes" in payload)) {
    payload.attributes = [];
  }

  const productType =
    resolveProductType(payload);

  if (productType === "simple") {
    payload.manage_stock = true;

    if (!("stock_quantity" in payload)) {
      payload.stock_quantity = 0;
    }

    const quantity = Number(
      payload.stock_quantity
    );

    payload.stock_status =
      Number.isFinite(quantity) &&
      quantity > 0
        ? "instock"
        : "outofstock";

    return;
  }

  // Variable and grouped parents do not own
  // stock quantities. Variations/children do.
  payload.manage_stock = false;

  delete payload.stock_quantity;
  delete payload.stock_status;
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await readJsonObject(request);

    const payload =
      normalizeProductUpdate(body);

    if (
      typeof payload.name !== "string" ||
      !payload.name
    ) {
      throw new TypeError(
        "Product name is required"
      );
    }

    applyCreationDefaults(payload);

    const woo = await getWooClient();

    const sku =
      typeof payload.sku === "string"
        ? payload.sku.trim()
        : "";

    if (!sku) {
      delete payload.sku;
    } else if (
      await skuExists(woo, sku)
    ) {
      return privateJson(
        {
          error: "SKU already taken",
        },
        409
      );
    }

    let response;

    try {
      response = await woo.post(
        "/products",
        payload
      );
    } catch (error: unknown) {
      if (
        sku &&
        isDuplicateSkuError(error)
      ) {
        return privateJson(
          {
            error: "SKU already taken",
          },
          409
        );
      }

      throw error;
    }

    const product =
      createdProduct(response.data);

    if (!product) {
      throw new Error(
        "WooCommerce returned an invalid created product"
      );
    }

    return privateJson({
      ok: true,
      ...product,
    });
  } catch (error: unknown) {
    return productErrorResponse(
      error,
      "Product creation failed"
    );
  }
}