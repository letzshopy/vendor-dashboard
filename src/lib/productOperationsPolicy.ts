import type { AxiosInstance } from "axios";

import {
  boundedString,
  isRecord,
  type JsonRecord,
  parseProductId,
} from "@/lib/productPolicy";

const MAX_VARIATIONS = 500;
const VARIATION_PAGE_SIZE = 100;

function trustedString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function trustedId(value: unknown): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function nonNegativeInteger(value: unknown, label: string): number {
  const numberValue = Number(value);

  if (!Number.isSafeInteger(numberValue) || numberValue < 0) {
    throw new TypeError(`${label} must be a non-negative whole number`);
  }

  return numberValue;
}

function normalizeBackorders(value: unknown): "no" | "notify" | "yes" {
  if (value === "notify" || value === "yes") return value;
  return "no";
}

function normalizeVariationAttributes(value: unknown): JsonRecord[] {
  if (!Array.isArray(value) || value.length > 50) {
    throw new TypeError("Invalid variation attributes");
  }

  return value.map((item) => {
    if (!isRecord(item)) {
      throw new TypeError("Invalid variation attribute");
    }

    const id = item.id === undefined ? null : parseProductId(item.id);
    const name = item.name === undefined
      ? ""
      : boundedString(item.name, "Attribute name", 100, { allowEmpty: true });
    const option = boundedString(item.option, "Attribute option", 100);

    if (!id && !name) {
      throw new TypeError("Variation attribute identity is required");
    }

    return {
      ...(id ? { id } : {}),
      ...(name ? { name } : {}),
      option,
    };
  });
}

export function normalizeVariationInput(value: unknown): JsonRecord {
  if (!isRecord(value)) {
    throw new TypeError("Invalid variation");
  }

  const output: JsonRecord = {};

  if (value.id !== undefined) output.id = parseProductId(value.id);
  if (value.sku !== undefined) output.sku = boundedString(value.sku, "Variation SKU", 100, { allowEmpty: true });
  if (value.description !== undefined) output.description = boundedString(value.description, "Variation description", 20_000, { allowEmpty: true });
  if (value.regular_price !== undefined) output.regular_price = boundedString(value.regular_price, "Variation price", 40, { allowEmpty: true });
  if (value.sale_price !== undefined) output.sale_price = boundedString(value.sale_price, "Variation sale price", 40, { allowEmpty: true });
  if (value.manage_stock !== undefined) output.manage_stock = value.manage_stock === true;
  if (value.stock_quantity !== undefined) output.stock_quantity = nonNegativeInteger(value.stock_quantity, "Variation stock quantity");
  if (value.backorders !== undefined) output.backorders = normalizeBackorders(value.backorders);
  if (value.attributes !== undefined) output.attributes = normalizeVariationAttributes(value.attributes);
  if (value.image !== undefined && isRecord(value.image)) {
    output.image = { id: parseProductId(value.image.id) };
  }

  if (Object.keys(output).length === 0 || (Object.keys(output).length === 1 && "id" in output)) {
    throw new TypeError("No supported variation fields were provided");
  }

  return output;
}

export function normalizeVariationList(value: unknown, limit = 100): JsonRecord[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("No variations provided");
  }

  if (value.length > limit) {
    throw new RangeError(`A maximum of ${limit} variations can be changed at once`);
  }

  return value.map(normalizeVariationInput);
}

export function variationSummary(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;

  const id = trustedId(value.id);
  if (!id) return null;

  const attributes = Array.isArray(value.attributes)
    ? value.attributes.flatMap((item) => {
        if (!isRecord(item)) return [];
        const attributeId = trustedId(item.id);
        const name = trustedString(item.name, 100);
        const option = trustedString(item.option, 100);
        return option ? [{
          ...(attributeId ? { id: attributeId } : {}),
          ...(name ? { name } : {}),
          option,
        }] : [];
      })
    : [];
  const image = isRecord(value.image) && trustedId(value.image.id)
    ? {
        id: trustedId(value.image.id),
        src: trustedString(value.image.src, 2_000),
      }
    : null;

  return {
    id,
    sku: trustedString(value.sku, 100),
    description: trustedString(value.description, 20_000),
    regular_price: trustedString(value.regular_price, 40),
    sale_price: trustedString(value.sale_price, 40),
    manage_stock: value.manage_stock === true,
    stock_quantity: Number.isFinite(Number(value.stock_quantity))
      ? Number(value.stock_quantity)
      : null,
    backorders: normalizeBackorders(value.backorders),
    attributes,
    image,
  };
}

export async function getAllVariations(
  woo: AxiosInstance,
  productId: number
): Promise<JsonRecord[]> {
  const variations: JsonRecord[] = [];

  for (let page = 1; variations.length < MAX_VARIATIONS; page += 1) {
    const response = await woo.get(`/products/${productId}/variations`, {
      params: {
        per_page: VARIATION_PAGE_SIZE,
        page,
        orderby: "menu_order",
        order: "asc",
      },
    });

    if (!Array.isArray(response.data) || response.data.length === 0) break;

    for (const item of response.data) {
      if (isRecord(item)) variations.push(item);
    }

    if (response.data.length < VARIATION_PAGE_SIZE) break;
  }

  if (variations.length >= MAX_VARIATIONS) {
    throw new RangeError(`Products with ${MAX_VARIATIONS} or more variations cannot be cloned in one request`);
  }

  return variations;
}

function cloneIds(value: unknown): Array<{ id: number }> {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const id = trustedId(isRecord(item) ? item.id : item);
    return id ? [{ id }] : [];
  }).slice(0, 100);
}

