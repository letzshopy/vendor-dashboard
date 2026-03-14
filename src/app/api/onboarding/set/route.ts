import { NextRequest, NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

const TOKEN = process.env.LETZ_INTERNAL_TOKEN;

export async function POST(req: NextRequest) {
  try {
    if (!TOKEN) {
      return NextResponse.json(
        { ok: false, error: "LEZT_INTERNAL_TOKEN missing" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const kyc_status = body?.kyc_status;
    const subscription_status = body?.subscription_status;

    if (!kyc_status && !subscription_status) {
      return NextResponse.json(
        { ok: false, error: "kyc_status or subscription_status required" },
        { status: 400 }
      );
    }

    const base = (await getWpBaseUrl()).replace(/\/$/, "");

    const r = await fetch(`${base}/wp-json/letz/v1/onboarding/set`, {
      method: "POST",
      headers: {
        "x-letz-auth": TOKEN,
        "content-type": "application/json",
      },
      body: JSON.stringify({ kyc_status, subscription_status }),
      cache: "no-store",
    });

    const text = await r.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: json?.error || "WP onboarding/set failed", details: json || text },
        { status: r.status || 500 }
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "onboarding/set failed" },
      { status: 500 }
    );
  }
}