import { NextResponse } from "next/server";

import { fetchInternalWp } from "@/lib/wpClient";

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

export async function GET() {
  try {
    const response = await fetchInternalWp(
      "/wp-json/letz/v1/shipping/state",
      { method: "GET" }
    );

    const payload: unknown =
      await response
        .json()
        .catch(() => null);

    if (
      !response.ok ||
      !isRecord(payload)
    ) {
      console.error(
        `Shipping state request failed with status ${response.status}.`
      );

      return privateJson(
        {
          ok: false,
          error:
            "Failed to load shipping settings.",
        },
        502
      );
    }

    return privateJson(payload);
  } catch (error: unknown) {
    console.error(
      "Shipping state request failed:",
      error instanceof Error
        ? error.message
        : "Unknown shipping error"
    );

    return privateJson(
      {
        ok: false,
        error:
          "Failed to load shipping settings.",
      },
      502
    );
  }
}
