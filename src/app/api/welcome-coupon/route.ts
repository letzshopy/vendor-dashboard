import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import { NextRequest, NextResponse } from "next/server";

import { fetchInternalWp } from "@/lib/wpClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
};
const MAX_BODY_BYTES = 16 * 1024;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

async function readUpstream(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: "WordPress returned an invalid response" };
  }
}

function upstreamMessage(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback;

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.slice(0, 240);
  }

  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.slice(0, 240);
  }

  return fallback;
}

function safeText(
  value: unknown,
  label: string,
  maximum: number,
  allowEmpty = false
) {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be text`);
  }

  const text = value.trim();
  if (!text && !allowEmpty) {
    throw new TypeError(`${label} is required`);
  }
  if (text.length > maximum) {
    throw new RangeError(`${label} is too long`);
  }
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text)) {
    throw new TypeError(`Invalid ${label.toLowerCase()}`);
  }

  return text;
}

function normalizeSettings(value: unknown) {
  if (!isRecord(value)) {
    throw new TypeError("Invalid welcome-offer settings");
  }

  if (typeof value.enabled !== "boolean") {
    throw new TypeError("Enabled must be true or false");
  }

  const amount = Number(value.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    throw new RangeError("Discount amount must be greater than 0");
  }

  const validDays = Number(value.valid_days);
  if (!Number.isSafeInteger(validDays) || validDays < 1 || validDays > 365) {
    throw new RangeError("Validity must be between 1 and 365 days");
  }

  const homepageVisible =
    value.homepage_visible === undefined
      ? true
      : value.homepage_visible;

  if (typeof homepageVisible !== "boolean") {
    throw new TypeError("Homepage visibility must be true or false");
  }

  const promotionalCopy = safeText(
    value.promotional_copy ?? "",
    "Promotional copy",
    2_000,
    true
  );

  if (homepageVisible && !promotionalCopy) {
    throw new TypeError(
      "Promotional copy is required when homepage visibility is enabled"
    );
  }

  return {
    enabled: value.enabled,
    amount: Number(amount.toFixed(2)),
    valid_days: validDays,
    homepage_visible: homepageVisible,
    promotional_copy: promotionalCopy,
  };
}

export async function GET() {
  const storeFeatureError = await requireStoreFeature("welcome_offer");
  if (storeFeatureError) return storeFeatureError;

  try {
    const response = await fetchInternalWp(
      "/wp-json/letz/v1/welcome-coupon",
      { method: "GET" }
    );
    const payload = await readUpstream(response);

    if (!response.ok) {
      return privateJson(
        { error: upstreamMessage(payload, "Failed to load Welcome Offer") },
        response.status >= 400 && response.status < 500
          ? response.status
          : 502
      );
    }

    return privateJson(payload);
  } catch (error: unknown) {
    console.error(
      "Welcome Offer GET failed",
      error instanceof Error ? error.message : "Unknown error"
    );
    return privateJson({ error: "Failed to load Welcome Offer" }, 500);
  }
}

export async function PUT(request: NextRequest) {
  const storeFeatureError = await requireStoreFeature("welcome_offer");
  if (storeFeatureError) return storeFeatureError;

  try {
    const declaredLength = Number(
      request.headers.get("content-length") || 0
    );
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_BODY_BYTES
    ) {
      return privateJson({ error: "Request body is too large" }, 413);
    }

    const raw = await request.text();
    if (
      !raw ||
      new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES
    ) {
      return privateJson(
        {
          error: raw
            ? "Request body is too large"
            : "Request body is required",
        },
        raw ? 413 : 400
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return privateJson({ error: "Invalid JSON request body" }, 400);
    }

    const settings = normalizeSettings(parsed);
    const response = await fetchInternalWp(
      "/wp-json/letz/v1/welcome-coupon",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      }
    );
    const payload = await readUpstream(response);

    if (!response.ok) {
      return privateJson(
        { error: upstreamMessage(payload, "Failed to save Welcome Offer") },
        response.status >= 400 && response.status < 500
          ? response.status
          : 502
      );
    }

    return privateJson(payload);
  } catch (error: unknown) {
    if (error instanceof TypeError || error instanceof RangeError) {
      return privateJson({ error: error.message }, 400);
    }

    console.error(
      "Welcome Offer PUT failed",
      error instanceof Error ? error.message : "Unknown error"
    );
    return privateJson({ error: "Failed to save Welcome Offer" }, 500);
  }
}
