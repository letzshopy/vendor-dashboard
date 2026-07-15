import { NextResponse } from "next/server";

import { getWpBaseUrl } from "@/lib/wpClient";

const INTERNAL_TOKEN = process.env.LETZ_INTERNAL_TOKEN || "";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function textField(source: JsonRecord, key: string): string {
  return typeof source[key] === "string" ? source[key] : "";
}

function numberField(source: JsonRecord, key: string): number {
  const value = Number(source[key]);

  return Number.isFinite(value) ? value : 0;
}

function publicDomainRenewal(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;

  return {
    enabled: value.enabled === true,
    service_type: "domain_renewal",
    service_label: "Domain Renewal",
    domain_name: textField(value, "domain_name"),
    annual_amount: numberField(value, "annual_amount"),
    amount: numberField(value, "amount"),
    currency: textField(value, "currency") || "INR",
    billing_cycle: "yearly",
    recurring: value.recurring !== false,
    renewal_date: textField(value, "renewal_date"),
    next_renewal_date: textField(value, "next_renewal_date"),
    invoice_date: textField(value, "invoice_date"),
    grace_ends_at: textField(value, "grace_ends_at"),
    status: textField(value, "status"),
    payment_status: textField(value, "payment_status"),
    payment_reference: textField(value, "payment_reference"),
    payment_submitted_at: textField(value, "payment_submitted_at"),
    last_paid_date: textField(value, "last_paid_date"),
    days_to_renewal:
      typeof value.days_to_renewal === "number" ? value.days_to_renewal : null,
    strong_message: textField(value, "strong_message"),
    history: Array.isArray(value.history) ? value.history : [],
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    if (!INTERNAL_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Domain renewal service is not configured." },
        { status: 500, headers: PRIVATE_HEADERS }
      );
    }

    const base = (await getWpBaseUrl()).replace(/\/$/, "");
    const response = await fetch(`${base}/wp-json/letz/v1/domain-renewal/status`, {
      method: "GET",
      headers: { "x-letz-auth": INTERNAL_TOKEN },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    const parsed: unknown = await response.json().catch(() => null);
    const service = publicDomainRenewal(parsed);

    if (!response.ok || !service) {
      return NextResponse.json(
        { ok: false, error: "Could not load domain renewal details." },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502, headers: PRIVATE_HEADERS }
      );
    }

    return NextResponse.json(service, { status: 200, headers: PRIVATE_HEADERS });
  } catch (error: unknown) {
    console.error("Domain renewal read failed:", error instanceof Error ? error.message : "Unknown error");

    return NextResponse.json(
      { ok: false, error: "Could not load domain renewal details." },
      { status: 500, headers: PRIVATE_HEADERS }
    );
  }
}
