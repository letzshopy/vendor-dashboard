import { NextResponse } from "next/server";

import {
  normalizeShippingClasses,
} from "@/lib/shippingPolicy";
import { fetchInternalWp } from "@/lib/wpClient";

const MAX_REQUEST_BYTES = 131_072;
const UPSTREAM_TIMEOUT_MS = 30_000;

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
          "Invalid shipping classes request.",
      },
      400
    );
  }

  if (!isRecord(payload)) {
    return privateJson(
      {
        ok: false,
        error:
          "Invalid shipping classes request.",
      },
      400
    );
  }

  const classes =
    normalizeShippingClasses(
      payload.classes
    );

  if (!classes) {
    return privateJson(
      {
        ok: false,
        error:
          "Invalid shipping classes.",
      },
      400
    );
  }

  try {
    const response = await fetchInternalWp(
      "/wp-json/letz/v1/shipping/sync-classes",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({ classes }),
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
        `Shipping class sync failed with status ${response.status}.`
      );

      const validation =
        response.status === 400 ||
        response.status === 422;

      return privateJson(
        {
          ok: false,
          error: validation
            ? "Invalid shipping classes."
            : "Failed to sync shipping classes.",
        },
        validation ? response.status : 502
      );
    }

    return privateJson(responsePayload);
  } catch (error: unknown) {
    console.error(
      "Shipping class sync failed:",
      error instanceof Error
        ? error.message
        : "Unknown shipping error"
    );

    return privateJson(
      {
        ok: false,
        error:
          "Failed to sync shipping classes.",
      },
      502
    );
  }
}
