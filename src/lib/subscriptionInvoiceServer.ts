import "server-only";

import { getWpBaseUrl } from "@/lib/wpClient";
import type { SubscriptionInvoice } from "@/lib/subscription-invoices";

type JsonRecord = Record<string, unknown>;

const INTERNAL_TOKEN = (
  process.env.LETZ_INTERNAL_TOKEN || ""
).trim();

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
    phone?: string;
    mobile?: string;
    contact_name?: string;
    contact_mobile?: string;
  };
  business?: {
    name?: string;
    address?: string;
    state?: string;
    phone?: string;
  };
  subscription?: {
    gstin?: string;
    billing_name?: string;
    business_name?: string;
    billing_address?: string;
  };
};

type BillingIdentity = {
  billingName: string;
  billingAddress: string;
  billingState: string;
  billingPhone: string;
  gstNumber: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDate(input?: string): string {
  if (!input) return "";

  const value = String(input).trim();
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  let match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;

  match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function addMonths(isoDate: string, months: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function addYears(isoDate: string, years: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function inclusiveGst(total: number) {
  const totalAmount = round2(total);
  const taxableAmount = round2(totalAmount / 1.18);

  return {
    gstRate: 18,
    taxableAmount,
    gstAmount: round2(totalAmount - taxableAmount),
    totalAmount,
  };
}

function planLabel(plan?: string): string {
  return String(plan || "").toLowerCase() === "premium"
    ? "LetzShopy Premium Plan"
    : "LetzShopy Standard Plan";
}

function billingIdentity(account: WpAccountSettings | null): BillingIdentity {
  return {
    billingName:
      account?.subscription?.billing_name ||
      account?.subscription?.business_name ||
      account?.business?.name ||
      account?.contact?.contact_name ||
      account?.contact?.name ||
      "LetzShopy Vendor",
    billingAddress:
      account?.subscription?.billing_address || account?.business?.address || "",
    billingState: account?.business?.state || "",
    billingPhone:
      account?.contact?.contact_mobile ||
      account?.contact?.mobile ||
      account?.contact?.phone ||
      account?.business?.phone ||
      "",
    gstNumber: account?.subscription?.gstin || "",
  };
}

async function fetchInternalBillingJson<T>(path: string): Promise<T | null> {
  try {
    const separator = path.includes("?") ? "&" : "?";
    if (!INTERNAL_TOKEN) {
      throw new Error(
        "Billing invoice internal authentication is not configured."
      );
    }

    const baseUrl = (
      await getWpBaseUrl()
    ).replace(/\/+$/, "");

    const response = await fetch(
      `${baseUrl}${path}${separator}_ts=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "X-Letz-Auth": INTERNAL_TOKEN,
        },
        signal: AbortSignal.timeout(12_000),
      }
    );

    if (!response.ok) {
      console.error("Billing invoice internal WordPress request failed", {
        path,
        status: response.status,
      });
      return null;
    }

    return (await response.json().catch(() => null)) as T | null;
  } catch (error: unknown) {
    console.error(
      "Billing invoice internal WordPress request failed",
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
}

function domainRenewalPayload(value: unknown): unknown {
  if (!isRecord(value)) return null;

  return isRecord(value.domain_renewal) ? value.domain_renewal : value;
}

function buildSubscriptionInvoice(
  subscription: WpSubscription | null,
  identity: BillingIdentity
): SubscriptionInvoice | null {
  if (!subscription) return null;

  const status = String(
    subscription.billing_status || subscription.status || ""
  ).toLowerCase();
  const amount = Number(subscription.amount || 0);

  if (status !== "active" || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const invoiceDate =
    normalizeDate(subscription.last_paid_date) ||
    normalizeDate(subscription.last_billed_at) ||
    normalizeDate(subscription.created_on) ||
    new Date().toISOString().slice(0, 10);
  const currentPlan = subscription.plan || subscription.current_plan || "standard";
  const cycle = String(
    subscription.billing_cycle || subscription.period || "yearly"
  ).toLowerCase();
  const billingCycle = cycle === "monthly" ? "monthly" : "yearly";
  const periodTo =
    normalizeDate(subscription.next_renewal_date) ||
    normalizeDate(subscription.next_renewal_at) ||
    normalizeDate(subscription.next_payment_date) ||
    (billingCycle === "monthly"
      ? addMonths(invoiceDate, 1)
      : addYears(invoiceDate, 1));
  const amounts = inclusiveGst(amount);

  return {
    id: `sub-${invoiceDate}-${currentPlan}-${billingCycle}`,
    invoiceNumber: `LS-SUB-${invoiceDate.replaceAll("-", "")}`,
    invoiceDate,
    serviceType: "subscription",
    serviceLabel: "LetzShopy Subscription",
    planCode: currentPlan.toLowerCase() === "premium" ? "premium" : "standard",
    planLabel: planLabel(currentPlan),
    billingCycle,
    periodFrom: invoiceDate,
    periodTo,
    ...amounts,
    currency: "INR",
    ...identity,
    status: "paid",
    paymentMode: "UPI",
    paymentReference:
      subscription.payment_reference || subscription.utr || "",
  };
}

function buildDomainInvoices(
  service: unknown,
  identity: BillingIdentity
): SubscriptionInvoice[] {
  if (!isRecord(service) || !Array.isArray(service.history)) return [];

  const invoices: SubscriptionInvoice[] = [];

  for (const item of service.history) {
    if (!isRecord(item) || text(item.status).toLowerCase() !== "paid") continue;

    const amount = Number(item.amount || 0);
    const invoiceDate =
      normalizeDate(text(item.invoice_date)) || normalizeDate(text(item.paid_date));
    const domainName = text(item.domain_name) || text(service.domain_name);
    const id = text(item.id);
    const invoiceNumber = text(item.invoice_number);

    if (!id || !invoiceNumber || !invoiceDate || !Number.isFinite(amount) || amount <= 0) {
      continue;
    }

    const periodFrom =
      normalizeDate(text(item.period_from)) ||
      normalizeDate(text(item.renewal_date)) ||
      invoiceDate;
    const periodTo =
      normalizeDate(text(item.period_to)) || addYears(periodFrom, 1);
    const amounts = inclusiveGst(amount);

    invoices.push({
      id,
      invoiceNumber,
      invoiceDate,
      serviceType: "domain_renewal",
      serviceLabel: "Domain Renewal Service",
      domainName,
      planLabel: domainName
        ? `Domain Renewal – ${domainName}`
        : "Domain Renewal Service",
      billingCycle: "yearly",
      periodFrom,
      periodTo,
      ...amounts,
      currency: text(item.currency) || "INR",
      ...identity,
      status: "paid",
      paymentMode: text(item.payment_mode).toUpperCase() || "UPI",
      paymentReference: text(item.payment_reference),
    });
  }

  return invoices;
}

export async function getBillingInvoices(): Promise<SubscriptionInvoice[]> {
  const [subscription, account, domainRenewal] = await Promise.all([
    fetchInternalBillingJson<WpSubscription>(
      "/wp-json/letz/v1/subscription/status/"
    ),
    fetchInternalBillingJson<WpAccountSettings>(
      "/wp-json/letz/v1/account-settings"
    ),
    fetchInternalBillingJson<unknown>(
      "/wp-json/letz/v1/domain-renewal/status/"
    ),
  ]);

  const identity = billingIdentity(account);
  const invoices = buildDomainInvoices(
    domainRenewalPayload(domainRenewal),
    identity
  );
  const subscriptionInvoice = buildSubscriptionInvoice(subscription, identity);

  if (subscriptionInvoice) invoices.push(subscriptionInvoice);

  return invoices.sort((left, right) => {
    const byDate = right.invoiceDate.localeCompare(left.invoiceDate);
    return byDate || right.invoiceNumber.localeCompare(left.invoiceNumber);
  });
}