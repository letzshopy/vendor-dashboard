import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import { NextResponse } from "next/server";

import { fetchInternalWp } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

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
  const storeFeatureError = await requireStoreFeature("menu");
  if (storeFeatureError) return storeFeatureError;

  try {
    const response = await fetchInternalWp(
      "/wp-json/letzshopy/v1/menus",
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
        `Menu list request failed with status ${response.status}.`
      );

      return privateJson(
        {
          error:
            "Failed to load store menus.",
        },
        502
      );
    }

    return privateJson(payload);
  } catch (error: unknown) {
    console.error(
      "Menu list proxy failed:",
      error instanceof Error
        ? error.message
        : "Unknown menu error"
    );

    return privateJson(
      {
        error:
          "Failed to load store menus.",
      },
      502
    );
  }
}
