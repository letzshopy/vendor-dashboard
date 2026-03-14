// src/lib/woo.ts
import axios, { AxiosInstance } from "axios";
import { getTenantFromCookies } from "./tenant";

function normalizeBase(url: string) {
  return String(url || "").replace(/\/+$/, "");
}

export async function getWooClient(): Promise<AxiosInstance> {
  // ✅ First preference: tenant cookie (SaaS)
  const tenant = await getTenantFromCookies();

  // ✅ Tenant fallback must be TEMPLATE url only (NOT master)
  const storeUrl =
    tenant?.store_url ||
    process.env.WP_URL ||
    process.env.SITE_URL ||
    "";

  const key = tenant?.wc_key || process.env.WC_CONSUMER_KEY;
  const secret = tenant?.wc_secret || process.env.WC_CONSUMER_SECRET;

  if (!storeUrl) {
    throw new Error("Missing storeUrl (tenant.store_url or WP_URL/SITE_URL)");
  }
  if (!key || !secret) {
    throw new Error("Missing Woo keys (tenant wc_key/wc_secret or env keys)");
  }

  return axios.create({
    baseURL: `${normalizeBase(storeUrl)}/wp-json/wc/v3`,
    auth: { username: key, password: secret },
    timeout: 60000,
  });
}