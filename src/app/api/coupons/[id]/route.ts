// src/app/api/coupons/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();

    const payload: any = {
      code: body.code,
      discount_type: body.discount_type,
      amount: body.amount,
      description: body.description || "",
    };

    // Expiry date handling
    if (body.date_expires === null || body.date_expires === "") {
      payload.date_expires = null;
    } else if (body.date_expires) {
      payload.date_expires = body.date_expires;
    }

    // Min amount
    if (body.minimum_amount !== undefined) {
      payload.minimum_amount = body.minimum_amount || "";
    }

    // Usage limit
    if (body.usage_limit === "" || body.usage_limit === null) {
      payload.usage_limit = null;
    } else if (typeof body.usage_limit === "number") {
      payload.usage_limit = body.usage_limit;
    }

    const { data } = await woo.put(`/coupons/${id}`, payload);
    return NextResponse.json({ data });
  } catch (e: unknown) {
    const err = e as any;
    console.error("COUPONS PUT error", err?.response?.data || err);
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Failed to update coupon";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await woo.delete(`/coupons/${id}`, { params: { force: true } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const err = e as any;
    console.error("COUPONS DELETE error", err?.response?.data || err);
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Failed to delete coupon";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
