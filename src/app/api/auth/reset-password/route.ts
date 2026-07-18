import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REGISTRY_URL = process.env.REGISTRY_URL || "";
const REGISTRY_TOKEN = process.env.REGISTRY_TOKEN || "";

const MAX_REQUEST_BYTES = 8_192;
const MAX_EMAIL_LENGTH = 254;
const MIN_TOKEN_LENGTH = 8;
const MAX_TOKEN_LENGTH = 2_048;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 256;
const UPSTREAM_TIMEOUT_MS = 15_000;

type JsonRecord = Record<string, unknown>;

function privateJson(
  body: JsonRecord,
  status: number
): NextResponse<JsonRecord> {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

function invalidResetResponse() {
  return privateJson(
    {
      ok: false,
      error: "Invalid or expired reset link.",
    },
    400
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

function normalizeToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const token = value.trim();

  if (
    token.length < MIN_TOKEN_LENGTH ||
    token.length > MAX_TOKEN_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(token)
  ) {
    return null;
  }

  return token;
}

function validatePassword(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length < MIN_PASSWORD_LENGTH ||
    value.length > MAX_PASSWORD_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return null;
  }

  return value;
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
      "Reset-password request could not be routed because the registry is not configured."
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
        `Reset-password registry request failed with status ${response.status}.`
      );
      return null;
    }

    const payload: unknown = await response.json();
    return findRegistryStoreUrl(payload);
  } catch (error: unknown) {
    console.error(
      "Reset-password registry request failed:",
      error instanceof Error ? error.message : "Unknown upstream error"
    );
    return null;
  }
}

async function submitPasswordReset(
  storeUrl: string,
  email: string,
  token: string,
  newPassword: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${storeUrl}/wp-json/letz/v1/auth/reset-password`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          email,
          token,
          new_password: newPassword,
        }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      console.error(
        `Reset-password tenant request failed with status ${response.status}.`
      );
      return false;
    }

    return true;
  } catch (error: unknown) {
    console.error(
      "Reset-password tenant request failed:",
      error instanceof Error ? error.message : "Unknown upstream error"
    );
    return false;
  }
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || "0");

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_REQUEST_BYTES
  ) {
    return invalidResetResponse();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalidResetResponse();
  }

  if (!isRecord(body)) {
    return invalidResetResponse();
  }

  const email = normalizeEmail(body.email);
  const token = normalizeToken(body.token);
  const newPassword = validatePassword(body.new_password);

  if (!email || !token || !newPassword) {
    return invalidResetResponse();
  }

  const storeUrl = await resolveStoreUrl(email);

  if (!storeUrl) {
    return invalidResetResponse();
  }

  const resetSucceeded = await submitPasswordReset(
    storeUrl,
    email,
    token,
    newPassword
  );

  if (!resetSucceeded) {
    /*
     * Do not forward WordPress error messages or status codes. Doing so could
     * expose tenant implementation details or distinguish account state.
     */
    return invalidResetResponse();
  }

  return privateJson({ ok: true }, 200);
}