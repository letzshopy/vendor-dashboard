// src/app/api/uploads/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

function requireAuthEnv() {
  const user = process.env.WP_USER || "";
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");

  const missing: string[] = [];
  if (!user) missing.push("WP_USER");
  if (!pass) missing.push("WP_APP_PASSWORD");

  if (missing.length) {
    throw new Error(`Missing env var(s): ${missing.join(", ")}`);
  }

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  return { auth };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const base = (await getWpBaseUrl()).replace(/\/$/, "");
    const { auth } = requireAuthEnv();

    const fd = new FormData();
    fd.append("file", file, file.name);

    const res = await fetch(`${base}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body: fd,
      cache: "no-store",
    });

    const raw = await res.text();
    let j: any = {};
    try {
      j = JSON.parse(raw);
    } catch {
      j = {};
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: j?.message || "WP media upload failed",
          details: j || raw,
        },
        { status: res.status || 500 }
      );
    }

    const id = Number(j?.id);
    const url: string | undefined =
      j?.source_url || j?.guid?.rendered || undefined;
    const filename: string =
      j?.media_details?.file?.split("/").pop() || file.name;

    if (!Number.isFinite(id) || !url) {
      return NextResponse.json(
        {
          error: "WP upload ok but response lacked id/source_url",
          details: j,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      id,
      url,
      filename,
      size: file.size,
      mime: file.type || "application/octet-stream",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}