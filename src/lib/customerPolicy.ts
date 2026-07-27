import { isAxiosError } from "axios";
import { NextResponse } from "next/server";

export type JsonRecord = Record<string, unknown>;

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
};

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function privateCustomerJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

export function positiveQueryInteger(
  value: string | null,
  fallback: number,
  maximum: number,
): number {
  if (!value) return fallback;
  if (!/^\d{1,9}$/.test(value)) throw new TypeError("Invalid pagination value");

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new TypeError("Invalid pagination value");
  }

  return Math.min(parsed, maximum);
}

export function customerSearch(value: string | null): string {
  const search = String(value || "").trim().toLowerCase();
  if (search.length > 200) throw new RangeError("Search term is too long");
  if (/[\x00-\x1F\x7F]/.test(search)) throw new TypeError("Invalid search term");
  return search;
}

export function safeText(value: unknown, maximum = 500): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, maximum);
}

export function safeMoney(value: unknown): number {
  const amount = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(amount) ? amount : 0;
}

export function safePositiveId(value: unknown): number {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

export function orderRows(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function responseTotalPages(headers: unknown, maximum: number): number {
  if (!isRecord(headers)) return 1;
  const raw = headers["x-wp-totalpages"] ?? headers["X-WP-TotalPages"] ?? 1;
  const pages = Number.parseInt(String(raw), 10);
  return Math.min(Number.isFinite(pages) && pages > 0 ? pages : 1, maximum);
}

export function responseTotal(headers: unknown): number {
  if (!isRecord(headers)) return 0;
  const raw = headers["x-wp-total"] ?? headers["X-WP-Total"] ?? 0;
  const total = Number.parseInt(String(raw), 10);
  return Number.isFinite(total) && total > 0 ? total : 0;
}

export function billingRecord(order: JsonRecord): JsonRecord {
  return isRecord(order.billing) ? order.billing : {};
}

export function customerIdentity(billing: JsonRecord): {
  key: string;
  name: string;
  email: string;
  phone: string;
} {
  const firstName = safeText(billing.first_name, 100).trim();
  const lastName = safeText(billing.last_name, 100).trim();
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || "(guest)";
  const email = safeText(billing.email, 254).trim().toLowerCase();
  const phone = safeText(billing.phone, 50).trim();
  const key = email || `guest:${(name || phone || "unknown").toLowerCase()}`;

  return { key, name, email, phone };
}

export function encodeCustomerKey(key: string): string {
  return Buffer.from(key, "utf8").toString("base64url");
}

export function decodeCustomerKey(value: unknown): string {
  if (typeof value !== "string" || value.length < 2 || value.length > 512) {
    throw new TypeError("Invalid customer id");
  }

  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new TypeError("Invalid customer id");

  const decoded = Buffer.from(value, "base64url").toString("utf8");
  if (!decoded || decoded.length > 320 || Buffer.from(decoded, "utf8").toString("base64url") !== value) {
    throw new TypeError("Invalid customer id");
  }

  if (decoded.startsWith("guest:")) {
    const guestKey = decoded.slice(6).trim();
    if (!guestKey || guestKey.length > 200) throw new TypeError("Invalid customer id");
    return decoded;
  }

  if (decoded.startsWith("user:")) {
    const userId = decoded.slice(5);
    if (!/^[1-9]\d{0,9}$/.test(userId)) throw new TypeError("Invalid customer id");
    return `user:${userId}`;
  }

  if (decoded.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decoded)) {
    throw new TypeError("Invalid customer id");
  }

  return decoded.toLowerCase();
}

export function normalizedAddress(value: unknown, includeContact = false): JsonRecord {
  const address = isRecord(value) ? value : {};
  const result: JsonRecord = {
    first_name: safeText(address.first_name, 100),
    last_name: safeText(address.last_name, 100),
    company: safeText(address.company, 200),
    address_1: safeText(address.address_1, 300),
    address_2: safeText(address.address_2, 300),
    city: safeText(address.city, 150),
    state: safeText(address.state, 100),
    postcode: safeText(address.postcode, 40),
    country: safeText(address.country, 10),
  };

  if (includeContact) {
    result.email = safeText(address.email, 254);
    result.phone = safeText(address.phone, 50);
  }

  return result;
}

export function normalizedLineItems(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 250).flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = safePositiveId(item.id);
    if (!id) return [];

    return [{
      id,
      product_id: safePositiveId(item.product_id),
      variation_id: safePositiveId(item.variation_id),
      name: safeText(item.name, 300),
      sku: safeText(item.sku, 100),
      quantity: Math.max(0, Number(item.quantity) || 0),
      total: safeText(item.total, 50),
    }];
  });
}

export function customerErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof TypeError || error instanceof RangeError) {
    return privateCustomerJson({ error: error.message }, 400);
  }

  if (isAxiosError(error)) {
    const upstreamStatus = Number(error.response?.status || 0);
    const status = upstreamStatus === 404 ? 404 : 502;

    console.error("Customer API request failed", {
      status: upstreamStatus || null,
      code: error.code || null,
    });

    return privateCustomerJson({ error: fallback }, status);
  }

  console.error("Customer route failed", error instanceof Error ? error.message : "Unknown error");
  return privateCustomerJson({ error: fallback }, 500);
}