function cloneNames(value: unknown): Array<{ name: string }> {
  if (!Array.isArray(value)) return [];

  const names = value.flatMap((item) => {
    const name = trustedString(isRecord(item) ? item.name : item, 100);
    return name ? [name] : [];
  });

  return Array.from(new Set(names)).slice(0, 100).map((name) => ({ name }));
}

function cloneDimensions(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;

  const dimensions = {
    length: trustedString(value.length, 40),
    width: trustedString(value.width, 40),
    height: trustedString(value.height, 40),
  };

  return Object.values(dimensions).some(Boolean) ? dimensions : null;
}

export function buildCloneParent(
  source: unknown,
  options: { sku: string; keepImages: boolean }
): JsonRecord {
  if (!isRecord(source)) {
    throw new Error("WooCommerce returned an invalid source product");
  }

  const type = source.type === "variable" || source.type === "grouped"
    ? source.type
    : "simple";
  const payload: JsonRecord = {
    name: trustedString(source.name, 200) || "Cloned Product",
    type,
    status: "publish",
    catalog_visibility: ["visible", "catalog", "search", "hidden"].includes(String(source.catalog_visibility))
      ? source.catalog_visibility
      : "visible",
    short_description: trustedString(source.short_description, 20_000),
    description: trustedString(source.description, 300_000),
    sku: options.sku,
    images: options.keepImages ? cloneIds(source.images).map((image, position) => ({ ...image, position })) : [],
    categories: cloneIds(source.categories),
    tags: cloneNames(source.tags),
    tax_status: ["taxable", "shipping", "none"].includes(String(source.tax_status))
      ? source.tax_status
      : "taxable",
  };

  const taxClass = trustedString(source.tax_class, 100);
  if (taxClass) payload.tax_class = taxClass;

  if (type !== "grouped") {
    const weight = trustedString(source.weight, 40);
    const dimensions = cloneDimensions(source.dimensions);
    if (weight) payload.weight = weight;
    if (dimensions) payload.dimensions = dimensions;
  }

  if (type === "simple") {
    const regularPrice = trustedString(source.regular_price, 40);
    const salePrice = trustedString(source.sale_price, 40);
    const saleFrom = trustedString(source.date_on_sale_from, 40);
    const saleTo = trustedString(source.date_on_sale_to, 40);
    if (regularPrice) payload.regular_price = regularPrice;
    if (salePrice) payload.sale_price = salePrice;
    if (saleFrom) payload.date_on_sale_from = saleFrom;
    if (saleTo) payload.date_on_sale_to = saleTo;
    payload.manage_stock = source.manage_stock === true;
    if (source.manage_stock === true) {
      payload.stock_quantity = Math.max(0, Number(source.stock_quantity) || 0);
    }
    payload.backorders = normalizeBackorders(source.backorders);
  }

  if (type === "variable" && Array.isArray(source.attributes)) {
    payload.attributes = source.attributes.flatMap((item) => {
      if (!isRecord(item) || item.variation !== true) return [];
      const id = trustedId(item.id);
      if (!id) return [];
      const optionsList = Array.isArray(item.options)
        ? item.options.map((option) => trustedString(option, 100)).filter(Boolean).slice(0, 100)
        : [];
      return [{ id, visible: true, variation: true, options: optionsList }];
    });

    if (Array.isArray(source.default_attributes)) {
      payload.default_attributes = source.default_attributes.flatMap((item) => {
        if (!isRecord(item)) return [];
        const id = trustedId(item.id);
        const option = trustedString(item.option, 100);
        return id && option ? [{ id, option }] : [];
      });
    }
  }

  if (type === "grouped") {
    payload.grouped_products = cloneIds(source.grouped_products).map((item) => item.id);
  }

  return payload;
}

export function buildCloneVariation(value: unknown, keepImage: boolean): JsonRecord {
  if (!isRecord(value)) {
    throw new Error("WooCommerce returned an invalid variation");
  }

  const payload: JsonRecord = {
    sku: "",
    description: trustedString(value.description, 20_000),
    manage_stock: value.manage_stock === true,
    backorders: normalizeBackorders(value.backorders),
    attributes: Array.isArray(value.attributes)
      ? value.attributes.flatMap((item) => {
          if (!isRecord(item)) return [];
          const id = trustedId(item.id);
          const option = trustedString(item.option, 100);
          return id && option ? [{ id, option }] : [];
        })
      : [],
  };

  const regularPrice = trustedString(value.regular_price, 40);
  const salePrice = trustedString(value.sale_price, 40);
  if (regularPrice) payload.regular_price = regularPrice;
  if (salePrice) payload.sale_price = salePrice;
  if (value.manage_stock === true) {
    payload.stock_quantity = Math.max(0, Number(value.stock_quantity) || 0);
  }

  if (keepImage && isRecord(value.image)) {
    const imageId = trustedId(value.image.id);
    if (imageId) payload.image = { id: imageId };
  }

  return payload;
}

export async function createVariationCopies(
  woo: AxiosInstance,
  productId: number,
  sourceVariations: JsonRecord[],
  keepImages: boolean
): Promise<void> {
  for (let offset = 0; offset < sourceVariations.length; offset += 50) {
    const chunk = sourceVariations.slice(offset, offset + 50);
    await woo.post(`/products/${productId}/variations/batch`, {
      create: chunk.map((item) => buildCloneVariation(item, keepImages)),
    });
  }
}

export function makeSkuSequence(base: unknown, count: number): string[] {
  const normalized = trustedString(base, 100);
  const match = normalized.match(/^(.*?)(\d+)$/);

  if (match) {
    const [, prefix, numberText] = match;
    const start = Number.parseInt(numberText, 10);
    return Array.from({ length: count }, (_, index) => `${prefix}${start + index + 1}`);
  }

  return Array.from({ length: count }, (_, index) =>
    `${normalized}${normalized ? "-" : ""}${index + 1}`
  );
}
