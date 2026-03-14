// src/app/api/shipping/sync-classes/route.ts
import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

function safeAppPass(pass?: string) {
  return (pass || "").replace(/\s+/g, "");
}

async function wpUrl(path: string) {
  const base = (await getWpBaseUrl()).replace(/\/+$/, "");
  return `${base}${path}`;
}

function wpHeaders() {
  const u = process.env.WP_USER;
  const p = safeAppPass(process.env.WP_APP_PASSWORD);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (u && p) {
    const token = Buffer.from(`${u}:${p}`).toString("base64");
    headers["Authorization"] = `Basic ${token}`;
  }

  return headers;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}));

    const res = await fetch(await wpUrl("/wp-json/letz/v1/shipping/sync-classes"), {
      method: "POST",
      headers: wpHeaders(),
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          step: "sync-classes",
          status: res.status,
          error: json?.error ?? json?.message ?? text.slice(0, 500),
          details: json || text,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(json ?? { ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, step: "sync-classes", error: e?.message || String(e) },
      { status: 500 }
    );
  }
}