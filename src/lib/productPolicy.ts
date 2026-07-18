import { isAxiosError } from "axios";
import { NextResponse } from "next/server";

export type JsonRecord = Record<string, unknown>;

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
};

const MAX_BODY_BYTES = 512 * 1024;
const MAX_PRODUCT_IDS = 100;

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function privateJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: PRIVATE_HEADERS,
  });
}

export async function readJsonObject(request: Request): Promise<JsonRecord> {
  const declaredLength = Number(request.headers.get("content-length") || 0);

  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new RangeError("Request body is too large");
  }

  const raw = await request.text();

  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw new RangeError(raw ? "Request body is too large" : "Request body is required");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new TypeError("Invalid JSON request body");
  }

  if (!isRecord(parsed)) {
    throw new TypeError("Invalid request body");
  }

  return parsed;
}

export function parseProductId(value: unknown): number {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new TypeError("Invalid product id");
  }

  return id;
}

export function parseProductIds(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("No product ids provided");
  }

  if (value.length > MAX_PRODUCT_IDS) {
    throw new RangeError(`A maximum of ${MAX_PRODUCT_IDS} products can be changed at once`);
  }

  const ids = Array.from(new Set(value.map(parseProductId)));

  if (ids.length === 0) {
    throw new TypeError("No valid product ids provided");
  }

  return ids;
}

