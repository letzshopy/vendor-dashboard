import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LETZ_INTERNAL_TOKEN = process.env.LETZ_INTERNAL_TOKEN!;

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

    const downloadKey = req.nextUrl.searchParams.get("download");

    if (downloadKey) {
      const fileRes = await fetch(
        `${storeUrl}/wp-json/letz/v1/kyc/download?fileKey=${encodeURIComponent(downloadKey)}&_ts=${Date.now()}`,
        {
          method: "GET",
          headers: {
            "x-letz-auth": LETZ_INTERNAL_TOKEN,
          },
          cache: "no-store",
        }
      );

      if (!fileRes.ok) {
        const text = await fileRes.text().catch(() => "");
        return NextResponse.json(
          { ok: false, error: "Failed to download document", details: text },
          { status: fileRes.status || 500 }
        );
      }

      return new NextResponse(fileRes.body, {
        status: 200,
        headers: {
          "Content-Type": fileRes.headers.get("content-type") || "application/octet-stream",
          "Content-Disposition":
            fileRes.headers.get("content-disposition") || `inline; filename="${downloadKey}"`,
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      });
    }

    const wpRes = await fetch(`${storeUrl}/wp-json/letz/v1/kyc?_ts=${Date.now()}`, {
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
          error: "Failed to fetch tenant KYC",
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
      { ok: false, error: e?.message || "Failed to load vendor KYC" },
      { status: 500 }
    );
  }
}