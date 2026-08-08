import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import { NextResponse } from "next/server";

import {
  normalizeShippingZones,
} from "@/lib/shippingPolicy";
import { fetchInternalWp } from "@/lib/wpClient";

const MAX_REQUEST_BYTES = 524_288;
const UPSTREAM_TIMEOUT_MS = 60_000;

type JsonRecord = Record<string, unknown>;

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function privateJson(
  body: unknown,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
    },
  });
}

async function readRequestJson(
  request: Request
): Promise<unknown> {
  const contentLength = Number(
    request.headers.get("content-length") ||
      "0"
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_REQUEST_BYTES
  ) {
    throw new Error("Invalid body size");
  }

  const text = await request.text();

  if (
    !text ||
    Buffer.byteLength(text, "utf8") >
      MAX_REQUEST_BYTES
  ) {
    throw new Error("Invalid body size");
  }

  return JSON.parse(text) as unknown;
}

export async function POST(
  request: Request
) {
  const storeFeatureError = await requireStoreFeature("shipping");
  if (storeFeatureError) return storeFeatureError;

  let payload: unknown;

  try {
    payload = await readRequestJson(
      request
    );
  } catch {
    return privateJson(
      {
        ok: false,
        error:
          "Invalid shipping zones request.",
      },
      400
    );
  }

  if (!isRecord(payload)) {
    return privateJson(
      {
        ok: false,
        error:
          "Invalid shipping zones request.",
      },
      400
    );
  }

  const zones = normalizeShippingZones(
    payload.zones
  );

  if (!zones) {
    return privateJson(
      {
        ok: false,
        error: "Invalid shipping zones.",
      },
      400
    );
  }

  try {
    const response = await fetchInternalWp(
      "/wp-json/letz/v1/shipping/sync-zones",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({ zones }),
      },
      UPSTREAM_TIMEOUT_MS
    );

    const responsePayload: unknown =
      await response
        .json()
        .catch(() => null);

    if (
      !response.ok ||
      !isRecord(responsePayload)
    ) {
      console.error(
        `Shipping zone sync failed with status ${response.status}.`
      );

      const validation =
        response.status === 400 ||
        response.status === 422;

      return privateJson(
        {
          ok: false,
          error: validation
            ? "Invalid shipping zones."
            : "Failed to sync shipping zones.",
        },
        validation ? response.status : 502
      );
    }

    return privateJson(responsePayload);
  } catch (error: unknown) {
    console.error(
      "Shipping zone sync failed:",
      error instanceof Error
        ? error.message
        : "Unknown shipping error"
    );

    return privateJson(
      {
        ok: false,
        error:
          "Failed to sync shipping zones.",
      },
      502
    );
  }
}
