// src/app/api/media/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

function requireAuthEnv() {
  const user = process.env.WP_USER || "";
  // WP shows app passwords with spaces – safe to remove them for Basic auth
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");

  const missing: string[] = [];
  if (!user) missing.push("WP_USER");
  if (!pass) missing.push("WP_APP_PASSWORD");
  if (missing.length) throw new Error(`Missing env var(s): ${missing.join(", ")}`);

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  return { auth };
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    // ✅ Tenant-aware WP base URL (from ls_tenant cookie), with fallback handled inside
    const base = (await getWpBaseUrl()).replace(/\/$/, "");
    const { auth } = requireAuthEnv();

    const fd = new FormData();
    fd.append("file", file, file.name);

    const res = await fetch(`${base}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}` },
      body: fd,
      cache: "no-store",
    });

    const raw = await res.text();
    let j: any = {};
    try {
      j = JSON.parse(raw);
    } catch {
      /* non-JSON from WP */
    }

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