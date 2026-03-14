// src/app/api/coupons/route.ts
import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";


type CouponPayload = {
  code: string;
  discount_type: "percent" | "fixed_cart" | "fixed_product";
  amount: string;
  description?: string;
  date_expires?: string | null;
  minimum_amount?: string;
  usage_limit?: number | null;
};

export async function GET() {
  try {
    const woo = await getWooClient();
    const { data } = await woo.get("/coupons", {
      params: {
        per_page: 100,
        orderby: "date",
        order: "desc",
      },
    });
    return NextResponse.json({ data });
  } catch (e: any) {
    console.error("COUPONS GET error", e?.response?.data || e);
    return NextResponse.json(
      { error: "Failed to load coupons" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const woo = await getWooClient();
    const body = (await req.json()) as CouponPayload;

    const payload: any = {
      code: body.code,
      discount_type: body.discount_type,
      amount: body.amount,
      description: body.description || "",
      individual_use: true,
    };

    if (body.date_expires) payload.date_expires = body.date_expires;
    if (body.minimum_amount) payload.minimum_amount = body.minimum_amount;
    if (typeof body.usage_limit === "number")
      payload.usage_limit = body.usage_limit;

    const { data } = await woo.post("/coupons", payload);
    return NextResponse.json({ data });
  } catch (e: any) {
    console.error("COUPONS POST error", e?.response?.data || e);
    const msg =
      e?.response?.data?.message || e?.message || "Failed to create coupon";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
