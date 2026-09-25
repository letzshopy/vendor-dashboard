import Link from "next/link";
import {
  ClipboardList,
  Plus,
} from "lucide-react";

import OrdersLocalController from "./OrdersLocalController";

import {
  buttonClassName,
} from "@/components/ui/button";
import {
  PageHeader,
} from "@/components/ui/page-header";
import {
  getTenantFromCookies,
} from "@/lib/tenant";
import type {
  WCOrder,
} from "@/lib/order-utils";
import {
  getWooClient,
} from "@/lib/woo";

type Category = {
  id: number;
  name: string;
  parent: number;
};

async function fetchOrders(): Promise<WCOrder[]> {
  const woo =
    await getWooClient();
  const perPage = 100;
  let page = 1;
  const items: WCOrder[] = [];

  const statuses =
    "pending,processing,on-hold,completed,refunded,cancelled,failed,trash";

  while (true) {
    const { data } =
      await woo.get<WCOrder[]>(
        "/orders",
        {
          params: {
            per_page:
              perPage,
            page,
            status:
              statuses,
            orderby:
              "date",
            order: "desc",
          },
        }
      );

    if (
      !Array.isArray(data) ||
      data.length === 0
    ) {
      break;
    }

    items.push(...data);

    if (
      data.length <
        perPage ||
      page >= 5
    ) {
      break;
    }

    page += 1;
  }

  return items;
}

async function fetchCategories(): Promise<Category[]> {
  const woo =
    await getWooClient();
  const perPage = 100;
  let page = 1;
  const items: Array<{
    id?: number;
    name?: string;
    parent?: number;
  }> = [];

  while (true) {
    const { data } =
      await woo.get<
        Array<{
          id?: number;
          name?: string;
          parent?: number;
        }>
      >(
        "/products/categories",
        {
          params: {
            per_page:
              perPage,
            page,
            hide_empty:
              false,
            orderby:
              "name",
            order: "asc",
          },
        }
      );

    if (
      !Array.isArray(data) ||
      data.length === 0
    ) {
      break;
    }

    items.push(...data);

    if (
      data.length <
      perPage
    ) {
      break;
    }

    page += 1;
  }

  return items.map(
    (category) => ({
      id: Number(
        category.id
      ),
      name: String(
        category.name ||
          ""
      ),
      parent: Number(
        category.parent ||
          0
      ),
    })
  );
}

function formatMoney(
  value: number
) {
  return `₹${new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 0,
    }
  ).format(
    Math.round(value || 0)
  )}`;
}

export default async function OrdersPage() {
  const tenant =
    await getTenantFromCookies();
  const storeName =
    tenant?.store_name?.trim() ||
    "Your Store";

  const [
    orders,
    categories,
  ] =
    await Promise.all([
      fetchOrders(),
      fetchCategories(),
    ]);

  const metrics =
    orders.reduce(
      (
        acc,
        order
      ) => {
        const status =
          String(
            order.status ||
              ""
          ).toLowerCase();

        if (
          status !==
          "trash"
        ) {
          acc.total += 1;
        }

        if (
          [
            "pending",
            "on-hold",
            "processing",
          ].includes(
            status
          )
        ) {
          acc.needsAction +=
            1;
        }

        if (
          status ===
          "completed"
        ) {
          acc.completedRevenue +=
            Number(
              order.total ||
                0
            ) || 0;
        }

        return acc;
      },
      {
        total: 0,
        needsAction: 0,
        completedRevenue:
          0,
      }
    );

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
      <PageHeader
        className="hidden md:flex"
        eyebrow="Sales"
        icon={
          ClipboardList
        }
        title="Orders"
        description="Review, fulfil and communicate every customer order from one workspace."
        actions={
          <Link
            href="/orders/new"
            className={buttonClassName({
              variant:
                "primary",
            })}
          >
            <Plus className="h-4 w-4" />
            Create Order
          </Link>
        }
      />

      <section className="md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-extrabold text-heading">
            Order overview
          </div>

          <Link
            href="/orders/new"
            className={buttonClassName({
              variant:
                "primary",
              size: "sm",
            })}
          >
            <Plus className="h-4 w-4" />
            Create
          </Link>
        </div>

        <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-card">
          <div className="min-w-0 px-3 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Orders
            </div>
            <div className="mt-1 truncate text-lg font-extrabold text-heading">
              {
                metrics.total
              }
            </div>
          </div>

          <div className="min-w-0 border-l border-border px-3 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Action
            </div>
            <div className="mt-1 truncate text-lg font-extrabold text-amber-700">
              {
                metrics.needsAction
              }
            </div>
          </div>

          <div className="min-w-0 border-l border-border px-3 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Completed
            </div>
            <div className="mt-1 truncate text-sm font-extrabold text-heading">
              {formatMoney(
                metrics.completedRevenue
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-3 min-w-0 md:mt-5">
        <OrdersLocalController
          initial={
            orders
          }
          categories={
            categories
          }
          storeName={
            storeName
          }
        />
      </div>
    </main>
  );
}
