// src/app/api/media/delete/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getWpEnv() {
  const wpUrl = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
  const user = process.env.WP_USER || "";
  const appPass = process.env.WP_APP_PASSWORD || "";
  const missing: string[] = [];
  if (!wpUrl) missing.push("WP_URL");
  if (!user) missing.push("WP_USER");
  if (!appPass) missing.push("WP_APP_PASSWORD");
  if (missing.length) throw new Error(`Missing env var(s): ${missing.join(", ")}`);
  const auth = Buffer.from(`${user}:${appPass}`).toString("base64");
  return { wpUrl, auth };
}

async function wpDeleteOne(wpUrl: string, auth: string, id: number) {
  const r = await fetch(`${wpUrl}/wp-json/wp/v2/media/${id}?force=true`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`WP delete failed for ${id} (${r.status}): ${t}`);
  }
}

export async function POST(req: Request) {
  try {
    const { wpUrl, auth } = getWpEnv();
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids (number[]) required" }, { status: 400 });
    }
    for (const raw of ids) {
      const id = Number(raw);
      if (Number.isFinite(id)) await wpDeleteOne(wpUrl, auth, id);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { wpUrl, auth } = getWpEnv();
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await wpDeleteOne(wpUrl, auth, id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
