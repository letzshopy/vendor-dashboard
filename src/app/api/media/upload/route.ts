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

function inferScope(req: NextRequest, explicitScope?: string | null) {
  const s = String(explicitScope || "").toLowerCase().trim();

  if (s === "catalog" || s === "system") {
    return s;
  }

  const ref = req.headers.get("referer") || "";

  try {
    const pathname = new URL(ref).pathname.toLowerCase();

    if (
      pathname.includes("/media") ||
      pathname.includes("/products") ||
      pathname.includes("/add-product") ||
      pathname.includes("/categories")
    ) {
      return "catalog";
    }

    if (
      pathname.includes("/settings") ||
      pathname.includes("/payments") ||
      pathname.includes("/account")
    ) {
      return "system";
    }
  } catch {
    // ignore
  }

  return "system";
}

function purposeForScope(scope: "catalog" | "system") {
  return scope === "catalog" ? "product_or_category" : "site_design_or_internal";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!(file instanceof File) || !file.name || file.size <= 0) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const explicitScope = form.get("scope")?.toString() || "";
    const scope = inferScope(req, explicitScope) as "catalog" | "system";

    const base = (await getWpBaseUrl()).replace(/\/$/, "");
    const token = requireInternalToken();

    const fd = new FormData();
    fd.append("file", file, file.name);
    fd.append("scope", scope);
    fd.append("purpose", purposeForScope(scope));

    const res = await fetch(`${base}/wp-json/letz/v1/media/upload`, {
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
      // non-JSON from WP
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: data?.error || data?.message || "WP media upload failed",
          details: data || raw,
        },
        { status: res.status }
      );
    }

    const id = Number(data?.id || data?.image_id || 0);
    const url = String(data?.url || data?.source_url || data?.image_url || "");

    if (!Number.isFinite(id) || id <= 0 || !url) {
      return NextResponse.json(
        {
          error: "WP upload ok but response lacked id/url",
          details: data,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      id,
      url,
      source_url: url,
      image_url: String(data?.image_url || url),
      thumbnail: String(data?.thumbnail || data?.image_url || url),
      scope,
      protected: Boolean(data?.protected ?? scope === "system"),
      item: data?.item || null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}