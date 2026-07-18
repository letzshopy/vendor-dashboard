import { getWooClient } from "@/lib/woo";
import {
  boundedString,
  isRecord,
  type JsonRecord,
  normalizeProductUpdate,
  parseProductId,
  parseProductIds,
  privateJson,
  productErrorResponse,
  productSummary,
  readJsonObject,
} from "@/lib/productPolicy";

type CategoryChange = {
  ids: number[];
  op: "replace" | "add" | "remove";
};

type TagChange = {
  names: string[];
  op: "replace" | "append" | "remove";
};

const SCALAR_KEYS = [
  "status",
  "catalog_visibility",
  "regular_price",
  "sale_price",
  "date_on_sale_from",
  "date_on_sale_to",
  "manage_stock",
  "stock_quantity",
  "backorders",
] as const;

function parseCategoryChange(value: unknown): CategoryChange | null {
  if (value === undefined) return null;
  if (!isRecord(value) || !Array.isArray(value.ids)) {
    throw new TypeError("Invalid category update");
  }

  if (!["replace", "add", "remove"].includes(String(value.op))) {
    throw new TypeError("Invalid category operation");
  }

  if (value.ids.length > 100) {
    throw new RangeError("Too many categories");
  }

  return {
    ids: Array.from(new Set(value.ids.map(parseProductId))),
    op: value.op as CategoryChange["op"],
  };
}

function parseTagChange(value: unknown): TagChange | null {
  if (value === undefined) return null;
  if (!isRecord(value) || !Array.isArray(value.names)) {
    throw new TypeError("Invalid tag update");
  }

  if (!["replace", "append", "remove"].includes(String(value.op))) {
    throw new TypeError("Invalid tag operation");
  }

  if (value.names.length > 100) {
    throw new RangeError("Too many tags");
  }

  return {
    names: Array.from(new Set(value.names.map((name) =>
      boundedString(name, "Tag name", 100)
    ))),
    op: value.op as TagChange["op"],
  };
}

function readExistingCategoryIds(product: JsonRecord | undefined): number[] {
  if (!product || !Array.isArray(product.categories)) return [];

  return product.categories.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = Number(item.id);
    return Number.isSafeInteger(id) && id > 0 ? [id] : [];
  });
}

function readExistingTagNames(product: JsonRecord | undefined): string[] {
  if (!product || !Array.isArray(product.tags)) return [];

  return product.tags.flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== "string") return [];
    const name = item.name.trim();
    return name ? [name] : [];
  });
}

async function fetchExistingProducts(
  ids: number[],
  needsCategories: boolean,
  needsTags: boolean
): Promise<Map<number, JsonRecord>> {
  const woo = await getWooClient();
  const result = new Map<number, JsonRecord>();
  const fields = ["id", needsCategories ? "categories" : "", needsTags ? "tags" : ""]
    .filter(Boolean)
    .join(",");

  for (let offset = 0; offset < ids.length; offset += 20) {
    const chunk = ids.slice(offset, offset + 20);
    const responses = await Promise.all(chunk.map((id) =>
      woo.get(`/products/${id}`, { params: { _fields: fields } })
    ));

    for (const response of responses) {
      if (!isRecord(response.data)) continue;
      const id = Number(response.data.id);
      if (Number.isSafeInteger(id) && id > 0) result.set(id, response.data);
    }
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const ids = parseProductIds(body.ids);

    if (!isRecord(body.patch)) {
      throw new TypeError("Invalid product update");
    }

    const scalarSource: JsonRecord = {};
    for (const key of SCALAR_KEYS) {
      if (key in body.patch) scalarSource[key] = body.patch[key];
    }

    const scalarPatch = Object.keys(scalarSource).length > 0
      ? normalizeProductUpdate(scalarSource)
      : {};
    const categoryChange = parseCategoryChange(body.patch.categories);
    const tagChange = parseTagChange(body.patch.tags);

    if (Object.keys(scalarPatch).length === 0 && !categoryChange && !tagChange) {
      throw new TypeError("Nothing to update");
    }

    const needsCategories = Boolean(categoryChange && categoryChange.op !== "replace");
    const needsTags = Boolean(tagChange && tagChange.op !== "replace");
    const existing = needsCategories || needsTags
      ? await fetchExistingProducts(ids, needsCategories, needsTags)
      : new Map<number, JsonRecord>();

    const updates = ids.map((id) => {
      const update: JsonRecord = { id, ...scalarPatch };
      const current = existing.get(id);

      if (categoryChange) {
        const categories = categoryChange.op === "replace"
          ? new Set(categoryChange.ids)
          : new Set(readExistingCategoryIds(current));

        if (categoryChange.op === "add") categoryChange.ids.forEach((item) => categories.add(item));
        if (categoryChange.op === "remove") categoryChange.ids.forEach((item) => categories.delete(item));
        update.categories = Array.from(categories).map((categoryId) => ({ id: categoryId }));
      }

      if (tagChange) {
        const tags = tagChange.op === "replace"
          ? new Set(tagChange.names)
          : new Set(readExistingTagNames(current));

        if (tagChange.op === "append") tagChange.names.forEach((name) => tags.add(name));
        if (tagChange.op === "remove") tagChange.names.forEach((name) => tags.delete(name));
        update.tags = Array.from(tags).map((name) => ({ name }));
      }

      return update;
    });

    const woo = await getWooClient();
    const response = await woo.post("/products/batch", { update: updates });
    const responseUpdates = isRecord(response.data) && Array.isArray(response.data.update)
      ? response.data.update
      : [];
    const products = responseUpdates
      .map(productSummary)
      .filter((item) => item !== null);

    return privateJson({
      ok: true,
      requestedCount: ids.length,
      updatedCount: products.length,
      products,
    });
  } catch (error: unknown) {
    return productErrorResponse(error, "Bulk product update failed");
  }
}
