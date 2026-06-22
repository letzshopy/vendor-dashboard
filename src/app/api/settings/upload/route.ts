// src/app/api/settings/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

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

async function markAsSystemMedia(wpUrl: string, auth: string, id: number) {
  try {
    const res = await fetch(`${wpUrl}/wp-json/letz/v1/media/mark-scope`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        id,
        scope: "system",
        purpose: "settings_logo_banner_qr",
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Settings upload media scope mark failed:", res.status, text);
    }
  } catch (error) {
    console.error("Settings upload media scope mark error:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const wpUrl = (await getWpBaseUrl()).replace(/\/$/, "");
    const { auth } = requireAuthEnv();

    const fd = new FormData();
    fd.append("file", file, file.name);

    const res = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body: fd,
      cache: "no-store",
    });

    const raw = await res.text();
    let data: any = {};

    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: data?.message || "WP media upload failed",
          details: data,
        },
        { status: res.status }
      );
    }

    const id = Number(data?.id);
    const url = String(data?.source_url || "");

    if (!Number.isFinite(id) || !url) {
      return NextResponse.json(
        {
          error: "WP upload succeeded but response missed id/source_url",
          details: data,
        },
        { status: 502 }
      );
    }

    await markAsSystemMedia(wpUrl, auth, id);

    return NextResponse.json({
      ok: true,
      id,
      fileName: file.name,
      url,
      size: file.size,
      type: file.type,
      scope: "system",
      protected: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}