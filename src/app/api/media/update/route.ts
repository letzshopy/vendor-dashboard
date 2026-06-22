import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

function getWpAuthEnv() {
  const user = process.env.WP_USER || "";
  const appPass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");

  const missing: string[] = [];
  if (!user) missing.push("WP_USER");
  if (!appPass) missing.push("WP_APP_PASSWORD");

  if (missing.length) {
    throw new Error(`Missing env var(s): ${missing.join(", ")}`);
  }

  const auth = Buffer.from(`${user}:${appPass}`).toString("base64");
  return { auth };
}

export async function PATCH(req: Request) {
  try {
    const { id, title, slug } = await req.json();

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const wpUrl = (await getWpBaseUrl()).replace(/\/$/, "");
    const { auth } = getWpAuthEnv();

    const res = await fetch(`${wpUrl}/wp-json/letz/v1/media/catalog/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ title, slug }),
      cache: "no-store",
    });

    const text = await res.text();
    let data: any = {};

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || data?.error || "Media update failed", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true, item: data?.item || data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}