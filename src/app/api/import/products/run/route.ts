import { isAxiosError, type AxiosInstance } from "axios";

import {
  boundedText,
  decimalValue,
  enumValue,
  ImportRequestError,
  importErrorResponse,
  integerValue,
  isRecord,
  optionalDateTime,
  positiveId,
  privateImportJson,
  publicImageUrl,
  pushRowError,
  readProductImport,
  records,
  rowErrorReason,
  type CsvRow,
  type JsonRecord,
} from "@/lib/importPolicy";
import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type UpsertResult = {
  action: "create" | "update";
  id: number;
};

const PRODUCT_TYPES = new Set(["simple", "external", "variable", "grouped"]);
const PRODUCT_STATUSES = new Set(["publish", "draft", "pending", "private"]);
const VISIBILITIES = new Set(["visible", "catalog", "search", "hidden"]);
const BACKORDERS = new Set(["no", "notify", "yes"]);

function rowValue(row: CsvRow, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key.toLowerCase()];
    if (value !== undefined && value.trim() !== "") return value.trim();
  }
  return "";
}

function booleanValue(value: string, field: string): boolean | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (new Set(["1", "true", "yes", "y", "on"]).has(normalized)) return true;
  if (new Set(["0", "false", "no", "n", "off"]).has(normalized)) return false;
  throw new ImportRequestError(`${field} is invalid`);
}

function listValues(value: string, delimiter: RegExp, maximum: number): string[] {
  const items = value.split(delimiter).map((item) => item.trim()).filter(Boolean);
  if (items.length > maximum) {
    throw new ImportRequestError(`A maximum of ${maximum} values is allowed in one field`);
  }
  return items;
}

function responseId(value: unknown): number {
  return isRecord(value) ? positiveId(String(value.id || "")) || 0 : 0;
}

async function findProductBySku(woo: AxiosInstance, sku: string): Promise<JsonRecord | null> {
  if (!sku) return null;
  const response = await woo.get("/products", {
    params: { sku, status: "any", per_page: 1, _fields: "id,sku,type" },
  });
  return records(response.data)[0] || null;
}

async function categoryIds(woo: AxiosInstance, raw: string): Promise<Array<{ id: number }>> {
  if (!raw) return [];
  const names = listValues(raw, /\|/, 50).map((name) =>
    boundedText(name, "Category name", 200),
  );
  const ids: number[] = [];

  for (const name of names) {
    const response = await woo.get("/products/categories", {
      params: { per_page: 50, search: name, _fields: "id,name" },
    });
    const exact = records(response.data).find((category) =>
      boundedText(String(category.name || ""), "Category name", 200).toLowerCase() ===
      name.toLowerCase(),
    );
    let id = exact ? positiveId(String(exact.id || ""), "Category ID") : null;

    if (!id) {
      const created = await woo.post("/products/categories", { name });
      id = responseId(created.data) || null;
    }
    if (id) ids.push(id);
  }

  return Array.from(new Set(ids)).map((id) => ({ id }));
}

function attributePayload(row: CsvRow): JsonRecord[] {
  const attributes: JsonRecord[] = [];
  for (let index = 1; index <= 5; index += 1) {
    const name = boundedText(
      rowValue(row, `Attribute ${index} name`),
      `Attribute ${index} name`,
      100,
    );
    const rawValues = rowValue(row, `Attribute ${index} value(s)`);
    if (!name && !rawValues) continue;
    if (!name || !rawValues) {
      throw new ImportRequestError(`Attribute ${index} requires both a name and values`);
    }
    const options = listValues(rawValues, /\|/, 100).map((value) =>
      boundedText(value, `Attribute ${index} value`, 100),
    );
    if (!options.length) throw new ImportRequestError(`Attribute ${index} has no values`);
    const visible = booleanValue(
      rowValue(row, `Attribute ${index} visible`),
      `Attribute ${index} visibility`,
    );
    attributes.push({
      name,
      options,
      visible: visible ?? false,
      variation: false,
    });
  }
  return attributes;
}

