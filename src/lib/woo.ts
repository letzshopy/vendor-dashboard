import axios, {
  type AxiosInstance,
} from "axios";

import {
  getStoreWooCredentials,
} from "./storeCredentials";
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
   * WooCommerce credentials remain server-controlled.
   * Multisite stores use the existing global credentials.
   * Standalone stores resolve their own credentials from the
   * server-only standalone credential map.
   */
  const {
    key,
    secret,
  } = getStoreWooCredentials(tenant);

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
