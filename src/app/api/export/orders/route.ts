import type { AxiosInstance } from "axios";
import { NextRequest } from "next/server";

import {
  csvResponse,
  ExportRequestError,
  exportErrorResponse,
  fetchExportCollection,
  isRecord,
  optionalDate,
  optionalEnum,
  optionalPositiveInteger,
  records,
  safeId,
  safeText,
  stringifyExportCsv,
} from "@/lib/exportPolicy";
import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ORDER_STATUSES = new Set([
  "all", "any", "pending", "processing", "on-hold", "completed",
  "cancelled", "refunded", "failed",
]);
const PRESETS = new Set(["today", "yesterday", "this_week", "this_month", "last_month"]);

function presetRange(preset: string): { from: string; to: string } | null {
  if (!preset) return null;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const format = (date: Date) => date.toISOString().slice(0, 10);

  if (preset === "today") return { from: format(today), to: format(today) };
  if (preset === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return { from: format(yesterday), to: format(yesterday) };
  }
  if (preset === "this_week") {
    const start = new Date(today);
    const weekday = start.getUTCDay() || 7;
    start.setUTCDate(start.getUTCDate() - (weekday - 1));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return { from: format(start), to: format(end) };
  }
  if (preset === "this_month") {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
    return { from: format(start), to: format(end) };
  }
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  return { from: format(start), to: format(end) };
}

function inDateRange(value: unknown, from: string, to: string): boolean {
  if (!from && !to) return true;
  const raw = safeText(value, 50);
  if (!raw) return false;
  const time = Date.parse(`${raw.replace(/Z$/i, "")}Z`);
  if (!Number.isFinite(time)) return false;
  if (from && time < Date.parse(`${from}T00:00:00Z`)) return false;
  if (to && time > Date.parse(`${to}T23:59:59Z`)) return false;
  return true;
}

function chunks<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

async function productCategoryMap(
  woo: AxiosInstance,
  productIds: number[],
): Promise<Map<number, Set<number>>> {
  const output = new Map<number, Set<number>>();
  const uniqueIds = Array.from(new Set(productIds.filter((id) => id > 0)));

  for (const ids of chunks(uniqueIds, 100)) {
    const products = await fetchExportCollection(
      woo,
      "/products",
      {
        include: ids.join(","),
        status: "any",
        orderby: "id",
        order: "asc",
        _fields: "id,categories",
      },
      1,
    );
    for (const product of products) {
      const productId = safeId(product.id);
      if (!productId) continue;
      const categoryIds = records(product.categories)
        .map((category) => safeId(category.id))
        .filter(Boolean);
      output.set(productId, new Set(categoryIds));
    }
  }

  return output;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawStatus = optionalEnum(searchParams, "status", ORDER_STATUSES);
    const preset = optionalEnum(searchParams, "preset", PRESETS);
    const explicitFrom = optionalDate(searchParams, "from");
    const explicitTo = optionalDate(searchParams, "to");
    const categoryId = optionalPositiveInteger(searchParams, "category");
    const presetDates = presetRange(preset);
    const from = explicitFrom || presetDates?.from || "";
    const to = explicitTo || presetDates?.to || "";
    if (from && to && from > to) {
      throw new ExportRequestError("The start date must not be after the end date");
    }

    const status = rawStatus === "all" || rawStatus === "any" ? "" : rawStatus;
    const woo = await getWooClient();
    const orders = await fetchExportCollection(woo, "/orders", {
      orderby: "date",
      order: "desc",
      status: status || "any",
    });
    let filtered = orders.filter((order) =>
      inDateRange(order.date_created_gmt || order.date_created, from, to),
    );

    if (categoryId) {
      const productIds = filtered.flatMap((order) =>
        records(order.line_items).map((item) => safeId(item.product_id)).filter(Boolean),
      );
      const categoriesByProduct = await productCategoryMap(woo, productIds);
      filtered = filtered.filter((order) =>
        records(order.line_items).some((item) =>
          categoriesByProduct.get(safeId(item.product_id))?.has(categoryId) === true,
        ),
      );
    }

    const headers = [
      "id", "number", "date", "status", "payment_method", "payment_title",
      "currency", "total", "customer_name", "customer_email", "customer_phone",
      "billing_address_1", "billing_city", "billing_state", "billing_postcode",
      "billing_country", "shipping_address_1", "shipping_city", "shipping_state",
      "shipping_postcode", "shipping_country", "items",
    ];
    const rows = filtered.map((order) => {
      const billing = isRecord(order.billing) ? order.billing : {};
      const shipping = isRecord(order.shipping) ? order.shipping : {};
      const items = records(order.line_items)
        .map((item) => `${safeText(item.name, 300)} x ${safeText(item.quantity, 30)}`)
        .join("; ");
      const customerName = [
        safeText(billing.first_name, 100),
        safeText(billing.last_name, 100),
      ].filter(Boolean).join(" ");
      const id = safeId(order.id);

      return [
        id || "",
        safeText(order.number, 100) || (id ? String(id) : ""),
        safeText(order.date_created, 50).slice(0, 19),
        safeText(order.status, 40),
        safeText(order.payment_method, 100),
        safeText(order.payment_method_title, 200),
        safeText(order.currency, 20),
        safeText(order.total, 50),
        customerName,
        safeText(billing.email, 254),
        safeText(billing.phone, 50),
        safeText(billing.address_1, 500),
        safeText(billing.city, 150),
        safeText(billing.state, 100),
        safeText(billing.postcode, 30),
        safeText(billing.country, 20),
        safeText(shipping.address_1, 500),
        safeText(shipping.city, 150),
        safeText(shipping.state, 100),
        safeText(shipping.postcode, 30),
        safeText(shipping.country, 20),
        items,
      ];
    });

    return csvResponse(stringifyExportCsv([headers, ...rows]), "orders-export.csv");
  } catch (error: unknown) {
    return exportErrorResponse(error, "Export failed");
  }
}
