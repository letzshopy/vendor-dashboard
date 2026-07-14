import type { AxiosInstance } from "axios";
import { NextRequest } from "next/server";

import {
  booleanFlag,
  csvResponse,
  ExportRequestError,
  exportErrorResponse,
  fetchExportCollection,
  isRecord,
  optionalEnum,
  optionalPositiveInteger,
  records,
  safeId,
  safeText,
  stringifyExportCsv,
  type JsonRecord,
} from "@/lib/exportPolicy";
import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_ATTR_COLS = 5;
const ENTITIES = new Set(["products", "orders", "customers"]);
const STOCK_STATUSES = new Set(["instock", "outofstock", "onbackorder"]);
const PRODUCT_TYPES = new Set(["simple", "grouped", "external", "variable"]);

type RouteParams = {
  params: Promise<{ entity: string }>;
};

function truthyCell(value: unknown): string {
  if (value === true) return "1";
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    return normalized === "yes" || normalized === "1" ? "1" : value;
  }
  return value ? "1" : "";
}

function attributeCells(product: JsonRecord, variation = false): unknown[] {
  const output: unknown[] = [];
  const attributes = records(product.attributes);

  for (let index = 0; index < MAX_ATTR_COLS; index += 1) {
    const attribute = attributes[index];
    if (!attribute) {
      output.push("", "", "", "");
      continue;
    }

    const name = safeText(attribute.name || attribute.taxonomy, 150);
    const value = variation
      ? safeText(attribute.option, 1_000)
      : Array.isArray(attribute.options)
        ? attribute.options.map((option) => safeText(option, 500)).filter(Boolean).join(" | ")
        : safeText(attribute.options, 1_000);
    output.push(
      name,
      value,
      variation ? "" : truthyCell(attribute.visible),
      variation ? "" : safeText(attribute.taxonomy, 150) ? "1" : "",
    );
  }

  return output;
}

function categoryNames(product: JsonRecord): string {
  return records(product.categories)
    .map((category) => safeText(category.name, 200))
    .filter(Boolean)
    .join("|");
}

function imageUrls(product: JsonRecord): string {
  return records(product.images)
    .map((image) => safeText(image.src, 2_000))
    .filter(Boolean)
    .join("|");
}

function productRow(
  product: JsonRecord,
  categories: string,
  images: string,
  groupedSkus: string,
): unknown[] {
  return [
    safeId(product.id) || "",
    safeText(product.sku, 100),
    safeText(product.name, 300),
    safeText(product.regular_price, 50),
    safeText(product.sale_price, 50),
    safeText(product.stock_status, 40),
    truthyCell(product.manage_stock),
    product.stock_quantity ?? "",
    safeText(product.type, 40),
    categories,
    safeText(product.short_description),
    safeText(product.description),
    images,
    groupedSkus,
    ...attributeCells(product),
  ];
}

function variationRow(variation: JsonRecord, parent: JsonRecord): unknown[] {
  const image = isRecord(variation.image) ? safeText(variation.image.src, 2_000) : "";
  return [
    safeId(variation.id) || "",
    safeText(variation.sku, 100),
    safeText(variation.name, 300),
    safeText(variation.regular_price, 50),
    safeText(variation.sale_price, 50),
    safeText(variation.stock_status, 40),
    truthyCell(variation.manage_stock),
    variation.stock_quantity ?? "",
    "variation",
    categoryNames(parent),
    "",
    "",
    image,
    "",
    ...attributeCells(variation, true),
  ];
}

async function variationsForParent(
  woo: AxiosInstance,
  parent: JsonRecord,
): Promise<JsonRecord[]> {
  const parentId = safeId(parent.id);
  return parentId
    ? fetchExportCollection(woo, `/products/${parentId}/variations`)
    : [];
}

