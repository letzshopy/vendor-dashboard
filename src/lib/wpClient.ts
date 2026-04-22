// src/lib/wpClient.ts
import axios, { AxiosInstance } from "axios";
import { getTenantFromCookies } from "./tenant";

function normalizeBase(url: string) {
  return String(url || "").trim().replace(/\/+$/, "");
}

export function wpAuthHeader() {
  const token = process.env.WP_AUTH;
  if (token) return { Authorization: `Basic ${token}` };

  const user = process.env.WP_USER || "";
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");
  const missing: string[] = [];

  if (!user) missing.push("WP_USER");
  if (!pass) missing.push("WP_APP_PASSWORD");

  if (missing.length) {
    throw new Error(
      `Missing WP auth env. Provide WP_AUTH or ${missing.join(", ")}`
    );
  }

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  return { Authorization: `Basic ${auth}` };
}

export async function getWpBaseUrl(): Promise<string> {
  const tenant = await getTenantFromCookies();

  if (tenant?.store_url) {
    return normalizeBase(tenant.store_url);
  }

  const fallback = process.env.WP_URL || process.env.SITE_URL || "";
  if (fallback) {
    return normalizeBase(fallback);
  }

  throw new Error(
    "Missing vendor WP base URL (tenant cookie / WP_URL / SITE_URL)"
  );
}

export function getMasterWpBaseUrl(): string {
  const base =
    process.env.MASTER_WP_URL ||
    process.env.MASTER_SITE_URL ||
    process.env.WP_URL ||
    process.env.SITE_URL ||
    "";

  if (!base) {
    throw new Error(
      "Missing MASTER_WP_URL (or MASTER_SITE_URL / WP_URL / SITE_URL) in env"
    );
  }

  return normalizeBase(base);
}

export async function getWpClient(): Promise<AxiosInstance> {
  const base = await getWpBaseUrl();

  return axios.create({
    baseURL: `${base}/wp-json`,
    headers: wpAuthHeader(),
    timeout: 60000,
  });
}

export function getMasterWpClient(): AxiosInstance {
  const base = getMasterWpBaseUrl();

  return axios.create({
    baseURL: `${base}/wp-json`,
    headers: wpAuthHeader(),
    timeout: 60000,
  });
}