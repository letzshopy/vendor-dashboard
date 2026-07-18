import { isAxiosError } from "axios";
import { NextResponse } from "next/server";

export type JsonRecord = Record<string, unknown>;

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
};

const ORDER_STATUSES = new Set([
  "all",
  "any",
  "pending",
  "processing",
  "on-hold",
  "completed",
  "cancelled",
  "refunded",
  "failed",
]);

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function privateReportJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

export function safeText(value: unknown, maximum = 500): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, maximum);
}

export function safeNumber(value: unknown): number {
  const number = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(number) ? number : 0;
}

export function safeId(value: unknown): number {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

export function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function responsePages(headers: unknown, maximum: number): number {
  if (!isRecord(headers)) return 1;
  const raw = headers["x-wp-totalpages"] ?? headers["X-WP-TotalPages"] ?? 1;
  const pages = Number.parseInt(String(raw), 10);
  return Math.min(Number.isFinite(pages) && pages > 0 ? pages : 1, maximum);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function reportRange(searchParams: URLSearchParams): {
  date_from: string;
  date_to: string;
  status: string;
} {
  const dateFrom = String(searchParams.get("date_from") || "").trim();
  const dateTo = String(searchParams.get("date_to") || "").trim();
  const status = String(searchParams.get("status") || "all").trim().toLowerCase() || "all";

  if (dateFrom && !validDate(dateFrom)) throw new TypeError("Invalid start date");
  if (dateTo && !validDate(dateTo)) throw new TypeError("Invalid end date");
  if (dateFrom && dateTo && dateFrom > dateTo) throw new TypeError("Start date must not be after end date");
  if (!ORDER_STATUSES.has(status)) throw new TypeError("Invalid order status");

  return { date_from: dateFrom, date_to: dateTo, status };
}

export function reportErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof TypeError || error instanceof RangeError) {
    return privateReportJson({ error: error.message }, 400);
  }

  if (isAxiosError(error)) {
    const upstreamStatus = Number(error.response?.status || 0);
    const status = upstreamStatus === 404 ? 404 : 502;

    console.error("Report API request failed", {
      status: upstreamStatus || null,
      code: error.code || null,
    });

    return privateReportJson({ error: fallback }, status);
  }

  console.error("Report route failed", error instanceof Error ? error.message : "Unknown error");
  return privateReportJson({ error: fallback }, 500);
}
