import { NextRequest } from "next/server";

import {
  couponErrorResponse,
  couponId,
  couponSummary,
  normalizeCouponPayload,
  privateCouponJson,
  readCouponBody,
} from "@/lib/couponPolicy";
import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: rawId } = await params;
    const id = couponId(rawId);
    const body = await readCouponBody(request);
    const payload = normalizeCouponPayload(body);
    const woo = await getWooClient();
    const response = await woo.put(`/coupons/${id}`, payload);
    const coupon = couponSummary(response.data);

    if (!coupon) throw new Error("WooCommerce returned an invalid coupon");
    return privateCouponJson({ data: coupon });
  } catch (error: unknown) {
    return couponErrorResponse(error, "Failed to update coupon");
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: rawId } = await params;
    const id = couponId(rawId);
    const woo = await getWooClient();
    await woo.delete(`/coupons/${id}`, { params: { force: true } });
    return privateCouponJson({ ok: true });
  } catch (error: unknown) {
    return couponErrorResponse(error, "Failed to delete coupon");
  }
}
