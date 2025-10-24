// src/app/api/media/update/route.ts
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const { id, title, slug } = await req.json();

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const wpUrl = process.env.WP_URL;
    const user = process.env.WP_USER;
    const appPass = process.env.WP_APP_PASSWORD;

    if (!wpUrl || !user || !appPass) {
      return NextResponse.json({ error: "Missing WP env" }, { status: 500 });
    }

    const auth = Buffer.from(`${user}:${appPass}`).toString("base64");
    const body: any = {};
    if (title !== undefined) body.title = title;
    if (slug) body.slug = slug; // physical rename requires a renamer plugin

    const res = await fetch(`${wpUrl}/wp-json/wp/v2/media/${id}`, {
      method: "POST", // WP REST uses POST for updates
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: t }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, item: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
