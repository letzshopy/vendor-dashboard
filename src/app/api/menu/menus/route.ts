import { NextResponse } from "next/server";
import { getWpBaseUrl, wpAuthHeader } from "@/lib/wpClient";

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null as any;
  }
}

export async function GET() {
  try {
    const base = (await getWpBaseUrl()).replace(/\/$/, "");

    const r = await fetch(`${base}/wp-json/letzshopy/v1/menus`, {
      headers: { ...wpAuthHeader() },
      cache: "no-store",
    });

    const text = await r.text();
    const json = safeJson(text);

    if (!r.ok) {
      return NextResponse.json(
        { error: json?.error || "WP menus failed", details: json || text },
        { status: r.status || 500 }
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Proxy error" },
      { status: 500 }
    );
  }
}