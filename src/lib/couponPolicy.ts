import { isAxiosError } from "axios";
import { NextResponse } from "next/server";

export type JsonRecord = Record<string, unknown>;

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
};
const MAX_BODY_BYTES = 32 * 1024;

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function privateCouponJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

export function couponId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new TypeError("Invalid coupon id");
  return id;
}

export async function readCouponBody(request: Request): Promise<JsonRecord> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new RangeError("Request body is too large");
  }

  const raw = await request.text();
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw new RangeError(raw ? "Request body is too large" : "Request body is required");
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new TypeError("Invalid JSON request body");
  }

  if (!isRecord(value)) throw new TypeError("Invalid request body");
  return value;
}

function boundedText(value: unknown, label: string, maximum: number, allowEmpty = false): string {
  if (typeof value !== "string") throw new TypeError(`${label} must be text`);
  const text = value.trim();
  if (!text && !allowEmpty) throw new TypeError(`${label} is required`);
  if (text.length > maximum) throw new RangeError(`${label} is too long`);
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text)) throw new TypeError(`Invalid ${label.toLowerCase()}`);
  return text;
}

function moneyText(value: unknown, label: string, allowEmpty = false): string {
  const text = boundedText(value, label, 40, allowEmpty);
  if (!text && allowEmpty) return "";
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new TypeError(`Invalid ${label.toLowerCase()}`);
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0 || amount > 999_999_999.99) {
    throw new RangeError(`Invalid ${label.toLowerCase()}`);
  }
  return text;
}

function expiryDate(value: unknown): string | null {
  if (value === null || value === "" || value === undefined) return null;
  const text = boundedText(value, "Expiry date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new TypeError("Invalid expiry date");

  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    throw new TypeError("Invalid expiry date");
  }
  return text;
}

function usageLimit(value: unknown): number | null {
  if (value === null || value === "" || value === undefined) return null;
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000_000) {
    throw new TypeError("Invalid usage limit");
  }
  return limit;
}

export function normalizeCouponPayload(body: JsonRecord): JsonRecord {
  const discountType = body.discount_type;
  if (!(["percent", "fixed_cart", "fixed_product"] as unknown[]).includes(discountType)) {
    throw new TypeError("Invalid discount type");
  }

  const amount = moneyText(body.amount, "Discount amount");
  if (discountType === "percent" && Number(amount) > 100) {
    throw new RangeError("Percentage discount cannot exceed 100");
  }

  return {
    code: boundedText(body.code, "Coupon code", 100).toLowerCase(),
    discount_type: discountType,
    amount,
    description: boundedText(body.description ?? "", "Description", 2_000, true),
    individual_use: true,
    date_expires: expiryDate(body.date_expires),
    minimum_amount: moneyText(body.minimum_amount ?? "", "Minimum amount", true),
    usage_limit: usageLimit(body.usage_limit),
  };
}

export function couponSummary(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;
  const id = Number(value.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const usageLimit = value.usage_limit === null ? null : Number(value.usage_limit);

  return {
    id,
    code: typeof value.code === "string" ? value.code.slice(0, 100) : "",
    discount_type: typeof value.discount_type === "string" ? value.discount_type : "",
    amount: typeof value.amount === "string" ? value.amount.slice(0, 40) : "0",
    date_expires: typeof value.date_expires === "string" ? value.date_expires.slice(0, 40) : null,
    description: typeof value.description === "string" ? value.description.slice(0, 2_000) : "",
    usage_limit:
      usageLimit !== null && Number.isSafeInteger(usageLimit) && usageLimit >= 0
        ? usageLimit
        : null,
    usage_count: Math.max(0, Number(value.usage_count) || 0),
    minimum_amount: typeof value.minimum_amount === "string" ? value.minimum_amount.slice(0, 40) : "",
    status: typeof value.status === "string" ? value.status.slice(0, 40) : "",
  };
}

export function couponErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof TypeError || error instanceof RangeError) {
    return privateCouponJson({ error: error.message }, 400);
  }

  if (isAxiosError(error)) {
    const upstreamStatus = Number(error.response?.status || 0);
    const status = [400, 404, 409].includes(upstreamStatus) ? upstreamStatus : 502;
    const data: unknown = error.response?.data;
    const safeMessage = isRecord(data) && typeof data.message === "string"
      ? data.message.slice(0, 240)
      : fallback;

    console.error("Coupon API request failed", {
      status: upstreamStatus || null,
      code: error.code || null,
    });

    return privateCouponJson({ error: status === 502 ? fallback : safeMessage }, status);
  }

  console.error("Coupon route failed", error instanceof Error ? error.message : "Unknown error");
  return privateCouponJson({ error: fallback }, 500);
}
