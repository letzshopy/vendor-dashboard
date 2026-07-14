import {
  isRecord,
  type JsonRecord,
} from "@/lib/productPolicy";

function safeString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function safeId(value: unknown): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function safeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function metaValue(value: unknown, key: string): string {
  if (!Array.isArray(value)) return "";

  const item = value.find((entry) =>
    isRecord(entry) && entry.key === key
  );

  return isRecord(item) ? safeString(item.value, 200) : "";
}

function imageObjects(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 20).flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = safeId(item.id);
    const src = safeString(item.src, 2_000);
    if (!id || !src) return [];

    return [{
      id,
      src,
      name: safeString(item.name, 255),
    }];
  });
}

function categories(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 100).flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = safeId(item.id);
    if (!id) return [];

    return [{
      id,
      name: safeString(item.name, 200),
      parent: Math.max(0, Number(item.parent) || 0),
    }];
  });
}

function tags(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 100).flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = safeId(item.id);
    if (!id) return [];

    return [{
      id,
      name: safeString(item.name, 100),
    }];
  });
}

function attributes(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 50).flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = safeId(item.id);
    const name = safeString(item.name, 100);
    if (!id && !name) return [];
    const options = Array.isArray(item.options)
      ? item.options
          .map((option) => safeString(option, 100))
          .filter(Boolean)
          .slice(0, 100)
      : [];

    return [{
      ...(id ? { id } : {}),
      ...(name ? { name } : {}),
      slug: safeString(item.slug, 150),
      position: Math.max(0, Number(item.position) || 0),
      visible: item.visible === true,
      variation: item.variation === true,
      options,
    }];
  });
}

function dimensions(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;

  return {
    length: safeString(value.length, 40),
    width: safeString(value.width, 40),
    height: safeString(value.height, 40),
  };
}

export function productDetail(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  if (!id) return null;

  const productImages = imageObjects(value.images);
  const productCategories = categories(value.categories);
  const productTags = tags(value.tags);
  const groupedProducts = Array.isArray(value.grouped_products)
    ? value.grouped_products.flatMap((item) => {
        const productId = safeId(item);
        return productId ? [productId] : [];
      }).slice(0, 100)
    : [];

  return {
    id,
    name: safeString(value.name, 200),
    sku: safeString(value.sku, 100),
    color: metaValue(value.meta_data, "_ls_color"),
    type: safeString(value.type, 40),
    status: safeString(value.status, 40),
    permalink: safeString(value.permalink, 2_000),
    price: safeString(value.price, 40),
    regular_price: safeString(value.regular_price, 40),
    sale_price: safeString(value.sale_price, 40),
    stock_status: safeString(value.stock_status, 40),
    stock_quantity: safeNumber(value.stock_quantity),
    manage_stock: value.manage_stock === true,
    backorders: safeString(value.backorders, 20),
    catalog_visibility: safeString(value.catalog_visibility, 40),
    description: safeString(value.description, 300_000),
    short_description: safeString(value.short_description, 20_000),
    tax_status: safeString(value.tax_status, 40),
    tax_class: safeString(value.tax_class, 100),
    weight: safeString(value.weight, 40),
    dimensions: dimensions(value.dimensions),
    shipping_class_id: safeNumber(value.shipping_class_id),
    shipping_class: safeString(value.shipping_class, 150),
    images: productImages.map((image) => image.src),
    image_objects: productImages,
    categories: productCategories,
    tags: productTags,
    category_ids: productCategories.map((category) => category.id),
    tag_ids: productTags.map((tag) => tag.id),
    attributes: attributes(value.attributes),
    grouped_products: groupedProducts,
    date_created: safeString(value.date_created, 50) || null,
    date_modified: safeString(value.date_modified, 50) || null,
  };
}

export function productSearchSummary(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  if (!id) return null;
  const firstImage = Array.isArray(value.images) ? value.images[0] : null;

  return {
    id,
    name: safeString(value.name, 200),
    sku: safeString(value.sku, 100),
    price: safeString(value.price, 40),
    regular_price: safeString(value.regular_price, 40),
    sale_price: safeString(value.sale_price, 40),
    image: isRecord(firstImage) ? safeString(firstImage.src, 2_000) : "",
  };
}

export function trashedProductSummary(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  if (!id) return null;

  return {
    id,
    name: safeString(value.name, 200),
    sku: safeString(value.sku, 100),
    date: safeString(value.date_created, 50) ||
      safeString(value.date_modified, 50) ||
      null,
  };
}
