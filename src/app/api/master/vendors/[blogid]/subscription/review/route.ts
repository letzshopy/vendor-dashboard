import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  resolveMasterVendorStoreUrl,
} from "@/lib/masterVendor";

const MASTER_API_KEY =
  process.env.MASTER_API_KEY || "";

const PRIVATE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
};

type JsonRecord = Record<string, unknown>;

type ReviewStatus =
  | "active"
  | "rejected"
  | "suspended"
  | "expired"
  | "inactive"
  | "trial";

function isRecord(
  value: unknown
): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function normalizeReviewStatus(
  value: unknown
): ReviewStatus | null {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  const allowed: ReviewStatus[] = [
    "active",
    "rejected",
    "suspended",
    "expired",
    "inactive",
    "trial",
  ];

  return allowed.includes(
    status as ReviewStatus
  )
    ? (status as ReviewStatus)
    : null;
}

function textField(
  source: JsonRecord,
  ...keys: string[]
): string {
  for (const key of keys) {
    if (typeof source[key] === "string") {
      const value = source[key].trim();

      if (value) {
        return value;
      }
    }
  }

  return "";
}

async function readJson(
  response: Response
): Promise<unknown> {
  return response.json().catch(() => null);
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      blogid: string;
    }>;
  }
) {
  try {
    if (!MASTER_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Subscription review is not configured.",
        },
        {
          status: 500,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const parsedBody: unknown = await request
      .json()
      .catch(() => null);

    const body = isRecord(parsedBody)
      ? parsedBody
      : {};

    const requestedStatus =
      normalizeReviewStatus(body.status);

    if (!requestedStatus) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Select a valid subscription review status.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const { blogid } =
      await context.params;

    const storeUrl =
      await resolveMasterVendorStoreUrl(
        blogid
      );

    /*
     * WordPress is the single authority for this transition.
     * Its subscription/review callback atomically checks the
     * persisted KYC status, current payment status and billing
     * cycle before calculating dates and saving the result.
     */
    const reviewResponse = await fetch(
      `${storeUrl}/wp-json/letz/v1/subscription/review`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${MASTER_API_KEY}`,
          "X-Letz-Master-Key":
            MASTER_API_KEY,
          "Content-Type":
            "application/json",
          Accept: "application/json",
          "Cache-Control":
            "no-cache, no-store",
          Pragma: "no-cache",
        },
        body: JSON.stringify({
          status: requestedStatus,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(
          12_000
        ),
      }
    );

    const reviewedSubscription =
      await readJson(reviewResponse);

    if (!reviewResponse.ok) {
      const upstreamError =
        isRecord(reviewedSubscription)
          ? textField(
              reviewedSubscription,
              "message",
              "error"
            )
          : "";

      return NextResponse.json(
        {
          ok: false,
          error:
            upstreamError ||
            "Could not update the vendor subscription.",
        },
        {
          status:
            reviewResponse.status >= 400 &&
            reviewResponse.status < 500
              ? reviewResponse.status
              : 502,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    if (!isRecord(reviewedSubscription)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The vendor subscription response is invalid.",
        },
        {
          status: 502,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const persistedStatus =
      textField(
        reviewedSubscription,
        "billing_status",
        "status"
      ) ||
      (requestedStatus === "rejected"
        ? "inactive"
        : requestedStatus);

    return NextResponse.json(
      {
        ok: true,
        requestedStatus,
        subscriptionStatus:
          persistedStatus,
        subscription:
          reviewedSubscription,
      },
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    console.error(
      "Master subscription review failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not update the vendor subscription.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