async function productPayload(woo: AxiosInstance, row: CsvRow): Promise<{
  payload: JsonRecord;
  id: number | null;
  sku: string;
  name: string;
  groupedReferences: string[];
}> {
  const id = positiveId(rowValue(row, "id"));
  const sku = boundedText(rowValue(row, "sku"), "SKU", 100);
  const name = boundedText(rowValue(row, "name"), "Product name", 200);
  if (!id && !sku && !name) throw new ImportRequestError("Missing product ID, SKU, and name");

  const type = enumValue(rowValue(row, "type"), "Product type", PRODUCT_TYPES, "simple");
  const payload: JsonRecord = { type };
  if (name) payload.name = name;
  if (sku) payload.sku = sku;

  const regularPrice = decimalValue(
    rowValue(row, "regular price", "regular_price"),
    "Regular price",
  );
  const salePrice = decimalValue(
    rowValue(row, "sale price", "sale_price"),
    "Sale price",
  );
  if (regularPrice) payload.regular_price = regularPrice;
  if (salePrice) payload.sale_price = salePrice;

  const saleFrom = optionalDateTime(rowValue(row, "sale from", "date_on_sale_from"), "Sale start");
  const saleTo = optionalDateTime(rowValue(row, "sale to", "date_on_sale_to"), "Sale end");
  if (saleFrom) payload.date_on_sale_from = saleFrom;
  if (saleTo) payload.date_on_sale_to = saleTo;

  const manageStock = booleanValue(
    rowValue(row, "manage stock", "manage_stock"),
    "Manage stock",
  );
  const quantity = integerValue(
    rowValue(row, "quantity", "stock_quantity"),
    "Stock quantity",
  );
  if (manageStock !== null) payload.manage_stock = manageStock;
  if (quantity !== null) payload.stock_quantity = quantity;

  const backorders = enumValue(rowValue(row, "backorder", "backorders"), "Backorders", BACKORDERS);
  const status = enumValue(rowValue(row, "status"), "Product status", PRODUCT_STATUSES);
  const visibility = enumValue(rowValue(row, "visibility", "catalog_visibility"), "Visibility", VISIBILITIES);
  if (backorders) payload.backorders = backorders;
  if (status) payload.status = status;
  if (visibility) payload.catalog_visibility = visibility;

  const shortDescription = boundedText(
    rowValue(row, "short description", "short_description"),
    "Short description",
    20_000,
    true,
  );
  const description = boundedText(
    rowValue(row, "Description", "description"),
    "Description",
    300_000,
    true,
  );
  if (shortDescription) payload.short_description = shortDescription;
  if (description) payload.description = description;

  const rawCategories = rowValue(row, "category", "categories");
  if (rawCategories) payload.categories = await categoryIds(woo, rawCategories);

  const rawImages = rowValue(row, "image url", "images");
  if (rawImages) {
    const images = listValues(rawImages, /[,|]/, 20).map((url) => ({
      src: publicImageUrl(url),
    }));
    if (images.length) payload.images = images;
  }

  const weight = decimalValue(rowValue(row, "weight"), "Weight", 1_000_000);
  const length = decimalValue(rowValue(row, "length"), "Length", 1_000_000);
  const width = decimalValue(rowValue(row, "width"), "Width", 1_000_000);
  const height = decimalValue(rowValue(row, "height"), "Height", 1_000_000);
  if (weight) payload.weight = weight;
  if (length || width || height) payload.dimensions = {
    length: length || "",
    width: width || "",
    height: height || "",
  };

  const attributes = attributePayload(row);
  if (attributes.length) payload.attributes = attributes;
  if (id) payload.meta_data = [{ key: "_external_id", value: String(id) }];

  const groupedReferences = listValues(
    rowValue(row, "Grouped products", "grouped_products"),
    /[|,]/,
    100,
  ).map((reference) => boundedText(reference, "Grouped product reference", 100));

  return { payload, id, sku, name, groupedReferences };
}

