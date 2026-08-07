import "server-only";

import type { Tenant } from "./tenant";

type JsonRecord = Record<string, unknown>;

type StandaloneStoreCredential = {
  store_url?: string;
  internal_token?: string;
  wc_consumer_key?: string;
  wc_consumer_secret?: string;
  wp_auth?: string;
  wp_user?: string;
  wp_app_password?: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeUrl(value: unknown): string {
  const raw = String(value || "").trim().replace(/\/+$/, "");

  if (!/^https:\/\//i.test(raw)) {
    return "";
  }

  try {
    const parsed = new URL(raw);

    if (parsed.username || parsed.password) {
      return "";
    }

    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function boundedSecret(value: unknown, maxLength = 4096): string {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function parseCredentialMap(): Map<number, StandaloneStoreCredential> {
  const raw = (process.env.STANDALONE_STORE_CREDENTIALS_JSON || "").trim();

  if (!raw) {
    return new Map();
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Invalid standalone store credential configuration");
  }

  if (!isRecord(parsed)) {
    throw new Error("Invalid standalone store credential configuration");
  }

  const result = new Map<number, StandaloneStoreCredential>();

  for (const [rawId, rawValue] of Object.entries(parsed)) {
    const storeId = Number(rawId);

    if (!Number.isSafeInteger(storeId) || storeId <= 0 || !isRecord(rawValue)) {
      throw new Error("Invalid standalone store credential entry");
    }

    const configuredUrl = rawValue.store_url
      ? normalizeUrl(rawValue.store_url)
      : "";

    if (rawValue.store_url && !configuredUrl) {
      throw new Error("Invalid standalone store credential URL");
    }

    result.set(storeId, {
      store_url: configuredUrl || undefined,
      internal_token: boundedSecret(rawValue.internal_token) || undefined,
      wc_consumer_key: boundedSecret(rawValue.wc_consumer_key) || undefined,
      wc_consumer_secret: boundedSecret(rawValue.wc_consumer_secret) || undefined,
      wp_auth: boundedSecret(rawValue.wp_auth) || undefined,
      wp_user: boundedSecret(rawValue.wp_user, 320) || undefined,
      wp_app_password: boundedSecret(rawValue.wp_app_password) || undefined,
    });
  }

  return result;
}

function standaloneCredentialForTenant(
  tenant: Pick<Tenant, "blog_id" | "store_url" | "store_type">
): StandaloneStoreCredential | null {
  const credentials = parseCredentialMap().get(tenant.blog_id) || null;

  if (!credentials) {
    return null;
  }

  const tenantUrl = normalizeUrl(tenant.store_url);

  if (!tenantUrl) {
    throw new Error("Invalid standalone tenant URL");
  }

  if (
    credentials.store_url &&
    normalizeUrl(credentials.store_url) !== tenantUrl
  ) {
    throw new Error("Standalone store credential URL does not match the verified tenant");
  }

  return credentials;
}

export function getStoreInternalToken(tenant: Tenant): string {
  const standalone = standaloneCredentialForTenant(tenant);

  if (tenant.store_type === "standalone" || standalone) {
    const token = standalone?.internal_token || "";

    if (!token) {
      throw new Error("Missing standalone WordPress internal authentication configuration");
    }

    return token;
  }

  const token = (process.env.LETZ_INTERNAL_TOKEN || "").trim();

  if (!token) {
    throw new Error("Missing WordPress internal authentication configuration");
  }

  return token;
}

export function getStoreWooCredentials(tenant: Tenant): {
  key: string;
  secret: string;
} {
  const standalone = standaloneCredentialForTenant(tenant);

  if (tenant.store_type === "standalone" || standalone) {
    const key = standalone?.wc_consumer_key || "";
    const secret = standalone?.wc_consumer_secret || "";

    if (!key || !secret) {
      throw new Error("Missing standalone WooCommerce authentication configuration");
    }

    return { key, secret };
  }

  const key = (process.env.WC_CONSUMER_KEY || "").trim();
  const secret = (process.env.WC_CONSUMER_SECRET || "").trim();

  const missingVariables: string[] = [];

  if (!key) missingVariables.push("WC_CONSUMER_KEY");
  if (!secret) missingVariables.push("WC_CONSUMER_SECRET");

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing WooCommerce authentication configuration: ${missingVariables.join(", ")}`
    );
  }

  return { key, secret };
}

export function getStoreWpAuthorization(tenant: Tenant): string {
  const standalone = standaloneCredentialForTenant(tenant);

  if (tenant.store_type === "standalone" || standalone) {
    if (standalone?.wp_auth) {
      return `Basic ${standalone.wp_auth}`;
    }

    const user = standalone?.wp_user || "";
    const password = (standalone?.wp_app_password || "").replace(/\s+/g, "");

    if (!user || !password) {
      throw new Error("Missing standalone WordPress authentication configuration");
    }

    return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  }

  const configuredToken = process.env.WP_AUTH || "";

  if (configuredToken) {
    return `Basic ${configuredToken}`;
  }

  const user = process.env.WP_USER || "";
  const password = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");

  const missingVariables: string[] = [];

  if (!user) missingVariables.push("WP_USER");
  if (!password) missingVariables.push("WP_APP_PASSWORD");

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing WordPress authentication configuration: ${missingVariables.join(", ")}`
    );
  }

  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}
