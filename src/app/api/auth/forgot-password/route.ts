import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REGISTRY_URL = process.env.REGISTRY_URL || "";
const REGISTRY_TOKEN = process.env.REGISTRY_TOKEN || "";

const MAX_REQUEST_BYTES = 4_096;
const MAX_EMAIL_LENGTH = 254;
const UPSTREAM_TIMEOUT_MS = 15_000;

type JsonRecord = Record<string, unknown>;

function privateSuccessResponse() {
  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, private",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();

  if (
    !email ||
    email.length > MAX_EMAIL_LENGTH ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }

  return email;
}

function normalizeServiceBaseUrl(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function findRegistryStoreUrl(payload: unknown): string | null {
  if (
    !isRecord(payload) ||
    payload.ok !== true ||
    !Array.isArray(payload.stores)
  ) {
    return null;
  }

  for (const store of payload.stores) {
    if (!isRecord(store) || typeof store.store_url !== "string") {
      continue;
    }

    const normalizedUrl = normalizeServiceBaseUrl(store.store_url);

    if (normalizedUrl) {
      return normalizedUrl;
    }
  }

  return null;
}

async function resolveStoreUrl(email: string): Promise<string | null> {
  const registryBaseUrl = normalizeServiceBaseUrl(REGISTRY_URL);
  const registryToken = REGISTRY_TOKEN.trim();

  if (!registryBaseUrl || !registryToken) {
    console.error(
      "Forgot-password request could not be routed because the registry is not configured."
    );
    return null;
  }

  const registryEndpoint = new URL(
    `${registryBaseUrl}/wp-json/letz/v1/vendor-by-email`
  );
  registryEndpoint.searchParams.set("email", email);

  try {
    const response = await fetch(registryEndpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-letz-auth": registryToken,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        `Forgot-password registry request failed with status ${response.status}.`
      );
      return null;
    }

    const payload: unknown = await response.json();
    return findRegistryStoreUrl(payload);
  } catch (error: unknown) {
    console.error(
      "Forgot-password registry request failed:",
      error instanceof Error ? error.message : "Unknown upstream error"
    );
    return null;
  }
}

async function requestTenantPasswordReset(
  storeUrl: string,
  email: string
): Promise<void> {
  try {
    const response = await fetch(
      `${storeUrl}/wp-json/letz/v1/auth/forgot-password`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
        cache: "no-store",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      console.error(
        `Forgot-password tenant request failed with status ${response.status}.`
      );
    }
  } catch (error: unknown) {
    console.error(
      "Forgot-password tenant request failed:",
      error instanceof Error ? error.message : "Unknown upstream error"
    );
  }
}

export async function POST(request: NextRequest) {
  /*
   * Every outcome intentionally returns the same response. This prevents the
   * public endpoint from revealing whether an email address, vendor account,
   * tenant, or registry record exists.
   */
  const contentLength = Number(request.headers.get("content-length") || "0");

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_REQUEST_BYTES
  ) {
    return privateSuccessResponse();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return privateSuccessResponse();
  }

  if (!isRecord(body)) {
    return privateSuccessResponse();
  }

  const email = normalizeEmail(body.email);

  if (!email) {
    return privateSuccessResponse();
  }

  const storeUrl = await resolveStoreUrl(email);

  if (storeUrl) {
    await requestTenantPasswordReset(storeUrl, email);
  }

  return privateSuccessResponse();
}