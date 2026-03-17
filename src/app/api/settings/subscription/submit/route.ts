import { NextRequest, NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

const TOKEN = process.env.LETZ_INTERNAL_TOKEN;

function addMonths(dateStr: string, months: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function addYears(dateStr: string, years: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    if (!TOKEN) {
      return NextResponse.json(
        { ok: false, error: "LETZ_INTERNAL_TOKEN missing" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const plan = String(body?.plan || "").trim();
    const billingCycle = String(body?.billing_cycle || body?.period || "").trim();
    const amount = Number(body?.amount || 0);
    const paymentReference = String(body?.payment_reference || body?.utr || "").trim();
    const paymentMode = String(body?.payment_mode || "upi").trim().toLowerCase();

    if (!plan) {
      return NextResponse.json(
        { ok: false, error: "plan is required" },
        { status: 400 }
      );
    }

    if (!billingCycle || !["monthly", "yearly"].includes(billingCycle)) {
      return NextResponse.json(
        { ok: false, error: "billing_cycle must be monthly or yearly" },
        { status: 400 }
      );
    }

    if (!paymentReference) {
      return NextResponse.json(
        { ok: false, error: "payment_reference / UTR is required" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const nextPaymentDate =
      billingCycle === "monthly" ? addMonths(today, 1) : addYears(today, 1);

    const payload = {
      plan,
      current_plan: plan,
      billing_cycle: billingCycle,
      period: billingCycle,
      billing_status: "payment_submitted",
      status: "payment_submitted",
      amount,
      payment_mode: paymentMode,
      payment_reference: paymentReference,
      utr: paymentReference,
      last_paid_date: today,
      last_billed_at: today,
      next_payment_date: nextPaymentDate,
      next_renewal_date: nextPaymentDate,
      next_renewal_at: nextPaymentDate,
    };

    const base = (await getWpBaseUrl()).replace(/\/$/, "");

    const r = await fetch(`${base}/wp-json/letz/v1/subscription`, {
      method: "PUT",
      headers: {
        "x-letz-auth": TOKEN,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await r.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}

    if (!r.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: json?.error || "Failed to submit subscription payment",
          details: json || text,
        },
        { status: r.status || 500 }
      );
    }

    const onboardingRes = await fetch(`${new URL(req.url).origin}/api/onboarding/set`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription_status: "payment_submitted" }),
      cache: "no-store",
    });

    if (!onboardingRes.ok) {
      const t = await onboardingRes.text().catch(() => "");
      console.warn("onboarding/set failed after subscription submit:", onboardingRes.status, t);
    }

    return NextResponse.json(
      {
        ok: true,
        subscription: json,
        submittedStatus: "payment_submitted",
        nextPaymentDate,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to submit subscription" },
      { status: 500 }
    );
  }
}