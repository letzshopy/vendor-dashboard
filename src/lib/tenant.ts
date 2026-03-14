// src/lib/tenant.ts
import { cookies } from "next/headers";

export const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";
export const TENANT_COOKIE = process.env.TENANT_COOKIE_NAME || "ls_tenant";

export type Tenant = {
  store_url: string;
  wc_key?: string;
  wc_secret?: string;
  role?: string;
  email?: string;
  blog_id?: number;
  store_name?: string;
};

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeUrl(value: unknown): string {
  const s = String(value || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) return "";
  return s;
}

function base64UrlDecode(input: string): string {
  try {
    let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function extractTenantCandidate(obj: any): Tenant | null {
  if (!obj || typeof obj !== "object") return null;

  const directStoreUrl = normalizeUrl(obj.store_url);
  if (directStoreUrl) {
    return {
      store_url: directStoreUrl,
      wc_key: obj.wc_key || "",
      wc_secret: obj.wc_secret || "",
      role: obj.role || obj.saas_role || "",
      email: obj.email || "",
      blog_id: obj.blog_id,
      store_name: obj.store_name || "",
    };
  }

  const nestedTenantStoreUrl = normalizeUrl(obj?.tenant?.store_url);
  if (nestedTenantStoreUrl) {
    return {
      store_url: nestedTenantStoreUrl,
      wc_key: obj?.tenant?.wc_key || obj?.wc_key || "",
      wc_secret: obj?.tenant?.wc_secret || obj?.wc_secret || "",
      role: obj?.tenant?.role || obj?.role || obj?.saas_role || "",
      email: obj?.tenant?.email || obj?.email || "",
      blog_id: obj?.tenant?.blog_id,
      store_name: obj?.tenant?.store_name || "",
    };
  }

  const nestedStoreUrl = normalizeUrl(obj?.store?.url);
  if (nestedStoreUrl) {
    return {
      store_url: nestedStoreUrl,
      wc_key: obj?.wc_key || "",
      wc_secret: obj?.wc_secret || "",
      role: obj?.role || obj?.saas_role || "",
      email: obj?.email || "",
      blog_id: obj?.store?.blog_id,
      store_name: obj?.store?.name || "",
    };
  }

  const stores = Array.isArray(obj?.stores) ? obj.stores : [];
  if (stores.length === 1) {
    const only = stores[0];
    const oneStoreUrl = normalizeUrl(only?.store_url);
    if (oneStoreUrl) {
      return {
        store_url: oneStoreUrl,
        role: obj?.role || obj?.saas_role || "",
        email: obj?.email || "",
        blog_id: only?.blog_id,
        store_name: only?.store_name || "",
      };
    }
  }

  return null;
}

function parseTenantCookieValue(raw: string): Tenant | null {
  if (!raw) return null;

  const attempts = [raw, safeDecode(raw), safeDecode(safeDecode(raw))];

  for (const attempt of attempts) {
    const parsed = safeJsonParse<any>(attempt);
    const tenant = extractTenantCandidate(parsed);
    if (tenant?.store_url) return tenant;
  }

  return null;
}

function parseSignedAuthCookie(raw: string): Tenant | null {
  if (!raw) return null;

  const token = safeDecode(raw).trim();
  const [body] = token.split(".");
  if (!body) return null;

  const decoded = base64UrlDecode(body);
  if (!decoded) return null;

  const parsed = safeJsonParse<any>(decoded);
  const tenant = extractTenantCandidate(parsed);
  if (tenant?.store_url) return tenant;

  return null;
}

export async function getTenantFromCookies(): Promise<Tenant | null> {
  const cookieStore = await cookies();

  const rawTenant = cookieStore.get(TENANT_COOKIE)?.value || "";
  const rawAuth = cookieStore.get(AUTH_COOKIE)?.value || "";

  const fromTenant = parseTenantCookieValue(rawTenant);
  if (fromTenant?.store_url) return fromTenant;

  const fromAuthJson = parseTenantCookieValue(rawAuth);
  if (fromAuthJson?.store_url) return fromAuthJson;

  const fromSignedAuth = parseSignedAuthCookie(rawAuth);
  if (fromSignedAuth?.store_url) return fromSignedAuth;

  return null;
}