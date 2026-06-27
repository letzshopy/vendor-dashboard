// src/app/api/shipping/state/route.ts
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
  const user = process.env.WP_USER;
  const pass = safeAppPass(process.env.WP_APP_PASSWORD);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Letz-Dashboard-Key": process.env.LETZ_DASHBOARD_API_KEY || "",
  };

  if (user && pass) {
    const token = Buffer.from(`${user}:${pass}`).toString("base64");
    headers.Authorization = `Basic ${token}`;
  }

  return headers;
}

export async function GET() {
  try {
    const res = await fetch(await wpUrl("/wp-json/letz/v1/shipping/state"), {
      method: "GET",
      headers: wpHeaders(),
      cache: "no-store",
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
          step: "shipping-state",
          status: res.status,
          error: json?.error ?? json?.message ?? text.slice(0, 500),
          details: json || text,
        },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json(json ?? { ok: true });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        step: "shipping-state",
        error: e?.message || String(e),
      },
      { status: 500 }
    );
  }
}