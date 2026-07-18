import { NextResponse } from "next/server";
import {
  fetchInternalWp,
} from "@/lib/wpClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UPSTREAM_TIMEOUT_MS = 15_000;

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

function boundedString(
  value: unknown,
  maxLength: number
): string {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function privateJson(
  body: JsonRecord,
  status = 200
): NextResponse<JsonRecord> {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET() {
  try {
    const response = await fetchInternalWp(
      "/wp-json/letz/v1/account/agreement/status",
      {
        method: "GET",
      },
      UPSTREAM_TIMEOUT_MS
    );

    if (!response.ok) {
      console.error(
        `Agreement status request failed with status ${response.status}.`
      );

      return privateJson(
        {
          ok: false,
          error:
            "Failed to load agreement status.",
        },
        502
      );
    }

    const payload: unknown =
      await response.json();

    const root = isRecord(payload)
      ? payload
      : {};

    const legal = isRecord(root.legal)
      ? root.legal
      : {};

    return privateJson({
      ok: true,
      legal: {
        vendorAgreementAccepted:
          legal.vendorAgreementAccepted ===
            true ||
          legal.vendorAgreementAccepted ===
            1 ||
          legal.vendorAgreementAccepted ===
            "1",
        vendorAgreementAcceptedAt:
          boundedString(
            legal.vendorAgreementAcceptedAt,
            80
          ),
        vendorAgreementVersion:
          boundedString(
            legal.vendorAgreementVersion,
            40
          ),
      },
    });
  } catch (error: unknown) {
    console.error(
      "Agreement status request failed:",
      error instanceof Error
        ? error.message
        : "Unknown agreement status error"
    );

    return privateJson(
      {
        ok: false,
        error:
          "Failed to load agreement status.",
      },
      502
    );
  }
}
