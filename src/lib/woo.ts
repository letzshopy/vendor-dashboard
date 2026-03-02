import axios from "axios";

const SITE_URL =
  process.env.SITE_URL ||
  process.env.WP_URL ||
  process.env.MASTER_WP_URL;

const KEY = process.env.WC_CONSUMER_KEY;
const SECRET = process.env.WC_CONSUMER_SECRET;

if (!SITE_URL) {
  throw new Error(
    "Missing SITE_URL (or WP_URL / MASTER_WP_URL) environment variable"
  );
}

if (!KEY || !SECRET) {
  throw new Error(
    "Missing WC_CONSUMER_KEY or WC_CONSUMER_SECRET environment variables"
  );
}

export const woo = axios.create({
  baseURL: `${SITE_URL.replace(/\/$/, "")}/wp-json/wc/v3`,
  auth: { username: KEY, password: SECRET },
  timeout: 60000,
});