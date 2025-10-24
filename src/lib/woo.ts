import axios from "axios";

const SITE_URL = process.env.SITE_URL!;
const KEY      = process.env.WC_CONSUMER_KEY!;
const SECRET   = process.env.WC_CONSUMER_SECRET!;

export const woo = axios.create({
  baseURL: `${SITE_URL.replace(/\/$/, "")}/wp-json/wc/v3`,
  auth: { username: KEY, password: SECRET },
  timeout: 60000,
});