async function exportProducts(woo: AxiosInstance, searchParams: URLSearchParams) {
  const category = optionalPositiveInteger(searchParams, "category");
  const stockStatus = optionalEnum(searchParams, "stock_status", STOCK_STATUSES);
  const productType = optionalEnum(searchParams, "product_type", PRODUCT_TYPES);
  const includeVariations = booleanFlag(searchParams, "include_variations");
  const includeGroupedChildren = booleanFlag(searchParams, "include_grouped_children");
  const products = await fetchExportCollection(woo, "/products", {
    ...(category ? { category } : {}),
    ...(stockStatus ? { stock_status: stockStatus } : {}),
    ...(productType ? { type: productType } : {}),
  });

  const headers: unknown[] = [
    "id", "sku", "name", "regular_price", "sale_price", "stock_status",
    "manage_stock", "stock_quantity", "type", "categories", "short_description",
    "description", "images", "Grouped products",
  ];
  for (let index = 1; index <= MAX_ATTR_COLS; index += 1) {
    headers.push(
      `Attribute ${index} name`,
      `Attribute ${index} value(s)`,
      `Attribute ${index} visible`,
      `Attribute ${index} global`,
    );
  }

  const byId = new Map<number, JsonRecord>();
  for (const product of products) {
    const id = safeId(product.id);
    if (id) byId.set(id, product);
  }

  const rows: unknown[][] = [];
  const variableParents: JsonRecord[] = [];
  for (const product of products) {
    const type = safeText(product.type, 40) || "simple";
    if (type === "variable") {
      rows.push(productRow(product, categoryNames(product), imageUrls(product), ""));
      if (includeVariations) variableParents.push(product);
      continue;
    }

    if (type === "grouped") {
      const childIds = Array.isArray(product.grouped_products)
        ? product.grouped_products.map(safeId).filter(Boolean)
        : [];
      const groupedSkus = childIds
        .map((id) => safeText(byId.get(id)?.sku, 100))
        .filter(Boolean)
        .join(",");
      rows.push(productRow(product, categoryNames(product), imageUrls(product), groupedSkus));

      if (includeGroupedChildren) {
        for (const childId of childIds) {
          const child = byId.get(childId);
          if (child) rows.push(productRow(child, categoryNames(child), imageUrls(child), ""));
        }
      }
      continue;
    }

    rows.push(productRow(product, categoryNames(product), imageUrls(product), ""));
  }

  for (const parent of variableParents) {
    const variations = await variationsForParent(woo, parent);
    for (const variation of variations) rows.push(variationRow(variation, parent));
  }

  return csvResponse(stringifyExportCsv([headers, ...rows]), "products-export.csv");
}

async function exportOrders(woo: AxiosInstance) {
  const orders = await fetchExportCollection(woo, "/orders");
  const headers = [
    "id", "status", "date_created", "total", "customer_note", "billing_first_name",
    "billing_last_name", "billing_phone", "billing_email", "billing_address_1",
    "billing_city", "billing_postcode", "shipping_address_1", "shipping_city",
    "shipping_postcode",
  ];
  const rows = orders.map((order) => {
    const billing = isRecord(order.billing) ? order.billing : {};
    const shipping = isRecord(order.shipping) ? order.shipping : {};
    return [
      safeId(order.id) || "",
      safeText(order.status, 40),
      safeText(order.date_created, 50),
      safeText(order.total, 50),
      safeText(order.customer_note, 20_000),
      safeText(billing.first_name, 100),
      safeText(billing.last_name, 100),
      safeText(billing.phone, 50),
      safeText(billing.email, 254),
      safeText(billing.address_1, 500),
      safeText(billing.city, 150),
      safeText(billing.postcode, 30),
      safeText(shipping.address_1, 500),
      safeText(shipping.city, 150),
      safeText(shipping.postcode, 30),
    ];
  });
  return csvResponse(stringifyExportCsv([headers, ...rows]), "orders-export.csv");
}

async function exportCustomers(woo: AxiosInstance) {
  const customers = await fetchExportCollection(woo, "/customers");
  const headers = [
    "id", "email", "first_name", "last_name", "username", "billing_phone",
    "billing_address_1", "billing_city", "billing_postcode",
  ];
  const rows = customers.map((customer) => {
    const billing = isRecord(customer.billing) ? customer.billing : {};
    return [
      safeId(customer.id) || "",
      safeText(customer.email, 254),
      safeText(customer.first_name, 100),
      safeText(customer.last_name, 100),
      safeText(customer.username, 100),
      safeText(billing.phone, 50),
      safeText(billing.address_1, 500),
      safeText(billing.city, 150),
      safeText(billing.postcode, 30),
    ];
  });
  return csvResponse(stringifyExportCsv([headers, ...rows]), "customers-export.csv");
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { entity: rawEntity } = await params;
    const entity = String(rawEntity || "").trim().toLowerCase();
    if (!ENTITIES.has(entity)) {
      throw new ExportRequestError("Unsupported export entity");
    }

    const woo = await getWooClient();
    if (entity === "products") return exportProducts(woo, request.nextUrl.searchParams);
    if (entity === "orders") return exportOrders(woo);
    return exportCustomers(woo);
  } catch (error: unknown) {
    return exportErrorResponse(error, "Export failed");
  }
}
