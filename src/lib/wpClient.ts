import axios, {
  type AxiosInstance,
} from "axios";

import {
  getStoreInternalToken,
  getStoreWpAuthorization,
} from "./storeCredentials";
import {
  getTenantFromCookies,
  type Tenant,
} from "./tenant";

function normalizeBaseUrl(
  rawUrl: string,
  sourceName: string
): string {
  const value = String(rawUrl || "")
    .trim()
    .replace(/\/+$/, "");

  if (!/^https?:\/\//i.test(value)) {
    throw new Error(
      `Invalid ${sourceName} URL configuration`
    );
  }

  return value;
}

async function getVerifiedTenant(): Promise<Tenant> {
  const tenant = await getTenantFromCookies();

  if (!tenant) {
    throw new Error(
      "No verified and authorized vendor tenant is selected"
    );
  }

  return tenant;
}

export function wpAuthHeader(): {
  Authorization: string;
} {
  const configuredToken =
    process.env.WP_AUTH || "";

  if (configuredToken) {
    return {
      Authorization:
        `Basic ${configuredToken}`,
    };
  }

  const user = process.env.WP_USER || "";

  const password = (
    process.env.WP_APP_PASSWORD || ""
  ).replace(/\s+/g, "");

  const missingVariables: string[] = [];

  if (!user) {
    missingVariables.push("WP_USER");
  }

  if (!password) {
    missingVariables.push(
      "WP_APP_PASSWORD"
    );
  }

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing WordPress authentication configuration: ${
        missingVariables.join(", ")
      }`
    );
  }

  const encodedCredentials =
    Buffer.from(
      `${user}:${password}`
    ).toString("base64");

  return {
    Authorization:
      `Basic ${encodedCredentials}`,
  };
}

export function wpInternalAuthHeader(): {
  "X-Letz-Auth": string;
} {
  const token = (
    process.env.LETZ_INTERNAL_TOKEN || ""
  ).trim();

  if (!token) {
    throw new Error(
      "Missing WordPress internal authentication configuration"
    );
  }

  return {
    "X-Letz-Auth": token,
  };
}

export async function getWpBaseUrl():
  Promise<string> {
  const tenant = await getVerifiedTenant();

  return normalizeBaseUrl(
    tenant.store_url,
    "vendor WordPress"
  );
}

export function getMasterWpBaseUrl():
  string {
  const configuredBaseUrl =
    process.env.MASTER_WP_URL ||
    process.env.MASTER_SITE_URL ||
    "";

  if (!configuredBaseUrl) {
    throw new Error(
      "Missing master WordPress URL configuration"
    );
  }

  return normalizeBaseUrl(
    configuredBaseUrl,
    "master WordPress"
  );
}

export async function fetchInternalWp(
  path: string,
  init: RequestInit = {},
  timeoutMs = 20_000
): Promise<Response> {
  if (!path.startsWith("/wp-json/")) {
    throw new Error(
      "Invalid internal WordPress API path"
    );
  }

  const tenant = await getVerifiedTenant();
  const baseUrl = normalizeBaseUrl(
    tenant.store_url,
    "vendor WordPress"
  );
  const headers = new Headers(init.headers);

  headers.set(
    "X-Letz-Auth",
    getStoreInternalToken(tenant)
  );

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: init.cache || "no-store",
    signal:
      init.signal ||
      AbortSignal.timeout(timeoutMs),
  });
}

export async function getWpClient():
  Promise<AxiosInstance> {
  const tenant = await getVerifiedTenant();
  const baseUrl = normalizeBaseUrl(
    tenant.store_url,
    "vendor WordPress"
  );

  return axios.create({
    baseURL: `${baseUrl}/wp-json`,
    headers: {
      Authorization: getStoreWpAuthorization(tenant),
    },
    timeout: 60000,
  });
}

export function getMasterWpClient():
  AxiosInstance {
  const baseUrl = getMasterWpBaseUrl();

  return axios.create({
    baseURL: `${baseUrl}/wp-json`,
    headers: wpAuthHeader(),
    timeout: 60000,
  });
}
