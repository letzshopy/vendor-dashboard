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

const PLAN_PRICES = {
  standard: {
    monthly: 999,
    yearly: 11_000,
  },
  premium: {
    monthly: 1_399,
    yearly: 16_000,
  },
} as const;

type PlanKey = keyof typeof PLAN_PRICES;
type BillingCycle = keyof typeof PLAN_PRICES.standard;
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function normalizePlan(
  value: unknown
): PlanKey | null {
  const plan = String(value || "")
    .trim()
    .toLowerCase();

  return plan === "standard" ||
    plan === "premium"
    ? plan
    : null;
}

function normalizeBillingCycle(
  value: unknown
): BillingCycle | null {
  const cycle = String(value || "")
    .trim()
    .toLowerCase();

  return cycle === "monthly" ||
    cycle === "yearly"
    ? cycle
    : null;
}

function normalizePaymentReference(
  value: unknown
): string {
  const reference = String(value || "")
    .trim()
    .toUpperCase();

  return /^[A-Z0-9][A-Z0-9._/-]{5,63}$/.test(
    reference
  )
    ? reference
    : "";
}

async function readJson(
  response: Response
): Promise<unknown> {
  return response.json().catch(() => null);
}

function statusFrom(
  value: unknown
): string {
  if (!isRecord(value)) {
    return "";
  }

  const status =
    value.billing_status ??
    value.status;

  return typeof status === "string"
    ? status.trim().toLowerCase()
    : "";
}

function kycStatusFrom(
  value: unknown
): string {
  if (!isRecord(value)) {
    return "";
  }

  const status =
    value.kycStatus ??
    value.kyc_status;

  return typeof status === "string"
    ? status.trim().toLowerCase()
    : "";
}

export async function POST(
  request: NextRequest
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

    const plan = normalizePlan(body.plan);

    const billingCycle =
      normalizeBillingCycle(
        body.billing_cycle ??
          body.period
      );

    const paymentReference =
      normalizePaymentReference(
        body.payment_reference ??
          body.utr
      );

    if (!plan) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Select a valid subscription plan.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    if (!billingCycle) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Select monthly or yearly billing.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    if (!paymentReference) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Enter a valid UPI transaction reference.",
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

    const headers = {
      "x-letz-auth": INTERNAL_TOKEN,
    };

    const [
      kycResponse,
      subscriptionResponse,
    ] = await Promise.all([
      fetch(
        `${base}/wp-json/letz/v1/kyc`,
        {
          headers,
          cache: "no-store",
          signal:
            AbortSignal.timeout(12_000),
        }
      ),
      fetch(
        `${base}/wp-json/letz/v1/subscription`,
        {
          headers,
          cache: "no-store",
          signal:
            AbortSignal.timeout(12_000),
        }
      ),
    ]);

    const [
      kyc,
      currentSubscription,
    ] = await Promise.all([
      readJson(kycResponse),
      readJson(subscriptionResponse),
    ]);

    if (
      !kycResponse.ok ||
      kycStatusFrom(kyc) !== "approved"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "KYC approval is required before submitting a subscription payment.",
        },
        {
          status: 403,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    if (!subscriptionResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not verify the current subscription.",
        },
        {
          status: 502,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    if (
      statusFrom(currentSubscription) ===
      "payment_submitted"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A subscription payment is already awaiting verification.",
        },
        {
          status: 409,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const amount =
      PLAN_PRICES[plan][billingCycle];

    const paymentResponse = await fetch(
      `${base}/wp-json/letz/v1/subscription`,
      {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          plan,
          current_plan: plan,
          billing_cycle: billingCycle,
          period: billingCycle,
          billing_status:
            "payment_submitted",
          status: "payment_submitted",
          amount,
          payment_mode: "upi",
          payment_reference:
            paymentReference,
          utr: paymentReference,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      }
    );

    const subscription = await readJson(
      paymentResponse
    );

    if (
      !paymentResponse.ok ||
      !isRecord(subscription)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not submit the subscription payment.",
        },
        {
          status:
            paymentResponse.status >= 400 &&
            paymentResponse.status < 500
              ? paymentResponse.status
              : 502,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const onboardingResponse = await fetch(
      `${base}/wp-json/letz/v1/onboarding/set`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          subscription_status:
            "payment_submitted",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      }
    );

    if (!onboardingResponse.ok) {
      console.warn(
        "Subscription onboarding sync failed:",
        onboardingResponse.status
      );
    }

    return NextResponse.json(
      {
        ok: true,
        submittedStatus:
          "payment_submitted",
        amount,
        plan,
        billingCycle,
      },
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    console.error(
      "Subscription submission failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not submit the subscription payment.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
