import { cookies } from "next/headers";

import {
  findAuthorizedStore,
  type SessionRole,
  verifySessionToken,
} from "./session";

export const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  "ls_vendor_auth";

export const TENANT_COOKIE =
  process.env.TENANT_COOKIE_NAME ||
  "ls_tenant";

const SESSION_SIGNING_SECRET =
  process.env.DASHBOARD_SECRET || "";

type JsonRecord = Record<string, unknown>;

export type Tenant = {
  store_url: string;
  blog_id: number;
  store_name: string;
  role: SessionRole;
  email: string;

  /*
   * Retained temporarily for compatibility with
   * src/lib/woo.ts.
   *
   * These credentials are never read from cookies or
   * the signed session. WooCommerce credentials must
   * continue to come from server environment values.
   */
  wc_key?: string;
  wc_secret?: string;
};

function isRecord(
  value: unknown
): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function parseJsonRecord(
  value: string
): JsonRecord | null {
  try {
    const parsed: unknown = JSON.parse(value);

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function decodeCookieValue(
  value: string
): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseTenantCookie(
  rawValue: string
): JsonRecord | null {
  if (!rawValue) {
    return null;
  }

  const decodedOnce =
    decodeCookieValue(rawValue);

  const decodedTwice =
    decodeCookieValue(decodedOnce);

  const attempts = [
    rawValue,
    decodedOnce,
    decodedTwice,
  ];

  const checkedValues = new Set<string>();

  for (const attempt of attempts) {
    if (
      !attempt ||
      checkedValues.has(attempt)
    ) {
      continue;
    }

    checkedValues.add(attempt);

    const parsed = parseJsonRecord(attempt);

    if (parsed) {
      return parsed;
    }
  }

  return null;
}

export async function getTenantFromCookies():
  Promise<Tenant | null> {
  if (!SESSION_SIGNING_SECRET) {
    return null;
  }

  const cookieStore = await cookies();

  const rawAuthToken =
    cookieStore.get(AUTH_COOKIE)?.value || "";

  const session = await verifySessionToken(
    rawAuthToken,
    SESSION_SIGNING_SECRET
  );

  if (
    !session ||
    session.saas_role === "master_admin"
  ) {
    return null;
  }

  const rawTenant =
    cookieStore.get(TENANT_COOKIE)?.value || "";

  const tenantCookie =
    parseTenantCookie(rawTenant);

  if (!tenantCookie) {
    return null;
  }

  const authorizedStore =
    findAuthorizedStore(session, {
      blog_id: tenantCookie.blog_id,
      store_url: tenantCookie.store_url,
    });

  if (!authorizedStore) {
    return null;
  }

  return {
    store_url: authorizedStore.store_url,
    blog_id: authorizedStore.blog_id,
    store_name: authorizedStore.store_name,
    role: session.saas_role,
    email: session.email,
  };
}