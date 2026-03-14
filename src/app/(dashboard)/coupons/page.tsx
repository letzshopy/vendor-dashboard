// src/app/coupons/page.tsx
import { getWooClient } from "@/lib/woo";
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

export const dynamic = "force-dynamic";

async function fetchCoupons(): Promise<WCCoupon[]> {
  try {
    const woo = await getWooClient();

    const PER_PAGE = 100;
    const MAX_PAGES = 10; // safety cap (1000 coupons)
    const all: WCCoupon[] = [];

    let page = 1;
    while (page <= MAX_PAGES) {
      const { data } = await woo.get<WCCoupon[]>("/coupons", {
        params: { per_page: PER_PAGE, page, orderby: "date", order: "desc" },
      });

      const rows = Array.isArray(data) ? data : [];
      if (rows.length === 0) break;

      all.push(...rows);

      if (rows.length < PER_PAGE) break;
      page++;
    }

    return all;
  } catch {
    return [];
  }
}

export default async function CouponsPage() {
  const coupons = await fetchCoupons();

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