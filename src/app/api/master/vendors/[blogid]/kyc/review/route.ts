import { NextRequest, NextResponse } from "next/server";

const LETZ_INTERNAL_TOKEN = process.env.LETZ_INTERNAL_TOKEN!;

function normalizeStoreUrl(raw: string | null) {
  if (!raw) return "";
  return raw.trim().replace(/\/$/, "");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ blogid: string }> }
) {
  try {
    if (!LETZ_INTERNAL_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "LETZ_INTERNAL_TOKEN missing" },
        { status: 500 }
      );
    }

    await params;

    const body = await req.json().catch(() => ({}));
    const status = body?.status;
    const note = body?.note || "";
    const storeUrl = normalizeStoreUrl(body?.storeUrl || "");

    if (!storeUrl) {
      return NextResponse.json(
        { ok: false, error: "storeUrl is required" },
        { status: 400 }
      );
    }

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: "status must be approved or rejected" },
        { status: 400 }
      );
    }

    const reviewRes = await fetch(`${storeUrl}/wp-json/letz/v1/kyc/review`, {
      method: "POST",
      headers: {
        "x-letz-auth": LETZ_INTERNAL_TOKEN,
        "content-type": "application/json",
      },
      body: JSON.stringify({ status, note }),
      cache: "no-store",
    });

    const reviewText = await reviewRes.text();
    let reviewJson: any = null;
    try {
      reviewJson = JSON.parse(reviewText);
    } catch {}

    if (!reviewRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: reviewJson?.error || "Failed to review tenant KYC",
          details: reviewJson || reviewText,
        },
        { status: reviewRes.status || 500 }
      );
    }

    const onboardingRes = await fetch(`${storeUrl}/wp-json/letz/v1/onboarding/set`, {
      method: "POST",
      headers: {
        "x-letz-auth": LETZ_INTERNAL_TOKEN,
        "content-type": "application/json",
      },
      body: JSON.stringify({ kyc_status: status }),
      cache: "no-store",
    });

    const onboardingText = await onboardingRes.text();
    let onboardingJson: any = null;
    try {
      onboardingJson = JSON.parse(onboardingText);
    } catch {}

    if (!onboardingRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "KYC review saved but onboarding sync failed",
          details: onboardingJson || onboardingText,
          review: reviewJson,
        },
        { status: onboardingRes.status || 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        requestedStatus: status,
        reviewSavedStatus: reviewJson?.kycStatus || null,
        optionKycStatus: reviewJson?.option_kyc_status || null,
        onboardingStatus: onboardingJson?.kyc_status || null,
        reviewedAt: reviewJson?.reviewedAt || new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to update vendor KYC review" },
      { status: 500 }
    );
  }
}