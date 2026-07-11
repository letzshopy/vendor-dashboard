import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  resolveMasterVendorStoreUrl,
} from "@/lib/masterVendor";
import {
  calculateApprovedRenewalDate,
  type BillingCycle,
} from "@/lib/subscriptionPolicy";

const INTERNAL_TOKEN =
  process.env.LETZ_INTERNAL_TOKEN || "";

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

function isRecord(value: unknown): value is JsonRecord {
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
      return source[key].trim();
    }
  }

  return "";
}

function billingCycleFrom(
  subscription: JsonRecord
): BillingCycle | null {
  const cycle = textField(
    subscription,
    "billing_cycle",
    "period"
  ).toLowerCase();

  return cycle === "monthly" ||
    cycle === "yearly"
    ? cycle
    : null;
}

function subscriptionStatusFrom(
  subscription: JsonRecord
): string {
  return textField(
    subscription,
    "billing_status",
    "status"
  ).toLowerCase();
}

function kycStatusFrom(
  value: unknown
): string {
  if (!isRecord(value)) {
    return "";
  }

  return textField(
    value,
    "kycStatus",
    "kyc_status"
  ).toLowerCase();
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
    if (!INTERNAL_TOKEN) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Subscription service is not configured.",
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

    const headers = {
      "x-letz-auth": INTERNAL_TOKEN,
    };

    const [
      subscriptionResponse,
      kycResponse,
    ] = await Promise.all([
      fetch(
        `${storeUrl}/wp-json/letz/v1/subscription`,
        {
          headers,
          cache: "no-store",
          signal:
            AbortSignal.timeout(12_000),
        }
      ),
      fetch(
        `${storeUrl}/wp-json/letz/v1/kyc`,
        {
          headers,
          cache: "no-store",
          signal:
            AbortSignal.timeout(12_000),
        }
      ),
    ]);

    const [
      subscriptionValue,
      kycValue,
    ] = await Promise.all([
      readJson(subscriptionResponse),
      readJson(kycResponse),
    ]);

    if (
      !subscriptionResponse.ok ||
      !isRecord(subscriptionValue)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not verify the vendor subscription.",
        },
        {
          status: 502,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    if (requestedStatus === "active") {
      if (
        !kycResponse.ok ||
        kycStatusFrom(kycValue) !==
          "approved"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "KYC must be approved before the subscription can be activated.",
          },
          {
            status: 409,
            headers: PRIVATE_HEADERS,
          }
        );
      }

      if (
        subscriptionStatusFrom(
          subscriptionValue
        ) !== "payment_submitted"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Only a submitted payment can be activated.",
          },
          {
            status: 409,
            headers: PRIVATE_HEADERS,
          }
        );
      }
    }

    const cycle =
      billingCycleFrom(
        subscriptionValue
      );

    if (
      requestedStatus === "active" &&
      !cycle
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The submitted billing cycle is invalid.",
        },
        {
          status: 409,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const today =
      new Date().toISOString().slice(0, 10);

    const persistedStatus =
      requestedStatus === "rejected"
        ? "inactive"
        : requestedStatus;

    const payload: JsonRecord = {
      status: persistedStatus,
      billing_status: persistedStatus,
    };

    if (
      requestedStatus === "active" &&
      cycle
    ) {
      const nextPaymentDate =
        calculateApprovedRenewalDate({
          billingCycle: cycle,
          approvedAt: new Date(),
          currentPaidThrough:
            textField(
              subscriptionValue,
              "next_payment_date",
              "next_renewal_date"
            ),
        });

      payload.last_paid_date = today;
      payload.last_billed_at = today;
      payload.next_payment_date =
        nextPaymentDate;
      payload.next_renewal_date =
        nextPaymentDate;
      payload.next_renewal_at =
        nextPaymentDate;
    }

    const reviewResponse = await fetch(
      `${storeUrl}/wp-json/letz/v1/subscription`,
      {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      }
    );

    const reviewedSubscription =
      await readJson(reviewResponse);

    if (
      !reviewResponse.ok ||
      !isRecord(reviewedSubscription)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
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

    const onboardingResponse = await fetch(
      `${storeUrl}/wp-json/letz/v1/onboarding/set`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          subscription_status:
            persistedStatus,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      }
    );

    if (!onboardingResponse.ok) {
      console.warn(
        "Master subscription onboarding sync failed:",
        onboardingResponse.status
      );
    }

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