async function createProduct(
  woo: AxiosInstance,
  payload: JsonRecord,
  sku: string,
  name: string,
  rowNumber: number,
): Promise<UpsertResult> {
  if (!name) throw new ImportRequestError("Product name is required when creating a product");
  try {
    const response = await woo.post("/products", payload);
    const id = responseId(response.data);
    if (!id) throw new ImportRequestError("WooCommerce did not return a product ID");
    return { action: "create", id };
  } catch (error: unknown) {
    const status = isAxiosError(error) ? Number(error.response?.status || 0) : 0;
    if (!sku || (status !== 400 && status !== 409)) throw error;
    const existing = await findProductBySku(woo, sku);
    if (!existing) throw error;
    const suffix = `${Date.now().toString(36)}-${rowNumber}`;
    payload.sku = `${sku.slice(0, Math.max(1, 99 - suffix.length))}-${suffix}`;
    const response = await woo.post("/products", payload);
    const id = responseId(response.data);
    if (!id) throw new ImportRequestError("WooCommerce did not return a product ID");
    return { action: "create", id };
  }
}

async function upsertProduct(
  woo: AxiosInstance,
  row: CsvRow,
  updateExisting: boolean,
  rowNumber: number,
): Promise<UpsertResult> {
  const { payload, id, sku, name, groupedReferences } = await productPayload(woo, row);
  let result: UpsertResult;

  if (updateExisting && id) {
    try {
      const response = await woo.put(`/products/${id}`, payload);
      const updatedId = responseId(response.data);
      if (!updatedId) throw new ImportRequestError("WooCommerce did not return a product ID");
      result = { action: "update", id: updatedId };
    } catch (error: unknown) {
      if (!isAxiosError(error) || Number(error.response?.status || 0) !== 404) throw error;
      const existing = sku ? await findProductBySku(woo, sku) : null;
      const existingId = existing ? responseId(existing) : 0;
      if (existingId) {
        const response = await woo.put(`/products/${existingId}`, payload);
        const updatedId = responseId(response.data);
        if (!updatedId) throw new ImportRequestError("WooCommerce did not return a product ID");
        result = { action: "update", id: updatedId };
      } else {
        result = await createProduct(woo, payload, sku, name, rowNumber);
      }
    }
  } else if (updateExisting && sku) {
    const existing = await findProductBySku(woo, sku);
    const existingId = existing ? responseId(existing) : 0;
    if (existingId) {
      const response = await woo.put(`/products/${existingId}`, payload);
      const updatedId = responseId(response.data);
      if (!updatedId) throw new ImportRequestError("WooCommerce did not return a product ID");
      result = { action: "update", id: updatedId };
    } else {
      result = await createProduct(woo, payload, sku, name, rowNumber);
    }
  } else {
    result = await createProduct(woo, payload, sku, name, rowNumber);
  }

  if (payload.type === "grouped" && groupedReferences.length) {
    const groupedIds: number[] = [];
    for (const reference of groupedReferences) {
      const numericId = /^\d+$/.test(reference)
        ? positiveId(reference, "Grouped product ID")
        : null;
      if (numericId) {
        groupedIds.push(numericId);
        continue;
      }
      const product = await findProductBySku(woo, reference);
      const productId = product ? responseId(product) : 0;
      if (productId) groupedIds.push(productId);
    }
    await woo.put(`/products/${result.id}`, {
      grouped_products: Array.from(new Set(groupedIds)),
    });
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const woo = await getWooClient();
    const { rows, updateExisting } = await readProductImport(request);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = index + 2;
      try {
        const result = await upsertProduct(woo, rows[index], updateExisting, rowNumber);
        if (result.action === "create") created += 1;
        else updated += 1;
      } catch (error: unknown) {
        skipped += 1;
        pushRowError(errors, rowNumber, rowErrorReason(error));
      }
    }

    return privateImportJson({
      ok: true,
      rows: rows.length,
      summary: { created, updated, skipped },
      errors,
      errorsTruncated: skipped > errors.length,
    });
  } catch (error: unknown) {
    return importErrorResponse(error, "Product import failed");
  }
}
