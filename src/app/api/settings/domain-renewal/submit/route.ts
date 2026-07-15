import { NextResponse, type NextRequest } from "next/server";

import { getWpBaseUrl } from "@/lib/wpClient";

const INTERNAL_TOKEN = process.env.LETZ_INTERNAL_TOKEN || "";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizePaymentReference(value: unknown): string {
  const reference = String(value || "").trim().toUpperCase();

  return /^[A-Z0-9][A-Z0-9._/-]{5,63}$/.test(reference) ? reference : "";
}

function statusFrom(value: unknown): string {
  if (!isRecord(value)) return "";

  const status = value.payment_status ?? value.status;

  return typeof status === "string" ? status.trim().toLowerCase() : "";
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export async function POST(request: NextRequest) {
  try {
    if (!INTERNAL_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Domain renewal service is not configured." },
        { status: 500, headers: PRIVATE_HEADERS }
      );
    }

    const parsedBody: unknown = await request.json().catch(() => null);
    const body = isRecord(parsedBody) ? parsedBody : {};
    const paymentReference = normalizePaymentReference(
      body.payment_reference ?? body.utr
    );

    if (!paymentReference) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid UPI transaction reference." },
        { status: 400, headers: PRIVATE_HEADERS }
      );
    }

    const base = (await getWpBaseUrl()).replace(/\/$/, "");
    const headers = { "x-letz-auth": INTERNAL_TOKEN };

    const currentResponse = await fetch(
      `${base}/wp-json/letz/v1/domain-renewal/status`,
      {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      }
    );

    const current = await readJson(currentResponse);

    if (!currentResponse.ok || !isRecord(current) || current.enabled !== true) {
      return NextResponse.json(
        { ok: false, error: "Domain renewal billing is not enabled for this store." },
        { status: 403, headers: PRIVATE_HEADERS }
      );
    }

    if (statusFrom(current) === "payment_submitted") {
      return NextResponse.json(
        { ok: false, error: "A domain renewal payment is already awaiting verification." },
        { status: 409, headers: PRIVATE_HEADERS }
      );
    }

    const response = await fetch(`${base}/wp-json/letz/v1/domain-renewal/submit`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payment_reference: paymentReference, utr: paymentReference }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    const parsed = await readJson(response);

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            isRecord(parsed) && typeof parsed.message === "string"
              ? parsed.message
              : "Could not submit domain renewal payment.",
        },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502, headers: PRIVATE_HEADERS }
      );
    }

    return NextResponse.json(parsed, { status: 200, headers: PRIVATE_HEADERS });
  } catch (error: unknown) {
    console.error("Domain renewal submit failed:", error instanceof Error ? error.message : "Unknown error");

    return NextResponse.json(
      { ok: false, error: "Could not submit domain renewal payment." },
      { status: 500, headers: PRIVATE_HEADERS }
    );
  }
}
