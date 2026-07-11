import axios, {
  type AxiosInstance,
} from "axios";

import {
  getTenantFromCookies,
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

export async function getWpBaseUrl():
  Promise<string> {
  const tenant =
    await getTenantFromCookies();

  if (!tenant) {
    throw new Error(
      "No verified and authorized vendor tenant is selected"
    );
  }

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

export async function getWpClient():
  Promise<AxiosInstance> {
  const baseUrl = await getWpBaseUrl();

  return axios.create({
    baseURL: `${baseUrl}/wp-json`,
    headers: wpAuthHeader(),
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