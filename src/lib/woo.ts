import axios, {
  type AxiosInstance,
} from "axios";

import {
  getTenantFromCookies,
} from "./tenant";

function normalizeStoreUrl(
  rawUrl: string
): string {
  const value = String(rawUrl || "")
    .trim()
    .replace(/\/+$/, "");

  if (!/^https?:\/\//i.test(value)) {
    throw new Error(
      "Invalid vendor WooCommerce store URL"
    );
  }

  return value;
}

function getWooCredentials(): {
  key: string;
  secret: string;
} {
  const key = (
    process.env.WC_CONSUMER_KEY || ""
  ).trim();

  const secret = (
    process.env.WC_CONSUMER_SECRET || ""
  ).trim();

  const missingVariables: string[] = [];

  if (!key) {
    missingVariables.push(
      "WC_CONSUMER_KEY"
    );
  }

  if (!secret) {
    missingVariables.push(
      "WC_CONSUMER_SECRET"
    );
  }

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing WooCommerce authentication configuration: ${
        missingVariables.join(", ")
      }`
    );
  }

  return {
    key,
    secret,
  };
}

export async function getWooClient():
  Promise<AxiosInstance> {
  const tenant =
    await getTenantFromCookies();

  if (!tenant) {
    throw new Error(
      "No verified and authorized vendor tenant is selected"
    );
  }

  const storeUrl = normalizeStoreUrl(
    tenant.store_url
  );

  /*
   * WooCommerce credentials are server-controlled.
   * They must never come from cookies, request data,
   * or the tenant selector.
   */
  const {
    key,
    secret,
  } = getWooCredentials();

  return axios.create({
    baseURL:
      `${storeUrl}/wp-json/wc/v3`,
    auth: {
      username: key,
      password: secret,
    },
    timeout: 60000,
  });
}