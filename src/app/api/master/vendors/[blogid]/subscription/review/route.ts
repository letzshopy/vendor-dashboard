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
    const status = String(body?.status || "").trim();
    const storeUrl = normalizeStoreUrl(body?.storeUrl || "");

    if (!storeUrl) {
      return NextResponse.json(
        { ok: false, error: "storeUrl is required" },
        { status: 400 }
      );
    }

    if (!status || !["active", "rejected", "suspended", "expired", "payment_submitted", "inactive", "trial"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid subscription status" },
        { status: 400 }
      );
    }

    const payload = {
      plan: body?.plan,
      current_plan: body?.plan,
      billing_cycle: body?.period || body?.billing_cycle,
      period: body?.period || body?.billing_cycle,
      status,
      billing_status: status,
      amount: body?.amount,
      payment_mode: body?.payment_mode,
      payment_reference: body?.payment_reference,
      utr: body?.payment_reference,
      last_paid_date: body?.last_paid_date,
      last_billed_at: body?.last_paid_date,
      next_payment_date: body?.next_payment_date,
      next_renewal_date: body?.next_payment_date,
      next_renewal_at: body?.next_payment_date,
    };

    const reviewRes = await fetch(`${storeUrl}/wp-json/letz/v1/subscription/review`, {
      method: "PUT",
      headers: {
        "x-letz-auth": LETZ_INTERNAL_TOKEN,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
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
          error: reviewJson?.error || "Failed to update tenant subscription",
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
      body: JSON.stringify({ subscription_status: status }),
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
          error: "Subscription review saved but onboarding sync failed",
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
        subscriptionStatus: onboardingJson?.subscription_status || status,
        subscription: reviewJson,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to update vendor subscription review" },
      { status: 500 }
    );
  }
}