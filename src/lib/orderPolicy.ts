import { NextResponse } from "next/server";

export type JsonRecord = Record<string, unknown>;

export class OrderRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "OrderRequestError";
    this.status = status;
  }
}

export const MUTABLE_ORDER_STATUSES = new Set([
  "pending",
  "processing",
  "on-hold",
  "completed",
  "cancelled",
  "failed",
]);

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

export function privateJson(
  body: unknown,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function readJsonObject(
  request: Request,
  maxBytes = 64 * 1024
): Promise<JsonRecord> {
  const declaredLength = Number(
    request.headers.get("content-length") || "0"
  );

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maxBytes
  ) {
    throw new OrderRequestError(
      "Request body is too large.",
      413
    );
  }

  const raw = await request.text();
  const actualBytes = new TextEncoder().encode(raw).length;

  if (actualBytes > maxBytes) {
    throw new OrderRequestError(
      "Request body is too large.",
      413
    );
  }

  if (!raw.trim()) {
    throw new OrderRequestError(
      "A JSON request body is required."
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new OrderRequestError(
      "Invalid JSON request body."
    );
  }

  if (!isRecord(parsed)) {
    throw new OrderRequestError(
      "The request body must be a JSON object."
    );
  }

  return parsed;
}

export function parsePositiveInteger(
  value: unknown,
  field: string,
  max = Number.MAX_SAFE_INTEGER
): number {
  const parsed =
    typeof value === "number" ? value : Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    parsed > max
  ) {
    throw new OrderRequestError(`${field} is invalid.`);
  }

  return parsed;
}

export function parseOrderId(value: unknown): number {
  return parsePositiveInteger(
    value,
    "Order ID",
    2_147_483_647
  );
}

export function parseBoundedString(
  value: unknown,
  field: string,
  maxLength: number,
  options: {
    required?: boolean;
    allowNewlines?: boolean;
  } = {}
): string {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new OrderRequestError(`${field} is required.`);
    }

    return "";
  }

  if (typeof value !== "string") {
    throw new OrderRequestError(`${field} is invalid.`);
  }

  const cleaned = value.trim();
  const forbidden = options.allowNewlines
    ? /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/
    : /[\x00-\x1F\x7F]/;

  if (forbidden.test(cleaned)) {
    throw new OrderRequestError(
      `${field} contains unsupported characters.`
    );
  }

  if (options.required && !cleaned) {
    throw new OrderRequestError(`${field} is required.`);
  }

  if (cleaned.length > maxLength) {
    throw new OrderRequestError(`${field} is too long.`);
  }

  return cleaned;
}

export function parseAmount(
  value: unknown,
  field: string,
  options: {
    min?: number;
    max?: number;
  } = {}
): number {
  const parsed =
    typeof value === "number" ? value : Number(value);
  const min = options.min ?? 0;
  const max = options.max ?? 10_000_000;

  if (
    !Number.isFinite(parsed) ||
    parsed < min ||
    parsed > max
  ) {
    throw new OrderRequestError(`${field} is invalid.`);
  }

  return Math.round(parsed * 100) / 100;
}

export function parseEmail(value: unknown): string {
  const email = parseBoundedString(
    value,
    "Email",
    254
  ).toLowerCase();

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new OrderRequestError("Email is invalid.");
  }

  return email;
}

export function parseOrderStatus(value: unknown): string {
  const status = parseBoundedString(
    value,
    "Order status",
    32,
    { required: true }
  ).toLowerCase();

  if (!MUTABLE_ORDER_STATUSES.has(status)) {
    throw new OrderRequestError(
      "This order status cannot be set from the dashboard."
    );
  }

  return status;
}

export function requestErrorResponse(
  error: unknown,
  fallback: string
): NextResponse {
  if (error instanceof OrderRequestError) {
    return privateJson(
      { ok: false, error: error.message },
      error.status
    );
  }

  return privateJson(
    { ok: false, error: fallback },
    500
  );
}

export function safeUpstreamStatus(error: unknown): number {
  if (!isRecord(error)) {
    return 502;
  }

  const response = error.response;

  if (!isRecord(response)) {
    return 502;
  }

  const status = Number(response.status);

  if (status === 400 || status === 404 || status === 409) {
    return status;
  }

  return 502;
}

export function logOrderError(
  scope: string,
  error: unknown
): void {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown order service error";

  console.error(`[orders:${scope}] ${message}`);
}
