import { WCOrder } from "@/lib/order-utils";
import { getWooClient } from "@/lib/woo";
import { getTenantFromCookies } from "@/lib/tenant";
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
  const tenant = await getTenantFromCookies();
  const storeName = tenant?.store_name?.trim() || "Your Store";
  const [orders, categories] = await Promise.all([
    fetchOrders(),
    fetchCategories(),
  ]);

  const metrics = orders.reduce(
    (acc, o) => {
      acc.total += 1;
      const totalNum = parseFloat((o as any).total || "0") || 0;

      if (String(o.status || "").toLowerCase() === "completed") {
        acc.revenue += totalNum;
      }

      return acc;
    },
    {
      total: 0,
      revenue: 0,
    }
  );

  const revenueFormatted = `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(metrics.revenue || 0))}`;

  return (
    <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#f7f8ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
              <ClipboardList className="h-3.5 w-3.5" />
              Orders
            </div>

            <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
              All Orders
            </h1>
          </div>

          <Link
            href="/orders/new"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create Order
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:max-w-[420px]">
          <div className="rounded-[20px] bg-white/90 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Total Orders
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {metrics.total}
            </div>
          </div>

          <div className="rounded-[20px] bg-violet-50 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-violet-700">
              Revenue
            </div>
            <div className="mt-1 text-xl font-semibold text-violet-800">
              {revenueFormatted}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <OrdersLocalController
          initial={orders}
          categories={categories}
          storeName={storeName}
        />
      </div>
    </main>
  );
}