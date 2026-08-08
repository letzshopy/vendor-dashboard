import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

import { getWpBaseUrl } from "@/lib/wpClient";

const INTERNAL_TOKEN =
  process.env.LETZ_INTERNAL_TOKEN || "";

const PRIVATE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
};

function validFileKey(
  value: string
): boolean {
  return /^[a-z0-9_-]+-[A-Za-z0-9]+\.(?:jpe?g|png|pdf)$/.test(
    value
  );
}

export async function GET(
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
            "KYC document service is not configured.",
        },
        {
          status: 500,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const fileKey =
      request.nextUrl.searchParams
        .get("fileKey")
        ?.trim() || "";

    if (!validFileKey(fileKey)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid KYC document.",
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
      `${base}/wp-json/letz/v1/kyc/download?fileKey=${encodeURIComponent(
        fileKey
      )}`,
      {
        headers: {
          "x-letz-auth": INTERNAL_TOKEN,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      }
    );

    if (!response.ok || !response.body) {
      return NextResponse.json(
        {
          ok: false,
          error:
            response.status === 404
              ? "KYC document was not found."
              : "KYC document download failed.",
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

    return new NextResponse(
      response.body,
      {
        status: 200,
        headers: {
          "Content-Type":
            response.headers.get(
              "content-type"
            ) ||
            "application/octet-stream",
          "Content-Disposition":
            response.headers.get(
              "content-disposition"
            ) || "inline",
          "Cache-Control":
            PRIVATE_HEADERS[
              "Cache-Control"
            ],
          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (error: unknown) {
    console.error(
      "KYC download failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "KYC document download failed.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
