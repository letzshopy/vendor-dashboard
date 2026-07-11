import { NextResponse } from "next/server";

import {
  getWpBaseUrl,
  wpAuthHeader,
} from "@/lib/wpClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WpSubscription = {
  plan?: string;
  current_plan?: string;
  billing_cycle?: string;
  period?: string;
  billing_status?: string;
  status?: string;
  amount?: number | string;
  next_renewal_date?: string;
  next_renewal_at?: string;
  next_payment_date?: string;
  created_on?: string;
  last_paid_date?: string;
  last_billed_at?: string;
  utr?: string;
  payment_reference?: string;
};

type WpAccountSettings = {
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    whatsapp?: string;
    contact_name?: string;
    contact_email?: string;
    contact_mobile?: string;
  };
  business?: {
    name?: string;
    address?: string;
    state?: string;
    phone?: string;
    email?: string;
  };
  subscription?: {
    gstin?: string;
    billing_name?: string;
    business_name?: string;
    billing_address?: string;
  };
};

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
};

function privateJson(
  body: unknown,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: PRIVATE_RESPONSE_HEADERS,
  });
}

function cleanBaseUrl(input: string): string {
  return input.replace(/\/$/, "");
}

function normalizeDate(input?: string): string {
  if (!input) {
    return "";
  }

  const value = String(input).trim();

  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const dayMonthYear =
    /^(\d{2})-(\d{2})-(\d{4})$/;

  const dayMonthYearSlash =
    /^(\d{2})\/(\d{2})\/(\d{4})$/;

  let match = value.match(dayMonthYear);

  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  match = value.match(dayMonthYearSlash);

  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return "";
}

function addMonths(
  isoDate: string,
  months: number
): string {
  const date = new Date(`${isoDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  date.setMonth(date.getMonth() + months);

  return date.toISOString().slice(0, 10);
}

function addYears(
  isoDate: string,
  years: number
): string {
  const date = new Date(`${isoDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  date.setFullYear(date.getFullYear() + years);

  return date.toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildPlanLabel(plan?: string): string {
  const normalizedPlan = (plan || "").toLowerCase();

  if (normalizedPlan === "premium") {
    return "LetzShopy Premium Plan";
  }

  return "LetzShopy Standard Plan";
}

function buildInvoiceId(
  invoiceDate: string,
  plan: string,
  billingCycle: string
): string {
  const safeDate = invoiceDate || "current";

  return `sub-${safeDate}-${
    plan || "standard"
  }-${billingCycle || "yearly"}`;
}

async function fetchWpJson<T>(
  baseUrl: string,
  path: string
): Promise<T | null> {
  const response = await fetch(
    `${cleanBaseUrl(baseUrl)}${path}`,
    {
      cache: "no-store",
      headers: {
        ...wpAuthHeader(),
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    console.error(
      "Subscription invoice WordPress request failed",
      {
        path,
        status: response.status,
      }
    );

    return null;
  }

  const parsed: unknown = await response
    .json()
    .catch(() => null);

  return parsed as T | null;
}

export async function GET() {
  try {
    /*
     * The WordPress store URL must come only from the
     * server-side tenant boundary.
     *
     * Never accept store URLs from request headers,
     * alternate cookies, query parameters, or request
     * bodies.
     */
    const wpBaseUrl = cleanBaseUrl(
      await getWpBaseUrl()
    );

    const [subscription, account] =
      await Promise.all([
        fetchWpJson<WpSubscription>(
          wpBaseUrl,
          "/wp-json/letz/v1/subscription"
        ),
        fetchWpJson<WpAccountSettings>(
          wpBaseUrl,
          "/wp-json/letz/v1/account-settings"
        ),
      ]);

    if (!subscription) {
      return privateJson([]);
    }

    const status = String(
      subscription.billing_status ||
        subscription.status ||
        ""
    ).toLowerCase();

    const amount = Number(
      subscription.amount || 0
    );

    /*
     * Trial, inactive, reset, or unpaid vendors must
     * not receive a subscription invoice.
     */
    if (status !== "active" || amount <= 0) {
      return privateJson([]);
    }

    const invoiceDate =
      normalizeDate(
        subscription.last_paid_date
      ) ||
      normalizeDate(
        subscription.last_billed_at
      ) ||
      normalizeDate(
        subscription.created_on
      ) ||
      new Date().toISOString().slice(0, 10);

    const periodFrom = invoiceDate;

    const cycle = String(
      subscription.billing_cycle ||
        subscription.period ||
        "yearly"
    ).toLowerCase();

    const billingCycle =
      cycle === "monthly"
        ? "monthly"
        : "yearly";

    const periodTo =
      normalizeDate(
        subscription.next_renewal_date
      ) ||
      normalizeDate(
        subscription.next_renewal_at
      ) ||
      normalizeDate(
        subscription.next_payment_date
      ) ||
      (billingCycle === "monthly"
        ? addMonths(periodFrom, 1)
        : addYears(periodFrom, 1));

    const gstRate = 18;
    const totalAmount = round2(amount);

    const taxableAmount = round2(
      totalAmount / 1.18
    );

    const gstAmount = round2(
      totalAmount - taxableAmount
    );

    const billingName =
      account?.subscription?.billing_name ||
      account?.subscription?.business_name ||
      account?.business?.name ||
      account?.contact?.contact_name ||
      account?.contact?.name ||
      "LetzShopy Vendor";

    const billingPhone =
      account?.contact?.contact_mobile ||
      account?.contact?.mobile ||
      account?.contact?.phone ||
      account?.business?.phone ||
      "";

    const billingAddress =
      account?.subscription?.billing_address ||
      account?.business?.address ||
      "";

    const currentPlan =
      subscription.plan ||
      subscription.current_plan ||
      "standard";

    const planCode:
      | "standard"
      | "premium" =
      currentPlan.toLowerCase() === "premium"
        ? "premium"
        : "standard";

    const invoice = {
      id: buildInvoiceId(
        invoiceDate,
        currentPlan,
        billingCycle
      ),
      invoiceNumber: `LS-SUB-${invoiceDate.replaceAll(
        "-",
        ""
      )}`,
      invoiceDate,
      planCode,
      planLabel: buildPlanLabel(currentPlan),
      billingCycle,
      periodFrom,
      periodTo,
      taxableAmount,
      gstRate,
      gstAmount,
      totalAmount,
      currency: "INR",
      gstNumber:
        account?.subscription?.gstin || "",
      billingName,
      billingAddress,
      billingState:
        account?.business?.state || "",
      billingPhone,
      status: "paid" as const,
      paymentMode: "UPI",
      paymentReference:
        subscription.payment_reference ||
        subscription.utr ||
        "",
    };

    return privateJson([invoice]);
  } catch (error: unknown) {
    console.error(
      "Subscription invoice request failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    /*
     * Preserve the existing dashboard behaviour:
     * invoice-loading failures return an empty list
     * instead of breaking the settings screen.
     */
    return privateJson([]);
  }
}