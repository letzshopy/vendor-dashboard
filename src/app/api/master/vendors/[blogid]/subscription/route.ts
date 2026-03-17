import { NextRequest, NextResponse } from "next/server";

const LETZ_INTERNAL_TOKEN = process.env.LETZ_INTERNAL_TOKEN!;

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeStoreUrl(raw: string | null) {
  if (!raw) return "";
  return raw.trim().replace(/\/$/, "");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ blogid: string }> }
) {
  try {
    await params;

    if (!LETZ_INTERNAL_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "LETZ_INTERNAL_TOKEN missing" },
        { status: 500 }
      );
    }

    const storeUrl = normalizeStoreUrl(req.nextUrl.searchParams.get("storeUrl"));
    if (!storeUrl) {
      return NextResponse.json(
        { ok: false, error: "storeUrl is required" },
        { status: 400 }
      );
    }

    const wpRes = await fetch(`${storeUrl}/wp-json/letz/v1/subscription?_ts=${Date.now()}`, {
      method: "GET",
      headers: {
        "x-letz-auth": LETZ_INTERNAL_TOKEN,
      },
      cache: "no-store",
    });

    const text = await wpRes.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}

    if (!wpRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to fetch tenant subscription",
          details: json || text,
        },
        { status: wpRes.status || 500 }
      );
    }

    return NextResponse.json(json, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to load vendor subscription" },
      { status: 500 }
    );
  }
}