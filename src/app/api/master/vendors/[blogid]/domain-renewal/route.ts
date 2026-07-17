import { NextResponse, type NextRequest } from "next/server";

import { resolveMasterVendorStoreUrl } from "@/lib/masterVendor";

const INTERNAL_TOKEN = process.env.LETZ_INTERNAL_TOKEN || "";
const MASTER_API_KEY = process.env.MASTER_API_KEY || "";

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

function safeDomainRenewal(value: unknown): JsonRecord | null {
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

function domainRenewalPayload(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;

  const candidate = isRecord(value.domain_renewal)
    ? value.domain_renewal
    : value;

  if (candidate.service_type !== "domain_renewal") return null;

  return safeDomainRenewal(candidate);
}

function upstreamError(value: unknown, fallback: string): string {
  if (!isRecord(value)) return fallback;

  const message = value.message ?? value.error;

  return typeof message === "string" && message.trim()
    ? message.trim()
    : fallback;
}

function normalizeDomain(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .slice(0, 253);
}

function normalizeDate(value: unknown): string {
  const raw = String(value || "").trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  context: { params: Promise<{ blogid: string }> }
) {
  try {
    if (!INTERNAL_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Domain renewal service is not configured." },
        { status: 500, headers: PRIVATE_HEADERS }
      );
    }

    const { blogid } = await context.params;
    const storeUrl = await resolveMasterVendorStoreUrl(blogid);

    const response = await fetch(`${storeUrl}/wp-json/letz/v1/domain-renewal/status/?_ts=${Date.now()}`, {
      headers: { "x-letz-auth": INTERNAL_TOKEN },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    const parsed = await readJson(response);
    const service = domainRenewalPayload(parsed);

    if (!response.ok || !service) {
      return NextResponse.json(
        { ok: false, error: "Could not load domain renewal service." },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502, headers: PRIVATE_HEADERS }
      );
    }

    return NextResponse.json(service, { status: 200, headers: PRIVATE_HEADERS });
  } catch (error: unknown) {
    console.error("Master domain renewal read failed:", error instanceof Error ? error.message : "Unknown error");

    return NextResponse.json(
      { ok: false, error: "Could not load domain renewal service." },
      { status: 500, headers: PRIVATE_HEADERS }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ blogid: string }> }
) {
  try {
    if (!MASTER_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Master service is not configured." },
        { status: 500, headers: PRIVATE_HEADERS }
      );
    }

    const parsedBody: unknown = await request.json().catch(() => null);
    const body = isRecord(parsedBody) ? parsedBody : {};
    const enabled = body.enabled === true;
    const domainName = normalizeDomain(body.domain_name);
    const annualAmount = Number(body.annual_amount ?? body.amount ?? 0);
    const renewalDate = normalizeDate(body.renewal_date ?? body.next_renewal_date);

    if (enabled && !domainName) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid domain name." },
        { status: 400, headers: PRIVATE_HEADERS }
      );
    }

    if (enabled && (!Number.isFinite(annualAmount) || annualAmount <= 0)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid annual renewal amount." },
        { status: 400, headers: PRIVATE_HEADERS }
      );
    }

    if (enabled && !renewalDate) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid domain renewal date." },
        { status: 400, headers: PRIVATE_HEADERS }
      );
    }

    const { blogid } = await context.params;
    const storeUrl = await resolveMasterVendorStoreUrl(blogid);

    const response = await fetch(`${storeUrl}/wp-json/letz/v1/domain-renewal/update/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MASTER_API_KEY}`,
        "X-Letz-Master-Key": MASTER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        enabled,
        domain_name: domainName,
        annual_amount: annualAmount,
        renewal_date: renewalDate,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    const parsed = await readJson(response);
    const service = domainRenewalPayload(parsed);

    if (!response.ok || !isRecord(parsed) || parsed.ok !== true || !service) {
      return NextResponse.json(
        {
          ok: false,
          error: upstreamError(parsed, "Could not update domain renewal service."),
        },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502, headers: PRIVATE_HEADERS }
      );
    }

    const persistedAmount = Number(service.annual_amount ?? service.amount ?? 0);
    const persistedDate = normalizeDate(service.renewal_date ?? service.next_renewal_date);
    const persisted =
      service.enabled === enabled &&
      textField(service, "domain_name") === domainName &&
      Math.abs(persistedAmount - annualAmount) < 0.01 &&
      persistedDate === renewalDate;

    if (!persisted) {
      return NextResponse.json(
        {
          ok: false,
          error: "WordPress did not persist the submitted domain renewal settings.",
        },
        { status: 502, headers: PRIVATE_HEADERS }
      );
    }

    return NextResponse.json(service, { status: 200, headers: PRIVATE_HEADERS });
  } catch (error: unknown) {
    console.error("Master domain renewal update failed:", error instanceof Error ? error.message : "Unknown error");

    return NextResponse.json(
      { ok: false, error: "Could not update domain renewal service." },
      { status: 500, headers: PRIVATE_HEADERS }
    );
  }
}
