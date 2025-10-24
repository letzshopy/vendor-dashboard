import { NextResponse } from "next/server";

function wpBase() {
  const SITE_URL = process.env.SITE_URL!;
  if (!SITE_URL) throw new Error("Missing SITE_URL");
  return SITE_URL.replace(/\/$/, "");
}
function authHeader() {
  const WP_USER = process.env.WP_USER!;
  const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD!;
  if (!WP_USER || !WP_APP_PASSWORD) throw new Error("Missing WP_USER / WP_APP_PASSWORD");
  const b64 = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64");
  return { Authorization: `Basic ${b64}` };
}

export async function GET() {
  try {
    const r = await fetch(`${wpBase()}/wp-json/letzshopy/v1/menus`, {
      headers: { ...authHeader() },
      cache: "no-store",
    });
    const text = await r.text();
    const json = (()=>{ try { return JSON.parse(text);} catch { return null;} })();
    if (!r.ok) return NextResponse.json({ error: json?.error || text }, { status: r.status || 500 });
    return NextResponse.json(json, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Proxy error" }, { status: 500 });
  }
}
