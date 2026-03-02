// src/app/orders/page.tsx
import { WCOrder } from "@/lib/order-utils";
import { woo } from "@/lib/woo";
import OrdersLocalController from "./OrdersLocalController";

type Category = { id: number; name: string; parent: number };

// Fetch up to 500 orders (5 × 100) across all main statuses + trash
async function fetchOrders(): Promise<WCOrder[]> {
  const perPage = 100;
  let page = 1;
  const items: any[] = [];

  // include trash so our "Trash" tab has data
  const statuses =
    "pending,processing,on-hold,completed,refunded,cancelled,failed,trash";

  while (true) {
    const { data } = await woo.get("/orders", {
      params: {
        per_page: perPage,
        page,
        status: statuses,
        orderby: "date",
        order: "desc",
      },
    });

    if (!Array.isArray(data) || data.length === 0) break;
    items.push(...data);

    if (data.length < perPage || page >= 5) break; // safety cap at 500
    page++;
  }

  return items as WCOrder[];
}

async function fetchCategories(): Promise<Category[]> {
  const perPage = 100;
  let page = 1;
  const items: any[] = [];

  while (true) {
    const { data } = await woo.get("/products/categories", {
      params: {
        per_page: perPage,
        page,
        hide_empty: false,
        orderby: "name",
        order: "asc",
      },
    });

    if (!Array.isArray(data) || data.length === 0) break;
    items.push(...data);

    if (data.length < perPage) break;
    page++;
  }

  return items.map((c) => ({
    id: Number(c.id),
    name: String(c.name || ""),
    parent: Number(c.parent || 0),
  }));
}

export default async function OrdersPage() {
  const [orders, categories] = await Promise.all([
    fetchOrders(),
    fetchCategories(),
  ]);

  // Simple dashboard metrics
  const metrics = orders.reduce(
    (acc, o) => {
      const st = String(o.status || "").toLowerCase();
      acc.total += 1;
      const totalNum = parseFloat((o as any).total || "0") || 0;

      if (st === "pending") acc.pending += 1;
      if (st === "on-hold") acc.onHold += 1;
      if (st === "processing") acc.processing += 1;
      if (st === "completed") {
        acc.completed += 1;
        acc.revenue += totalNum;
      }
      if (st === "cancelled") acc.cancelled += 1;

      return acc;
    },
    {
      total: 0,
      pending: 0,
      onHold: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
      revenue: 0,
    }
  );

  const revenueFormatted = `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(metrics.revenue || 0))}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 space-y-5">
      {/* Header banner */}
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-rose-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">
            All Orders
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track payments, shipment updates and statuses for every order in
            your store.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="rounded-2xl bg-white/80 px-4 py-2 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Total Orders
            </div>
            <div className="text-lg font-semibold text-slate-900">
              {metrics.total}
            </div>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-2 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-emerald-600">
              Completed
            </div>
            <div className="text-lg font-semibold text-emerald-700">
              {metrics.completed}
            </div>
          </div>
          <div className="rounded-2xl bg-amber-50 px-4 py-2 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-amber-700">
              Pending / On hold
            </div>
            <div className="text-lg font-semibold text-amber-800">
              {metrics.pending + metrics.onHold}
            </div>
          </div>
          <div className="rounded-2xl bg-violet-50 px-4 py-2 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-violet-700">
              Revenue
            </div>
            <div className="text-lg font-semibold text-violet-800">
              {revenueFormatted}
            </div>
          </div>
        </div>
      </div>

      {/* Filters, tabs, table etc. */}
      <OrdersLocalController initial={orders} categories={categories} />
    </main>
  );
}
