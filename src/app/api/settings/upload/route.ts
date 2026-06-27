// src/app/api/settings/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

function requireInternalToken() {
  const token = process.env.LETZ_INTERNAL_TOKEN || "";

  if (!token) {
    throw new Error("Missing LETZ_INTERNAL_TOKEN in dashboard env");
  }

  return token;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!(file instanceof File) || !file.name || file.size <= 0) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const wpUrl = (await getWpBaseUrl()).replace(/\/$/, "");
    const token = requireInternalToken();

    const fd = new FormData();
    fd.append("file", file, file.name);

    /*
      Settings upload is always protected/system media.

      Used by:
      - Profile logo
      - Setup Site banner image
      - Setup Site founder/store owner photo
      - Payment UPI QR image
      - Internal design/site images

      These images should upload successfully, but should NOT appear
      in dashboard Catalog → Media page.
    */
    fd.append("scope", "system");
    fd.append("purpose", "settings_logo_banner_qr");

    const res = await fetch(`${wpUrl}/wp-json/letz/v1/media/upload`, {
      method: "POST",
      headers: {
        "X-Letz-Auth": token,
        Accept: "application/json",
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
          error:
            data?.error ||
            data?.message ||
            "WP settings media upload failed",
          details: data,
        },
        { status: res.status }
      );
    }

    const id = Number(data?.id || data?.image_id || 0);
    const url = String(data?.url || data?.source_url || data?.image_url || "");

    if (!Number.isFinite(id) || id <= 0 || !url) {
      return NextResponse.json(
        {
          error: "WP upload succeeded but response missed id/url",
          details: data,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      id,
      fileName: file.name,
      url,
      source_url: url,
      image_url: String(data?.image_url || url),
      thumbnail: String(data?.thumbnail || data?.image_url || url),
      size: file.size,
      type: file.type,
      scope: "system",
      protected: true,
      item: data?.item || null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}