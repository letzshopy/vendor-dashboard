// src/app/coupons/page.tsx
import { woo } from "@/lib/woo";
import CouponsClient from "./CouponsClient";

export interface WCCoupon {
  id: number;
  code: string;
  discount_type: string;
  amount: string;
  date_expires?: string | null;
  description?: string;
  usage_limit?: number | null;
  usage_count?: number;
  minimum_amount?: string;
  status?: string;
}

export default async function CouponsPage() {
  const { data } = await woo.get("/coupons", {
    params: { per_page: 100, orderby: "date", order: "desc" },
  });

  const coupons: WCCoupon[] = Array.isArray(data) ? data : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Coupons</h1>
        <div className="text-sm text-slate-500">{coupons.length} total</div>
      </div>

      <CouponsClient initial={coupons} />
    </div>
  );
}
