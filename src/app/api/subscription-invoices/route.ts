import { NextRequest, NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

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

function authHeader() {
  const user = process.env.WP_USER || "";
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

function cleanBaseUrl(input: string): string {
  return input.replace(/\/$/, "");
}

function normalizePossibleStoreHost(raw: string): string {
  let value = "";

  try {
    value = decodeURIComponent(raw || "").trim();
  } catch {
    value = String(raw || "").trim();
  }

  value = value.replace(/^"|"$/g, "").replace(/^'|'$/g, "");

  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return cleanBaseUrl(value);
  }

  // If cookie stores full host like 7pleats.letzshopy.in
  if (value.includes(".")) {
    return `https://${value.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  // If cookie stores only slug like 7pleats
  if (/^[a-z0-9-]+$/i.test(value)) {
    return `https://${value}.letzshopy.in`;
  }

  return "";
}

async function resolveTenantWpBaseUrl(req: NextRequest): Promise<string> {
  const possibleCookieNames = [
    "ls_tenant",
    "letz_tenant",
    "ls_store",
    "ls_store_url",
    "letz_store_url",
    "store_url",
    "wp_base_url",
  ];

  for (const name of possibleCookieNames) {
    const cookieValue = req.cookies.get(name)?.value;
    const resolved = cookieValue ? normalizePossibleStoreHost(cookieValue) : "";
    if (resolved && !resolved.includes("dashboard.letzshopy.in")) {
      return resolved;
    }
  }

  const possibleHeaderNames = [
    "x-letz-store-url",
    "x-letz-tenant",
    "x-store-url",
  ];

  for (const name of possibleHeaderNames) {
    const headerValue = req.headers.get(name) || "";
    const resolved = headerValue ? normalizePossibleStoreHost(headerValue) : "";
    if (resolved && !resolved.includes("dashboard.letzshopy.in")) {
      return resolved;
    }
  }

  return cleanBaseUrl(await getWpBaseUrl());
}

function normalizeDate(input?: string): string {
  if (!input) return "";

  const s = String(input).trim();
  if (!s) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
  const ddmmyyyySlash = /^(\d{2})\/(\d{2})\/(\d{4})$/;

  let m = s.match(ddmmyyyy);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  m = s.match(ddmmyyyySlash);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return "";
}

function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function addYears(isoDate: string, years: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildPlanLabel(plan?: string): string {
  const p = (plan || "").toLowerCase();
  if (p === "premium") return "LetzShopy Premium Plan";
  return "LetzShopy Standard Plan";
}

function buildInvoiceId(
  invoiceDate: string,
  plan: string,
  billingCycle: string
): string {
  const safeDate = invoiceDate || "current";
  return `sub-${safeDate}-${plan || "standard"}-${billingCycle || "yearly"}`;
}

async function fetchWpJson<T>(
  baseUrl: string,
  path: string
): Promise<T | null> {
  const r = await fetch(`${cleanBaseUrl(baseUrl)}${path}`, {
    cache: "no-store",
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
    },
  });

  if (!r.ok) {
    console.error("Subscription invoice WP fetch failed", {
      baseUrl,
      path,
      status: r.status,
      text: await r.text().catch(() => ""),
    });
    return null;
  }

  return (await r.json()) as T;
}

export async function GET(req: NextRequest) {
  try {
    const wpBaseUrl = await resolveTenantWpBaseUrl(req);

    // Safety: dashboard domain is not a vendor WP store.
    if (wpBaseUrl.includes("dashboard.letzshopy.in")) {
      return NextResponse.json([]);
    }

    const [subscription, account] = await Promise.all([
      fetchWpJson<WpSubscription>(wpBaseUrl, "/wp-json/letz/v1/subscription"),
      fetchWpJson<WpAccountSettings>(
        wpBaseUrl,
        "/wp-json/letz/v1/account-settings"
      ),
    ]);

    if (!subscription) {
      return NextResponse.json([]);
    }

    const status = String(
      subscription.billing_status || subscription.status || ""
    ).toLowerCase();

    const amount = Number(subscription.amount || 0);

    // Show invoice only for a real paid active subscription.
    // Trial/inactive/reset vendors must show no invoices.
    if (status !== "active" || amount <= 0) {
      return NextResponse.json([]);
    }

    const invoiceDate =
      normalizeDate(subscription.last_paid_date) ||
      normalizeDate(subscription.last_billed_at) ||
      normalizeDate(subscription.created_on) ||
      new Date().toISOString().slice(0, 10);

    const periodFrom = invoiceDate;

    const cycle = String(
      subscription.billing_cycle || subscription.period || "yearly"
    ).toLowerCase();

    const billingCycle = cycle === "monthly" ? "monthly" : "yearly";

    const periodTo =
      normalizeDate(subscription.next_renewal_date) ||
      normalizeDate(subscription.next_renewal_at) ||
      normalizeDate(subscription.next_payment_date) ||
      (billingCycle === "monthly"
        ? addMonths(periodFrom, 1)
        : addYears(periodFrom, 1));

    const gstRate = 18;
    const totalAmount = round2(amount);
    const taxableAmount = round2(totalAmount / 1.18);
    const gstAmount = round2(totalAmount - taxableAmount);

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

    const invoice = {
      id: buildInvoiceId(
        invoiceDate,
        subscription.plan || subscription.current_plan || "standard",
        billingCycle
      ),
      invoiceNumber: `LS-SUB-${invoiceDate.replaceAll("-", "")}`,
      invoiceDate,
      planCode:
        (subscription.plan || subscription.current_plan || "").toLowerCase() ===
        "premium"
          ? "premium"
          : ("standard" as "standard" | "premium"),
      planLabel: buildPlanLabel(subscription.plan || subscription.current_plan),
      billingCycle,
      periodFrom,
      periodTo,
      taxableAmount,
      gstRate,
      gstAmount,
      totalAmount,
      currency: "INR",
      gstNumber: account?.subscription?.gstin || "",
      billingName,
      billingAddress,
      billingState: account?.business?.state || "",
      billingPhone,
      status: "paid" as const,
      paymentMode: "UPI",
      paymentReference:
        subscription.payment_reference || subscription.utr || "",
    };

    return NextResponse.json([invoice]);
  } catch (error) {
    console.error("subscription-invoices GET failed:", error);
    return NextResponse.json([], { status: 200 });
  }
}