import { isAxiosError } from "axios";

import { getWooClient } from "@/lib/woo";
import {
  isRecord,
  type JsonRecord,
  normalizeProductUpdate,
  privateJson,
  productErrorResponse,
  readJsonObject,
} from "@/lib/productPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isSkuLookupFailure(error: unknown): boolean {
  if (!isAxiosError(error) || !isRecord(error.response?.data)) return false;

  const message = typeof error.response.data.message === "string"
    ? error.response.data.message
    : "";

  return /sku/i.test(message) && /lookup/i.test(message);
}

function createdProduct(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;
  const id = Number(value.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  return {
    id,
    permalink: typeof value.permalink === "string"
      ? value.permalink.slice(0, 2_000)
      : "",
    status: typeof value.status === "string"
      ? value.status.slice(0, 40)
      : "",
  };
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const payload = normalizeProductUpdate(body);

    if (typeof payload.name !== "string" || !payload.name) {
      throw new TypeError("Product name is required");
    }

    if (!("type" in payload)) payload.type = "simple";
    if (!("status" in payload)) payload.status = "draft";
    if (!("catalog_visibility" in payload)) payload.catalog_visibility = "visible";
    if (!("manage_stock" in payload)) payload.manage_stock = false;
    if (!("backorders" in payload)) payload.backorders = "no";
    if (!("tax_status" in payload)) payload.tax_status = "taxable";
    if (!("images" in payload)) payload.images = [];
    if (!("categories" in payload)) payload.categories = [];
    if (!("tags" in payload)) payload.tags = [];
    if (!("attributes" in payload)) payload.attributes = [];

    const woo = await getWooClient();
    let response;

    try {
      response = await woo.post("/products", payload);
    } catch (error: unknown) {
      const sku = typeof payload.sku === "string" ? payload.sku : "";

      if (!sku || !isSkuLookupFailure(error)) throw error;

      const payloadWithoutSku = { ...payload };
      delete payloadWithoutSku.sku;
      response = await woo.post("/products", payloadWithoutSku);
    }

    const product = createdProduct(response.data);

    if (!product) {
      throw new Error("WooCommerce returned an invalid created product");
    }

    return privateJson({ ok: true, ...product });
  } catch (error: unknown) {
    return productErrorResponse(error, "Product creation failed");
  }
}
