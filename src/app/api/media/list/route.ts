import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

function requireAuthEnv() {
  const user = process.env.WP_USER || "";
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");

  const missing: string[] = [];
  if (!user) missing.push("WP_USER");
  if (!pass) missing.push("WP_APP_PASSWORD");

  if (missing.length) {
    throw new Error(`Missing env var(s): ${missing.join(", ")}. Set them in .env.local`);
  }

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  return { auth };
}

export async function GET(req: Request) {
  try {
    const wpUrl = (await getWpBaseUrl()).replace(/\/$/, "");
    const { auth } = requireAuthEnv();

    const url = new URL(req.url);
    const id = url.searchParams.get("id") || "";
    const q = url.searchParams.get("q") || "";
    const type = (url.searchParams.get("type") || "all").toLowerCase();

    const params = new URLSearchParams();
    params.set("per_page", "100");

    if (id) params.set("id", id);
    if (q) params.set("q", q);
    if (type !== "all") params.set("type", type);

    const endpoint = `${wpUrl}/wp-json/letz/v1/media/catalog-list?${params.toString()}`;

    const r = await fetch(endpoint, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json(
        { error: `WP catalog media error (${r.status}) for ${endpoint}: ${t}` },
        { status: 500 }
      );
    }

    const data = await r.json();
    const items = Array.isArray(data?.items) ? data.items : [];

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}