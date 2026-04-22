import { WCOrder } from "@/lib/order-utils";
import { getWooClient } from "@/lib/woo";
import OrdersLocalController from "./OrdersLocalController";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

type Category = { id: number; name: string; parent: number };

async function fetchOrders(): Promise<WCOrder[]> {
  const woo = await getWooClient();
  const perPage = 100;
  let page = 1;
  const items: any[] = [];

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

    if (data.length < perPage || page >= 5) break;
    page++;
  }

  return items as WCOrder[];
}

async function fetchCategories(): Promise<Category[]> {
  const woo = await getWooClient();
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
    <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#f7f8ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
              <ClipboardList className="h-3.5 w-3.5" />
              Orders
            </div>

            <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
              All Orders
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Track customers, payments, shipment updates and order progress.
            </p>
          </div>

          <Link
            href="/orders/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create Order
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
          <div className="rounded-[22px] bg-white/90 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Total Orders
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {metrics.total}
            </div>
          </div>

          <div className="rounded-[22px] bg-emerald-50 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-emerald-700">
              Completed
            </div>
            <div className="mt-1 text-2xl font-semibold text-emerald-800">
              {metrics.completed}
            </div>
          </div>

          <div className="rounded-[22px] bg-amber-50 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-amber-700">
              Pending / Hold
            </div>
            <div className="mt-1 text-2xl font-semibold text-amber-800">
              {metrics.pending + metrics.onHold}
            </div>
          </div>

          <div className="rounded-[22px] bg-sky-50 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-sky-700">
              Processing
            </div>
            <div className="mt-1 text-2xl font-semibold text-sky-800">
              {metrics.processing}
            </div>
          </div>

          <div className="rounded-[22px] bg-violet-50 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-violet-700">
              Revenue
            </div>
            <div className="mt-1 text-2xl font-semibold text-violet-800">
              {revenueFormatted}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <OrdersLocalController initial={orders} categories={categories} />
      </div>
    </main>
  );
}