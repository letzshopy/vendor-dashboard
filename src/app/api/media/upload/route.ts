import { NextRequest, NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

function requireAuthEnv() {
  const user = process.env.WP_USER || "";
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");

  const missing: string[] = [];
  if (!user) missing.push("WP_USER");
  if (!pass) missing.push("WP_APP_PASSWORD");

  if (missing.length) throw new Error(`Missing env var(s): ${missing.join(", ")}`);

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  return { auth };
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

    if (pathname.includes("/settings")) {
      return "system";
    }
  } catch {
    /* ignore */
  }

  return "system";
}

async function markMediaScope(wpUrl: string, auth: string, id: number, scope: "catalog" | "system") {
  const purpose = scope === "catalog" ? "product_or_category" : "site_design_or_internal";

  const res = await fetch(`${wpUrl}/wp-json/letz/v1/media/mark-scope`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ id, scope, purpose }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Uploaded, but media scope mark failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const explicitScope = form.get("scope")?.toString() || "";
    const scope = inferScope(req, explicitScope) as "catalog" | "system";

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

    const mark = await markMediaScope(base, auth, id, scope);

    return NextResponse.json({
      id,
      url,
      scope,
      protected: mark?.protected ?? scope === "system",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}