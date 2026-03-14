import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

const TOKEN = process.env.LETZ_INTERNAL_TOKEN;

export async function GET() {
  try {
    if (!TOKEN) {
      return NextResponse.json(
        { ok: false, error: "LETZ_INTERNAL_TOKEN missing" },
        { status: 500 }
      );
    }

    const base = (await getWpBaseUrl()).replace(/\/$/, "");
    const url = `${base}/wp-json/letz/v1/onboarding/status?_ts=${Date.now()}`;

    const r = await fetch(url, {
      headers: {
        "x-letz-auth": TOKEN,
      },
      cache: "no-store",
    });

    const text = await r.text();

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    if (!r.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            json?.message ||
            json?.error ||
            "Failed to fetch onboarding status",
          details: json || text,
        },
        { status: r.status || 500 }
      );
    }

    return NextResponse.json(json, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Status error" },
      { status: 500 }
    );
  }
}