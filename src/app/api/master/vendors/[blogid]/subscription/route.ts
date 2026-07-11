import { NextResponse } from "next/server";

import {
  resolveMasterVendorStoreUrl,
} from "@/lib/masterVendor";

const INTERNAL_TOKEN =
  process.env.LETZ_INTERNAL_TOKEN || "";

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

function textField(
  source: JsonRecord,
  key: string
): string {
  return typeof source[key] === "string"
    ? source[key]
    : "";
}

function numberField(
  source: JsonRecord,
  key: string
): number {
  const value = Number(source[key]);

  return Number.isFinite(value)
    ? value
    : 0;
}

function safeSubscription(
  value: unknown
): JsonRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    plan: textField(value, "plan"),
    current_plan:
      textField(value, "current_plan"),
    billing_cycle:
      textField(value, "billing_cycle"),
    period: textField(value, "period"),
    billing_status:
      textField(value, "billing_status"),
    status: textField(value, "status"),
    amount: numberField(value, "amount"),
    trial_status:
      textField(value, "trial_status"),
    trial_started_at:
      textField(value, "trial_started_at"),
    trial_ends_at:
      textField(value, "trial_ends_at"),
    next_payment_date:
      textField(value, "next_payment_date"),
    next_renewal_date:
      textField(value, "next_renewal_date"),
    payment_reference:
      textField(value, "payment_reference"),
    utr: textField(value, "utr"),
    payment_mode:
      textField(value, "payment_mode"),
    last_paid_date:
      textField(value, "last_paid_date"),
    last_billed_at:
      textField(value, "last_billed_at"),
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
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

    const { blogid } =
      await context.params;

    const storeUrl =
      await resolveMasterVendorStoreUrl(
        blogid
      );

    const response = await fetch(
      `${storeUrl}/wp-json/letz/v1/subscription/status`,
      {
        headers: {
          "x-letz-auth": INTERNAL_TOKEN,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      }
    );

    const parsed: unknown = await response
      .json()
      .catch(() => null);

    const subscription =
      safeSubscription(parsed);

    if (!response.ok || !subscription) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not load the vendor subscription.",
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
      subscription,
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    console.error(
      "Master subscription read failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not load the vendor subscription.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
