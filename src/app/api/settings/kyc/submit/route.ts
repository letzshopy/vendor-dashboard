import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

import { getWpBaseUrl } from "@/lib/wpClient";

const INTERNAL_TOKEN =
  process.env.LETZ_INTERNAL_TOKEN || "";

const MAX_REQUEST_BYTES = 64 * 1024;

const PRIVATE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

export async function POST(
  request: NextRequest
) {
  const storeFeatureError = await requireStoreFeature("kyc");
  if (storeFeatureError) return storeFeatureError;

  try {
    if (!INTERNAL_TOKEN) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "KYC service is not configured.",
        },
        {
          status: 500,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const contentLength = Number(
      request.headers.get(
        "content-length"
      ) || "0"
    );

    if (
      !Number.isFinite(contentLength) ||
      contentLength < 0 ||
      contentLength > MAX_REQUEST_BYTES
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "KYC request is too large.",
        },
        {
          status: 413,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const parsedBody: unknown = await request
      .json()
      .catch(() => null);

    if (!isRecord(parsedBody)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid KYC submission.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const base = (
      await getWpBaseUrl()
    ).replace(/\/$/, "");

    const response = await fetch(
      `${base}/wp-json/letz/v1/kyc/submit`,
      {
        method: "POST",
        headers: {
          "x-letz-auth":
            INTERNAL_TOKEN,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(parsedBody),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      }
    );

    const parsed: unknown = await response
      .json()
      .catch(() => null);

    if (
      !response.ok ||
      !isRecord(parsed)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "KYC submission failed.",
        },
        {
          status:
            response.status >= 400 &&
            response.status < 500
              ? response.status
              : 502,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        kycStatus:
          typeof parsed.kycStatus ===
          "string"
            ? parsed.kycStatus
            : "in_review",
        submittedAt:
          typeof parsed.submittedAt ===
          "string"
            ? parsed.submittedAt
            : new Date().toISOString(),
      },
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    console.error(
      "KYC submission failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "KYC submission failed.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
