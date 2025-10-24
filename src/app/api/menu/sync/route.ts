import { NextRequest, NextResponse } from "next/server";

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
function safeJson(s: string) { try { return JSON.parse(s); } catch { return null as any; } }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qs = new URLSearchParams();
    for (const key of ["location","location_label","menu_name","menu_id"]) {
      const v = searchParams.get(key);
      if (v !== null) qs.set(key, v);
    }
    const r = await fetch(`${wpBase()}/wp-json/letzshopy/v1/menu?${qs.toString()}`, {
      headers: { ...authHeader() }, cache: "no-store",
    });
    const text = await r.text(); const json = safeJson(text);
    if (!r.ok) return NextResponse.json({ error: json?.error || text }, { status: r.status || 500 });
    return NextResponse.json(json, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Proxy GET error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const r = await fetch(`${wpBase()}/wp-json/letzshopy/v1/menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    });
    const text = await r.text(); const json = safeJson(text);
    if (!r.ok) return NextResponse.json({ error: json?.error || text }, { status: r.status || 500 });
    return NextResponse.json(json, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Proxy POST error" }, { status: 500 });
  }
}
