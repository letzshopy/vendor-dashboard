// src/app/sales/shipment-details/page.tsx

import ShipmentDetailsBulkTable from "./ShipmentDetailsBulkTable";
import { getWooClient } from "@/lib/woo";
import type { WCOrder } from "@/lib/order-utils";

async function loadAllOrders(): Promise<WCOrder[]> {
  const woo = await getWooClient();
  const perPage = 100;
  const all: WCOrder[] = [];
  let page = 1;

  while (page <= 5) {
    const { data } = await woo.get<WCOrder[]>("/orders", {
      params: {
        status: "any",
        per_page: perPage,
        page,
        orderby: "date",
        order: "desc",
      },
    });

    const batch: WCOrder[] = Array.isArray(data) ? data : [];
    if (batch.length === 0) break;

    all.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }

  return all;
}

// just for header display – table still does its own filtering
const FINAL_STATUSES = new Set([
  "completed",
  "cancelled",
  "refunded",
  "failed",
  "trash",
]);

export default async function ShipmentDetailsPage() {
  const orders = await loadAllOrders();

  const openCount = orders.filter((o) => {
    const st = String(o.status || "").toLowerCase();
    return !FINAL_STATUSES.has(st);
  }).length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Page header card */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Shipment Details
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              Review all <span className="font-medium">open orders</span>, add{" "}
              <span className="font-medium">Tracking Number</span> and{" "}
              <span className="font-medium">Courier Name</span>, then save to
              mark them as{" "}
              <span className="font-medium text-emerald-700">Completed</span> in
              WooCommerce.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1 text-xs text-slate-500">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              {openCount} open order{openCount === 1 ? "" : "s"} need shipment
              details
            </div>
            <span className="text-[11px]">
              Showing latest orders across all statuses (table filters only open
              ones).
            </span>
          </div>
        </div>

        {/* Main table card */}
        <ShipmentDetailsBulkTable initialOrders={orders} />
      </div>
    </main>
  );
}
