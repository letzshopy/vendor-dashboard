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
    const per_page = searchParams.get("per_page") || "100";
    const search = searchParams.get("search"); // optional

    const qs = new URLSearchParams();
    qs.set("per_page", per_page);
    qs.set("_fields", "id,title,slug,link,status");
    // you can add status=publish if you want only published pages:
    // qs.set("status", "publish");
    if (search) qs.set("search", search);

    const r = await fetch(`${base}/wp-json/wp/v2/pages?${qs.toString()}`, {
      headers: { ...wpAuthHeader() },
      cache: "no-store",
    });

    const text = await r.text();
    const json = safeJson(text);

    if (!r.ok) {
      return NextResponse.json(
        { error: json?.message || text || "WP pages failed" },
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