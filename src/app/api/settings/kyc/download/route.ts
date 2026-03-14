import { NextRequest, NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

const TOKEN = process.env.LETZ_INTERNAL_TOKEN;

export async function GET(req: NextRequest) {
  try {
    if (!TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Server not configured: LETZ_INTERNAL_TOKEN missing" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const fileKey = searchParams.get("fileKey");
    if (!fileKey) {
      return NextResponse.json({ ok: false, error: "fileKey required" }, { status: 400 });
    }

    const base = (await getWpBaseUrl()).replace(/\/$/, "");

    const r = await fetch(
      `${base}/wp-json/letz/v1/kyc/download?fileKey=${encodeURIComponent(fileKey)}`,
      {
        headers: { "x-letz-auth": TOKEN },
        cache: "no-store",
      }
    );

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return NextResponse.json({ ok: false, error: "Download failed", details: t }, { status: r.status });
    }

    return new NextResponse(r.body, {
      status: 200,
      headers: {
        "Content-Type": r.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": r.headers.get("content-disposition") || "inline",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Download error" }, { status: 500 });
  }
}