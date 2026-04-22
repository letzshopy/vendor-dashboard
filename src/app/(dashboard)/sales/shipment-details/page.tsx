import ShipmentDetailsBulkTable from "./ShipmentDetailsBulkTable";
import { getWooClient } from "@/lib/woo";
import type { WCOrder } from "@/lib/order-utils";
import { Truck } from "lucide-react";

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
    <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#f7f8ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
              <Truck className="h-3.5 w-3.5" />
              Shipment Details
            </div>

            <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
              Shipment Details
            </h1>
          </div>

          <div className="shrink-0 rounded-[20px] bg-white/90 px-4 py-3 text-right shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Open Orders
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {openCount}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ShipmentDetailsBulkTable initialOrders={orders} />
      </div>
    </main>
  );
}