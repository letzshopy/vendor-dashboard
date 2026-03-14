import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

type WpSubscription = {
  plan?: string;
  billing_cycle?: string;
  billing_status?: string;
  amount?: number;
  next_renewal_date?: string;
  created_on?: string;
  utr?: string;
};

type WpAccountSettings = {
  contact?: {
    contact_name?: string;
    contact_email?: string;
    contact_mobile?: string;
  };
  subscription?: {
    gstin?: string;
    billing_name?: string;
    business_name?: string;
    billing_address?: string;
  };
};

function authHeader() {
  const user = process.env.WP_USER!;
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
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

async function fetchWpJson<T>(path: string): Promise<T | null> {
  const base = (await getWpBaseUrl()).replace(/\/$/, "");

  const r = await fetch(`${base}${path}`, {
    cache: "no-store",
    headers: {
      Authorization: authHeader(),
    },
  });

  if (!r.ok) return null;
  return (await r.json()) as T;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [subscription, account] = await Promise.all([
      fetchWpJson<WpSubscription>("/wp-json/letz/v1/subscription"),
      fetchWpJson<WpAccountSettings>("/wp-json/letz/v1/account-settings"),
    ]);

    if (!subscription) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const status = String(subscription.billing_status || "").toLowerCase();
    const amount = Number(subscription.amount || 0);

    if (status !== "active" || amount <= 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const invoiceDate = normalizeDate(subscription.created_on) || new Date().toISOString().slice(0, 10);
    const billingCycle =
      subscription.billing_cycle === "monthly" ? "monthly" : "yearly";

    const generatedId = buildInvoiceId(
      invoiceDate,
      subscription.plan || "standard",
      billingCycle
    );

    if (id !== generatedId) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const periodFrom = invoiceDate;
    const periodTo =
      normalizeDate(subscription.next_renewal_date) ||
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
      account?.contact?.contact_name ||
      "LetzShopy Vendor";

    const invoice = {
      id: generatedId,
      invoiceNumber: `LS-SUB-${invoiceDate.replaceAll("-", "")}`,
      invoiceDate,
      planCode:
        subscription.plan === "premium" ? "premium" : ("standard" as "standard" | "premium"),
      planLabel: buildPlanLabel(subscription.plan),
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
      billingAddress: account?.subscription?.billing_address || "",
      billingState: "",
      billingPhone: account?.contact?.contact_mobile || "",
      status: "paid" as const,
      paymentMode: "UPI",
      paymentReference: subscription.utr || "",
    };

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("subscription-invoices/[id] GET failed:", error);
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
}