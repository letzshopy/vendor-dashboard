import { NextRequest, NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

const TOKEN = process.env.LETZ_INTERNAL_TOKEN;

export async function POST(req: NextRequest) {
  try {
    if (!TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Server not configured: LETZ_INTERNAL_TOKEN missing" },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const doc_type = (form.get("doc_type") as string | null) || "doc";

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
    }

    const base = (await getWpBaseUrl()).replace(/\/$/, "");

    const fd = new FormData();
    fd.append("file", file, file.name);
    fd.append("doc_type", doc_type);

    const r = await fetch(`${base}/wp-json/letz/v1/kyc/upload`, {
      method: "POST",
      headers: { "x-letz-auth": TOKEN },
      body: fd,
      cache: "no-store",
    });

    const text = await r.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}

    if (!r.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: json?.message || json?.error || "Upload failed",
          details: json || text,
        },
        { status: r.status || 500 }
      );
    }

    const fileKey = json?.fileKey || json?.key;
    if (!fileKey) {
      return NextResponse.json(
        { ok: false, error: "Upload ok but missing fileKey", details: json },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        fileKey,
        filename: json?.filename,
        docType: json?.doc_type || doc_type,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}