export function boundedString(
  value: unknown,
  label: string,
  maxLength: number,
  options: { allowEmpty?: boolean } = {}
): string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be text`);
  }

  const result = value.trim();

  if (!result && !options.allowEmpty) {
    throw new TypeError(`${label} is required`);
  }

  if (result.length > maxLength) {
    throw new RangeError(`${label} is too long`);
  }

  return result;
}

function optionalString(
  value: unknown,
  label: string,
  maxLength: number
): string {
  return boundedString(value, label, maxLength, { allowEmpty: true });
}

function enumValue<T extends string>(
  value: unknown,
  label: string,
  allowed: readonly T[]
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new TypeError(`Invalid ${label}`);
  }

  return value as T;
}

function nonNegativeInteger(value: unknown, label: string): number {
  const result = Number(value);

  if (!Number.isSafeInteger(result) || result < 0) {
    throw new TypeError(`${label} must be a non-negative whole number`);
  }

  return result;
}

function normalizeIds(value: unknown, label: string, limit = 100): number[] {
  if (!Array.isArray(value) || value.length > limit) {
    throw new TypeError(`Invalid ${label}`);
  }

  return Array.from(new Set(value.map((item) => {
    const source = isRecord(item) ? item.id : item;
    return parseProductId(source);
  })));
}

function normalizeImages(value: unknown): JsonRecord[] {
  if (!Array.isArray(value) || value.length > 20) {
    throw new TypeError("Invalid product images");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new TypeError("Invalid product image");
    }

    const id = parseProductId(item.id);
    const position = item.position === undefined
      ? index
      : nonNegativeInteger(item.position, "Image position");

    return { id, position };
  });
}

function normalizeTags(value: unknown): Array<{ name: string }> {
  if (!Array.isArray(value) || value.length > 100) {
    throw new TypeError("Invalid product tags");
  }

  const names = value.map((item) => {
    const source = isRecord(item) ? item.name : item;
    return boundedString(source, "Tag name", 100);
  });

  return Array.from(new Set(names)).map((name) => ({ name }));
}

function normalizeDimensions(value: unknown): JsonRecord {
  if (!isRecord(value)) {
    throw new TypeError("Invalid product dimensions");
  }

  return {
    length: optionalString(value.length ?? "", "Length", 40),
    width: optionalString(value.width ?? "", "Width", 40),
    height: optionalString(value.height ?? "", "Height", 40),
  };
}

function normalizeAttributes(value: unknown): JsonRecord[] {
  if (!Array.isArray(value) || value.length > 50) {
    throw new TypeError("Invalid product attributes");
  }

  return value.map((item) => {
    if (!isRecord(item)) {
      throw new TypeError("Invalid product attribute");
    }

    const id = parseProductId(item.id);
    const options = Array.isArray(item.options)
      ? Array.from(new Set(item.options.map((option) =>
          boundedString(option, "Attribute option", 100)
        ))).slice(0, 100)
      : [];

    return {
      id,
      visible: item.visible === true,
      variation: item.variation === true,
      options,
    };
  });
}

export function normalizeProductUpdate(body: JsonRecord): JsonRecord {
  const output: JsonRecord = {};

  if ("type" in body) output.type = enumValue(body.type, "product type", ["simple", "variable", "grouped"] as const);
  if ("name" in body) output.name = boundedString(body.name, "Product name", 200);
  if ("sku" in body) output.sku = optionalString(body.sku, "SKU", 100);
  if ("status" in body) output.status = enumValue(body.status, "product status", ["draft", "publish", "pending", "private"] as const);
  if ("catalog_visibility" in body) output.catalog_visibility = enumValue(body.catalog_visibility, "catalog visibility", ["visible", "catalog", "search", "hidden"] as const);
  if ("short_description" in body) output.short_description = optionalString(body.short_description, "Short description", 20_000);
  if ("description" in body) output.description = optionalString(body.description, "Description", 300_000);
  if ("regular_price" in body) output.regular_price = optionalString(body.regular_price, "Regular price", 40);
  if ("sale_price" in body) output.sale_price = optionalString(body.sale_price, "Sale price", 40);
  if ("date_on_sale_from" in body) output.date_on_sale_from = optionalString(body.date_on_sale_from, "Sale start date", 40);
  if ("date_on_sale_to" in body) output.date_on_sale_to = optionalString(body.date_on_sale_to, "Sale end date", 40);
  if ("manage_stock" in body) output.manage_stock = body.manage_stock === true;
  if ("stock_quantity" in body) output.stock_quantity = nonNegativeInteger(body.stock_quantity, "Stock quantity");
  if ("stock_status" in body) output.stock_status = enumValue(body.stock_status, "stock status", ["instock", "outofstock", "onbackorder"] as const);
  if ("backorders" in body) output.backorders = enumValue(body.backorders, "backorders setting", ["no", "notify", "yes"] as const);
  if ("tax_status" in body) output.tax_status = enumValue(body.tax_status, "tax status", ["taxable", "shipping", "none"] as const);
  if ("tax_class" in body) output.tax_class = optionalString(body.tax_class, "Tax class", 100);
  if ("weight" in body) output.weight = optionalString(body.weight, "Weight", 40);
  if ("dimensions" in body) output.dimensions = normalizeDimensions(body.dimensions);
  if ("images" in body) output.images = normalizeImages(body.images);
  if ("categories" in body) output.categories = normalizeIds(body.categories, "categories").map((id) => ({ id }));
  if ("tags" in body) output.tags = normalizeTags(body.tags);
  if ("attributes" in body) output.attributes = normalizeAttributes(body.attributes);
  if ("grouped_products" in body) output.grouped_products = normalizeIds(body.grouped_products, "grouped products");

  if ("color" in body) {
    output.meta_data = [{
      key: "_ls_color",
      value: optionalString(body.color, "Color", 100),
    }];
  }

  if (Object.keys(output).length === 0) {
    throw new TypeError("No supported product fields were provided");
  }

  return output;
}

export function productSummary(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;

  const id = Number(value.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  return {
    id,
    name: typeof value.name === "string" ? value.name : "",
    status: typeof value.status === "string" ? value.status : "",
    stock_status: typeof value.stock_status === "string" ? value.stock_status : "",
  };
}

export function productErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof TypeError || error instanceof RangeError) {
    return privateJson({ error: error.message }, 400);
  }

  if (isAxiosError(error)) {
    const upstreamStatus = Number(error.response?.status || 0);
    const status = [400, 404, 409].includes(upstreamStatus) ? upstreamStatus : 502;
    const data: unknown = error.response?.data;
    const safeMessage = isRecord(data) && typeof data.message === "string"
      ? data.message.slice(0, 240)
      : fallback;

    console.error("Product API request failed", {
      status: upstreamStatus || null,
      code: error.code || null,
    });

    return privateJson({ error: status === 502 ? fallback : safeMessage }, status);
  }

  console.error("Product route failed", error instanceof Error ? error.message : "Unknown error");
  return privateJson({ error: fallback }, 500);
}
