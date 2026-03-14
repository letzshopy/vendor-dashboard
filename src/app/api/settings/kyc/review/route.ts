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
    const status = body?.status;
    const note = body?.note || "";

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: "status must be approved or rejected" },
        { status: 400 }
      );
    }

    const base = (await getWpBaseUrl()).replace(/\/$/, "");

    const r = await fetch(`${base}/wp-json/letz/v1/kyc/review`, {
      method: "POST",
      headers: {
        "x-letz-auth": TOKEN,
        "content-type": "application/json",
      },
      body: JSON.stringify({ status, note }),
      cache: "no-store",
    });

    const text = await r.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: json?.error || "Failed to review KYC", details: json || text },
        { status: r.status || 500 }
      );
    }

    const onboardingRes = await fetch(`${new URL(req.url).origin}/api/onboarding/set`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kyc_status: status }),
      cache: "no-store",
    });

    if (!onboardingRes.ok) {
      const t = await onboardingRes.text().catch(() => "");
      console.warn("onboarding/set failed after kyc review:", onboardingRes.status, t);
    }

    return NextResponse.json(
      {
        ok: true,
        kycStatus: json?.kycStatus || status,
        reviewedAt: json?.reviewedAt || new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to review KYC" },
      { status: 500 }
    );
  }
}