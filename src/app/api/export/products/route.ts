import { NextRequest } from "next/server";

import {
  csvResponse,
  ExportRequestError,
  exportErrorResponse,
  fetchExportCollection,
  isRecord,
  optionalEnum,
  optionalPositiveInteger,
  records,
  safeText,
  stringifyExportCsv,
  type JsonRecord,
} from "@/lib/exportPolicy";
import { getWooClient } from "@/lib/woo";
import { PRODUCT_CSV_COLUMNS } from "@/types/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRODUCT_TYPES = new Set(["simple", "grouped", "external", "variable"]);
const STOCK_STATUSES = new Set(["instock", "outofstock", "onbackorder"]);
const ALLOWED_COLUMNS = new Set<string>(PRODUCT_CSV_COLUMNS);

function firstRecord(value: unknown): JsonRecord | null {
  const first = records(value)[0];
  return first || null;
}

function externalId(product: JsonRecord): string {
  const item = records(product.meta_data).find((entry) => entry.key === "_external_id");
  return item ? safeText(item.value, 500) : "";
}

function attributeCell(
  product: JsonRecord,
  index: number,
  field: "name" | "value" | "visible" | "global",
): string {
  const attribute = records(product.attributes)[index - 1];
  if (!attribute) return "";
  if (field === "name") return safeText(attribute.name, 150);
  if (field === "value") {
    return Array.isArray(attribute.options)
      ? attribute.options.map((option) => safeText(option, 500)).filter(Boolean).join("|")
      : "";
  }
  if (field === "visible") return attribute.visible === true ? "1" : "0";
  return "0";
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = optionalPositiveInteger(searchParams, "category");
    const stock = optionalEnum(searchParams, "stock", STOCK_STATUSES);
    const productType = optionalEnum(searchParams, "ptype", PRODUCT_TYPES);
    const requestedColumns = String(searchParams.get("columns") || "")
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean);
    const columns = requestedColumns.length
      ? requestedColumns.filter((column) => ALLOWED_COLUMNS.has(column))
      : [...PRODUCT_CSV_COLUMNS];

    if (!columns.length) {
      throw new ExportRequestError("No valid export columns were selected");
    }

    const woo = await getWooClient();
    const products = await fetchExportCollection(woo, "/products", {
      status: "any",
      ...(category ? { category } : {}),
      ...(stock ? { stock_status: stock } : {}),
      ...(productType ? { type: productType } : {}),
    });

    const rows = products.map((product) => {
      const dimensions = isRecord(product.dimensions) ? product.dimensions : {};
      const firstImage = firstRecord(product.images);
      const groupedProducts = Array.isArray(product.grouped_products)
        ? product.grouped_products.map((id) => safeText(id, 30)).filter(Boolean).join("|")
        : "";
      const values: Record<string, string> = {
        id: safeText(product.id, 30),
        sku: safeText(product.sku, 100),
        name: safeText(product.name, 300),
        type: safeText(product.type, 40),
        category: records(product.categories)
          .map((item) => safeText(item.name, 200))
          .filter(Boolean)
          .join("|"),
        status: safeText(product.status, 40),
        visibility: safeText(product.catalog_visibility, 40),
        "short description": safeText(product.short_description),
        Description: safeText(product.description),
        "regular price": safeText(product.regular_price, 50),
        "manage stock": product.manage_stock === true ? "1" : "0",
        quantity: product.stock_quantity === null || product.stock_quantity === undefined
          ? ""
          : safeText(product.stock_quantity, 50),
        backorder: safeText(product.backorders, 30),
        weight: safeText(product.weight, 50),
        length: safeText(dimensions.length, 50),
        width: safeText(dimensions.width, 50),
        height: safeText(dimensions.height, 50),
        "image url": firstImage ? safeText(firstImage.src, 2_000) : "",
        "Grouped products": groupedProducts,
        "Attribute 1 name": attributeCell(product, 1, "name"),
        "Attribute 1 value(s)": attributeCell(product, 1, "value"),
        "Attribute 1 visible": attributeCell(product, 1, "visible"),
        "Attribute 1 global": attributeCell(product, 1, "global"),
        "Attribute 2 name": attributeCell(product, 2, "name"),
        "Attribute 2 value(s)": attributeCell(product, 2, "value"),
        "Attribute 2 visible": attributeCell(product, 2, "visible"),
        "Attribute 2 global": attributeCell(product, 2, "global"),
        "Attribute 3 name": attributeCell(product, 3, "name"),
        "Attribute 3 value(s)": attributeCell(product, 3, "value"),
        "Attribute 3 visible": attributeCell(product, 3, "visible"),
        "Attribute 3 global": attributeCell(product, 3, "global"),
        "Attribute 4 name": attributeCell(product, 4, "name"),
        "Attribute 4 value(s)": attributeCell(product, 4, "value"),
        "Attribute 4 visible": attributeCell(product, 4, "visible"),
        "Attribute 4 global": attributeCell(product, 4, "global"),
        "Attribute 5 name": attributeCell(product, 5, "name"),
        "Attribute 5 value(s)": attributeCell(product, 5, "value"),
        "Attribute 5 visible": attributeCell(product, 5, "visible"),
        "Attribute 5 global": attributeCell(product, 5, "global"),
        external_id: externalId(product),
      };

      return columns.map((column) => values[column] || "");
    });

    const date = new Date().toISOString().slice(0, 10);
    return csvResponse(
      stringifyExportCsv([columns, ...rows]),
      `products-export-${date}.csv`,
    );
  } catch (error: unknown) {
    return exportErrorResponse(error, "Product export failed");
  }
}
