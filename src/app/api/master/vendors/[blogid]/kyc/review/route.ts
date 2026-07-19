import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  resolveMasterVendorStoreUrl,
} from "@/lib/masterVendor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MASTER_API_KEY =
  process.env.MASTER_API_KEY || "";

const MAX_REQUEST_BYTES = 8_192;
const MAX_REVIEW_NOTE_LENGTH = 2_000;
const UPSTREAM_TIMEOUT_MS = 15_000;

type JsonRecord = Record<string, unknown>;
type ReviewStatus =
  | "approved"
  | "rejected";

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

function normalizeStatus(
  value: unknown
): ReviewStatus | null {
  return value === "approved" ||
    value === "rejected"
    ? value
    : null;
}

function normalizeNote(
  value: unknown
): string {
  return typeof value === "string"
    ? value
        .trim()
        .slice(
          0,
          MAX_REVIEW_NOTE_LENGTH
        )
    : "";
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      blogid: string;
    }>;
  }
) {
  if (!MASTER_API_KEY) {
    return privateJson(
      {
        ok: false,
        error:
          "KYC service is not configured.",
      },
      500
    );
  }

  const contentLength = Number(
    request.headers.get("content-length") ||
      "0"
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_REQUEST_BYTES
  ) {
    return privateJson(
      {
        ok: false,
        error:
          "Invalid KYC review request.",
      },
      400
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return privateJson(
      {
        ok: false,
        error:
          "Invalid KYC review request.",
      },
      400
    );
  }

  if (!isRecord(body)) {
    return privateJson(
      {
        ok: false,
        error:
          "Invalid KYC review request.",
      },
      400
    );
  }

  const status = normalizeStatus(
    body.status
  );

  if (!status) {
    return privateJson(
      {
        ok: false,
        error:
          "KYC status must be approved or rejected.",
      },
      400
    );
  }

  const note = normalizeNote(body.note);
  const { blogid } = await params;

  try {
    /*
     * Browser-provided storeUrl is deliberately ignored.
     * The authoritative master registry resolves the tenant from blogid.
     */
    const storeUrl =
      await resolveMasterVendorStoreUrl(
        blogid
      );

    const reviewResponse = await fetch(
      `${storeUrl}/wp-json/letz/v1/kyc/review`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${MASTER_API_KEY}`,
          "X-Letz-Master-Key":
            MASTER_API_KEY,
        },
        body: JSON.stringify({
          status,
          note,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(
          UPSTREAM_TIMEOUT_MS
        ),
      }
    );

    if (!reviewResponse.ok) {
      console.error(
        `Master KYC review failed with status ${reviewResponse.status}.`
      );

      return privateJson(
        {
          ok: false,
          error:
            "Failed to save KYC review.",
        },
        502
      );
    }

    const reviewPayload: unknown =
      await reviewResponse.json();

    const review = isRecord(
      reviewPayload
    )
      ? reviewPayload
      : {};

    return privateJson({
      ok: true,
      kycStatus:
        typeof review.kycStatus ===
        "string"
          ? review.kycStatus
          : status,
      reviewedAt:
        typeof review.reviewedAt ===
        "string"
          ? review.reviewedAt
          : new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error(
      "Master KYC review failed:",
      error instanceof Error
        ? error.message
        : "Unknown master KYC review error"
    );

    return privateJson(
      {
        ok: false,
        error:
          "Failed to update vendor KYC review.",
      },
      502
    );
  }
}