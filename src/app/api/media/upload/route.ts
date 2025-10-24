// src/app/api/media/upload/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    // Accept WP_URL or fall back to SITE_URL
    const base =
      process.env.WP_URL?.replace(/\/$/, "") ||
      process.env.SITE_URL?.replace(/\/$/, "");
    const user = process.env.WP_USER;
    // WP shows app passwords with spaces – safe to remove them for Basic auth
    const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");

    if (!base || !user || !pass) {
      return NextResponse.json(
        { error: "WP upload not configured (need WP_URL or SITE_URL, WP_USER, WP_APP_PASSWORD)." },
        { status: 500 }
      );
    }

    const fd = new FormData();
    fd.append("file", file, file.name);

    const auth = Buffer.from(`${user}:${pass}`).toString("base64");

    const res = await fetch(`${base}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}` },
      body: fd,
    });

    const raw = await res.text();
    let j: any = {};
    try { j = JSON.parse(raw); } catch { /* non-JSON from WP */ }

    if (!res.ok) {
      return NextResponse.json(
        { error: j?.message || "WP media upload failed", details: j || raw },
        { status: res.status }
      );
    }

    const id = Number(j?.id);
    const url: string | undefined = j?.source_url;
    if (!Number.isFinite(id) || !url) {
      return NextResponse.json(
        { error: "WP upload ok but response lacked id/source_url", details: j },
        { status: 502 }
      );
    }

    // Normalize for the frontend
    return NextResponse.json({ id, url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
