import {
  couponErrorResponse,
  couponSummary,
  normalizeCouponPayload,
  privateCouponJson,
  readCouponBody,
} from "@/lib/couponPolicy";
import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const woo = await getWooClient();
    const coupons: unknown[] = [];

    for (let page = 1; page <= 10; page += 1) {
      const response = await woo.get("/coupons", {
        params: { per_page: 100, page, orderby: "date", order: "desc" },
      });
      const rows = Array.isArray(response.data) ? response.data : [];
      coupons.push(...rows);
      if (rows.length < 100) break;
    }

    return privateCouponJson({
      data: coupons.flatMap((value) => {
        const coupon = couponSummary(value);
        return coupon ? [coupon] : [];
      }),
    });
  } catch (error: unknown) {
    return couponErrorResponse(error, "Failed to load coupons");
  }
}

export async function POST(request: Request) {
  try {
    const body = await readCouponBody(request);
    const payload = normalizeCouponPayload(body);
    const woo = await getWooClient();
    const response = await woo.post("/coupons", payload);
    const coupon = couponSummary(response.data);

    if (!coupon) throw new Error("WooCommerce returned an invalid coupon");
    return privateCouponJson({ data: coupon }, 201);
  } catch (error: unknown) {
    return couponErrorResponse(error, "Failed to create coupon");
  }
}
