import { NextResponse } from "next/server";

import { getWpBaseUrl } from "@/lib/wpClient";

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
  ...keys: string[]
): string {
  for (const key of keys) {
    if (typeof source[key] === "string") {
      return source[key].trim();
    }
  }

  return "";
}

export async function GET() {
  try {
    if (!INTERNAL_TOKEN) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Onboarding service is not configured.",
        },
        {
          status: 500,
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
        `${base}/wp-json/letz/v1/subscription/status`,
        {
          headers,
          cache: "no-store",
          signal:
            AbortSignal.timeout(12_000),
        }
      ),
    ]);

    const [
      kycValue,
      subscriptionValue,
    ]: unknown[] = await Promise.all([
      kycResponse
        .json()
        .catch(() => null),
      subscriptionResponse
        .json()
        .catch(() => null),
    ]);

    if (
      !kycResponse.ok ||
      !subscriptionResponse.ok ||
      !isRecord(kycValue) ||
      !isRecord(subscriptionValue)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not load onboarding status.",
        },
        {
          status: 502,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        kyc_status:
          textField(
            kycValue,
            "kycStatus",
            "kyc_status"
          ) || "not_started",
        subscription_status:
          textField(
            subscriptionValue,
            "billing_status",
            "status"
          ) || "inactive",
        trial_ends_at:
          textField(
            subscriptionValue,
            "trial_ends_at"
          ),
        next_payment_date:
          textField(
            subscriptionValue,
            "next_payment_date",
            "next_renewal_date"
          ),
      },
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    console.error(
      "Onboarding status failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not load onboarding status.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
