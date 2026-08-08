import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

import { getWpBaseUrl } from "@/lib/wpClient";

const INTERNAL_TOKEN =
  process.env.LETZ_INTERNAL_TOKEN || "";

const UPSTREAM_TIMEOUT_MS = 15_000;

const PRIVATE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
};

type PlanKey = "standard" | "premium";
type BillingCycle = "monthly" | "yearly";
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

function upstreamError(
  value: unknown,
  fallback: string
): string {
  if (!isRecord(value)) {
    return fallback;
  }

  for (const key of ["error", "message"]) {
    const candidate = value[key];

    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  return fallback;
}

function textField(
  source: JsonRecord,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string") {
      return value.trim();
    }
  }

  return "";
}

function numericField(
  source: JsonRecord,
  key: string
): number {
  const value = Number(source[key]);

  return Number.isFinite(value)
    ? value
    : 0;
}

async function syncOnboarding(
  base: string,
  headers: Record<string, string>
): Promise<void> {
  try {
    const response = await fetch(
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
        signal: AbortSignal.timeout(5_000),
      }
    );

    if (!response.ok) {
      console.warn(
        "Subscription onboarding sync failed:",
        response.status
      );
    }
  } catch (error: unknown) {
    console.warn(
      "Subscription onboarding sync failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );
  }
}

export async function POST(
  request: NextRequest
) {
  const storeFeatureError = await requireStoreFeature("subscription_billing");
  if (storeFeatureError) return storeFeatureError;

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
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    };

    /*
     * WordPress is the sole authority for KYC eligibility,
     * pending-payment state, pricing and setup fees. A single
     * request avoids races and transport failures caused by
     * redundant preflight requests.
     */
    const paymentResponse = await fetch(
      `${base}/wp-json/letz/v1/subscription/submit`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          plan,
          billing_cycle: billingCycle,
          payment_reference:
            paymentReference,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(
          UPSTREAM_TIMEOUT_MS
        ),
      }
    );

    const value = await readJson(
      paymentResponse
    );

    if (
      !paymentResponse.ok ||
      !isRecord(value)
    ) {
      const clientError =
        paymentResponse.status >= 400 &&
        paymentResponse.status < 500;

      return NextResponse.json(
        {
          ok: false,
          error: clientError
            ? upstreamError(
                value,
                "Could not submit the subscription payment."
              )
            : "Could not submit the subscription payment.",
        },
        {
          status: clientError
            ? paymentResponse.status
            : 502,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    await syncOnboarding(base, headers);

    return NextResponse.json(
      {
        ok: true,
        submittedStatus:
          textField(
            value,
            "billing_status",
            "status"
          ) || "payment_submitted",
        amount: numericField(
          value,
          "amount"
        ),
        setupFee: numericField(
          value,
          "setup_fee"
        ),
        plan:
          textField(value, "plan") || plan,
        billingCycle:
          textField(
            value,
            "billing_cycle"
          ) || billingCycle,
      },
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    const timedOut =
      error instanceof Error &&
      ["AbortError", "TimeoutError"].includes(
        error.name
      );

    console.error(
      "Subscription submission failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error: timedOut
          ? "The subscription service timed out. Please try again."
          : "The subscription service could not be reached. Please try again.",
      },
      {
        status: timedOut ? 504 : 502,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
