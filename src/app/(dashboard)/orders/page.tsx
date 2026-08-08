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
    <main className="dashboard-mobile-page dashboard-orders-page mx-auto w-full min-w-0 max-w-7xl px-3 pb-28 pt-2 md:px-5 md:pb-8 md:pt-5">
      <header className="mb-3 min-w-0 md:mb-5">
        {/* Mobile: compact operational summary. The app topbar already identifies Orders. */}
        <div className="flex items-center justify-between gap-3 md:hidden">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-[15px] font-bold tracking-tight text-slate-900">
                {metrics.total} orders
              </span>

              <span className="text-xs text-slate-300">•</span>

              <span className="text-[13px] font-semibold text-violet-700">
                {revenueFormatted} revenue
              </span>
            </div>
          </div>
        </div>

        {/* Desktop/tablet: compact page heading instead of the oversized dashboard hero. */}
        <div className="hidden items-end justify-between gap-5 md:flex">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">
              <ClipboardList className="h-4 w-4" />
              Order management
            </div>

            <h1 className="mt-1.5 text-[30px] font-bold tracking-tight text-slate-950">
              Orders
            </h1>

            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <span>{metrics.total} orders</span>
              <span className="text-slate-300">•</span>
              <span>{revenueFormatted} completed revenue</span>
            </div>
          </div>

          <Link
            href="/orders/new"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#5366B7] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(83,102,183,0.22)] transition hover:bg-[#4558a8]"
          >
            <Plus className="h-4 w-4" />
            Create Order
          </Link>
        </div>
      </header>
      <div className="mt-4 min-w-0">
        <OrdersLocalController
          initial={orders}
          categories={categories}
          storeName={storeName}
        />
      </div>
    </main>
  );
}
