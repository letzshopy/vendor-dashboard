// src/app/api/media/list/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function requireEnv() {
  const wpUrl = process.env.WP_URL;
  const user = process.env.WP_USER;
  const pass = process.env.WP_APP_PASSWORD;
  const missing = [];
  if (!wpUrl) missing.push("WP_URL");
  if (!user) missing.push("WP_USER");
  if (!pass) missing.push("WP_APP_PASSWORD");
  if (missing.length) {
    const m = `Missing env var(s): ${missing.join(", ")}. Set them in .env.local`;
    throw new Error(m);
  }
  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  return { wpUrl: wpUrl!, auth };
}

const normalize = (m: any) => ({
  id: m.id,
  url: m.source_url,
  title: m.title?.rendered ?? "",
  filename: (m.media_details?.file?.split("/").pop() ?? m.slug ?? "").toString(),
  mime: m.mime_type,
  size_kb: m.media_details?.filesize ? Math.round(m.media_details.filesize / 1024) : undefined,
  uploaded: m.date ? new Date(m.date).toLocaleDateString() : undefined,
  width: m.media_details?.width,
  height: m.media_details?.height,
  thumbnail:
    m.media_details?.sizes?.thumbnail?.source_url ||
    m.media_details?.sizes?.medium?.source_url ||
    m.source_url,
});

export async function GET(req: Request) {
  try {
    const { wpUrl, auth } = requireEnv();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const q = url.searchParams.get("q") || "";
    const type = (url.searchParams.get("type") || "all").toLowerCase();

    // Single media by id
    if (id) {
      const r = await fetch(`${wpUrl}/wp-json/wp/v2/media/${id}`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      });
      if (!r.ok) {
        const t = await r.text();
        return NextResponse.json({ error: `WP error (${r.status}): ${t}` }, { status: 500 });
      }
      const m = await r.json();
      return NextResponse.json({ items: [normalize(m)] });
    }

    // List many
    const params = new URLSearchParams();
    params.set("per_page", "100");
    if (q) params.set("search", q);
    if (type !== "all") {
      // WP expects media_type: image | video | file
      const wpType = type === "doc" ? "file" : type;
      params.set("media_type", wpType);
    }

    const endpoint = `${wpUrl}/wp-json/wp/v2/media?${params.toString()}`;
    const r = await fetch(endpoint, {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });

    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json(
        { error: `WP error (${r.status}) for ${endpoint}: ${t}` },
        { status: 500 }
      );
    }

    const list = await r.json();
    const items = Array.isArray(list) ? list.map(normalize) : [];
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
