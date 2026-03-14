import { NextRequest, NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

const TOKEN = process.env.LETZ_INTERNAL_TOKEN;

export async function POST(req: NextRequest) {
  try {
    if (!TOKEN) {
      return NextResponse.json(
        { ok: false, error: "LETZ_INTERNAL_TOKEN missing" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const base = (await getWpBaseUrl()).replace(/\/$/, "");

    const r = await fetch(`${base}/wp-json/letz/v1/kyc/submit`, {
      method: "POST",
      headers: {
        "x-letz-auth": TOKEN,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await r.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: json?.error || "Failed to submit KYC", details: json || text },
        { status: r.status || 500 }
      );
    }

    const onboardingRes = await fetch(`${new URL(req.url).origin}/api/onboarding/set`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kyc_status: "in_review" }),
      cache: "no-store",
    });

    if (!onboardingRes.ok) {
      const t = await onboardingRes.text().catch(() => "");
      console.warn("onboarding/set failed after kyc submit:", onboardingRes.status, t);
    }

    return NextResponse.json(
      {
        ok: true,
        kycStatus: "in_review",
        submittedAt: json?.submittedAt || new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("KYC submit error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to submit KYC" },
      { status: 500 }
    );
  }
}