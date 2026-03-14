import { NextRequest, NextResponse } from "next/server";
import { getWpBaseUrl, wpAuthHeader } from "@/lib/wpClient";

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null as any;
  }
}

export async function GET(req: NextRequest) {
  try {
    const base = await getWpBaseUrl();

    const { searchParams } = new URL(req.url);
    const qs = new URLSearchParams();

    for (const key of ["location", "location_label", "menu_name", "menu_id"]) {
      const v = searchParams.get(key);
      if (v !== null) qs.set(key, v);
    }

    const r = await fetch(`${base}/wp-json/letzshopy/v1/menu?${qs.toString()}`, {
      headers: { ...wpAuthHeader() },
      cache: "no-store",
    });

    const text = await r.text();
    const json = safeJson(text);

    if (!r.ok) {
      return NextResponse.json(
        { error: json?.error || text || "WP menu GET failed" },
        { status: r.status || 500 }
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Proxy GET error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const base = await getWpBaseUrl();
    const body = await req.json();

    const r = await fetch(`${base}/wp-json/letzshopy/v1/menu`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...wpAuthHeader(),
      },
      body: JSON.stringify(body),
    });

    const text = await r.text();
    const json = safeJson(text);

    if (!r.ok) {
      return NextResponse.json(
        { error: json?.error || text || "WP menu POST failed" },
        { status: r.status || 500 }
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Proxy POST error" },
      { status: 500 }
    );
  }
}