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
    const search = searchParams.get("search");

    const qs = new URLSearchParams();
    qs.set("per_page", per_page);
    qs.set("_fields", "id,title,slug,link,status");
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

    const rows = Array.isArray(json) ? json : [];

    const items = rows.map((p: any) => ({
      id: Number(p.id),
      name:
        p?.title?.rendered?.trim() ||
        p?.slug ||
        `Page #${p.id}`,
      slug: p?.slug || "",
      url: p?.link || "/",
      status: p?.status || "publish",
    }));

    return NextResponse.json(
      { items },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Proxy GET error" },
      { status: 500 }
    );
  }
}