"use client";

import { useEffect, useState } from "react";
import RenewalNotice from "@/components/subscription/RenewalNotice";
import { useDashboardSubscription } from "@/components/subscription/SubscriptionContext";

type ProductMetrics = {
  total: number;
  inStock: number;
  outOfStock: number;
};

type OrdersSummary = {
  todaySales: number;
  monthSales: number;
  totalOrders: number;
  ordersLast30: number;
  pendingOnHold: number;
  statusLast30: {
    completed: number;
    processing: number;
    onHold: number;
  };
  revenueByWeek: {
    label: string;
    total: number;
  }[];
  recentOrders: {
    id: number;
    number: string;
    customer: string;
    total: number;
    status: string;
    date_created: string;
  }[];
};

function formatMoney(num: number): string {
  const n = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatShortMoney(num: number): string {
  const n = Number.isFinite(num) ? num : 0;

  if (n >= 1_00_00_000) {
    return "₹" + (n / 1_00_00_000).toFixed(1) + " Cr";
  }
  if (n >= 1_00_000) {
    return "₹" + (n / 1_00_000).toFixed(1) + " L";
  }
  if (n >= 1_000) {
    return "₹" + (n / 1_000).toFixed(1) + "k";
  }
  return "₹" + n.toFixed(0);
}

export default function DashboardPage() {
  const { subscription } = useDashboardSubscription();

  const [productMetrics, setProductMetrics] = useState<ProductMetrics | null>(
    null
  );
  const [productLoading, setProductLoading] = useState(true);
  const [productErr, setProductErr] = useState<string | null>(null);

  const [orderStats, setOrderStats] = useState<OrdersSummary | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderErr, setOrderErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setProductLoading(true);
        setProductErr(null);

        const res = await fetch("/api/metrics/products", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load product metrics");

        const data = (await res.json()) as ProductMetrics;

        if (!cancelled) {
          setProductMetrics(data);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setProductErr("Failed to load product metrics");
        }
      } finally {
        if (!cancelled) {
          setProductLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        setOrderLoading(true);
        setOrderErr(null);

        const res = await fetch("/api/metrics/orders", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load order metrics");

        const data = (await res.json()) as OrdersSummary;

        if (!cancelled) {
          setOrderStats(data);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setOrderErr("Failed to load order metrics");
        }
      } finally {
        if (!cancelled) {
          setOrderLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  const summaryTodaySales = formatMoney(orderStats?.todaySales ?? 0);
  const summaryMonthSales = formatMoney(orderStats?.monthSales ?? 0);
  const summaryOrdersLast30 = String(orderStats?.ordersLast30 ?? 0);
  const summaryPendingUPI = String(orderStats?.pendingOnHold ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Snapshot of your store — sales, orders, and products.
        </p>
      </div>

      {subscription && (
        <RenewalNotice
          status={subscription.status}
          nextPaymentDate={subscription.nextPaymentDate}
        />
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Today's sales"
          value={summaryTodaySales}
          description="Completed & processing orders created today"
          gradient="from-[#ff8a8a] to-[#ff6fb1]"
          loading={orderLoading}
          error={orderErr}
        />
        <SummaryCard
          title="This month's sales"
          value={summaryMonthSales}
          description="From processing & completed orders this month"
          gradient="from-[#4f8bff] to-[#5f5dff]"
          loading={orderLoading}
          error={orderErr}
        />
        <SummaryCard
          title="Orders"
          value={summaryOrdersLast30}
          description="Last 30 days (all statuses)"
          gradient="from-[#00c9a7] to-[#00a3ff]"
          loading={orderLoading}
          error={orderErr}
        />
        <SummaryCard
          title="Pending UPI verification"
          value={summaryPendingUPI}
          description="On-hold orders paid via Letz UPI"
          gradient="from-[#ffb07c] to-[#ff7c88]"
          loading={orderLoading}
          error={orderErr}
        />
      </div>

      <div className="space-y-4 rounded-3xl bg-gradient-to-b from-white via-[#f9f3ff] to-[#f1f6ff] p-4 md:p-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <ProductsOverviewCard
            metrics={productMetrics}
            loading={productLoading}
            error={productErr}
          />

          <OrdersStatusCard
            loading={orderLoading}
            error={orderErr}
            statusLast30={
              orderStats?.statusLast30 || {
                completed: 0,
                processing: 0,
                onHold: 0,
              }
            }
          />

          <ChecklistCard />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <RevenueCard
            loading={orderLoading}
            error={orderErr}
            revenue={orderStats?.revenueByWeek || []}
          />
          <RecentOrdersCard
            loading={orderLoading}
            error={orderErr}
            orders={orderStats?.recentOrders || []}
          />
          <SupportCard />
        </div>
      </div>
    </div>
  );
}

function SummaryCard(props: {
  title: string;
  value: string;
  description: string;
  gradient: string;
  loading?: boolean;
  error?: string | null;
}) {
  const { title, value, description, gradient, loading, error } = props;

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-tr from-10% to-90% text-white shadow-sm">
      <div className={`relative h-28 bg-gradient-to-br ${gradient}`}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -right-16 bottom-[-48px] h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex h-full flex-col justify-between p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-white/80">
            {title}
          </div>
          <div className="text-2xl font-semibold">
            {loading ? "…" : error ? "--" : value}
          </div>
        </div>
      </div>
      <div className="bg-white/5 px-4 py-2 text-[11px] text-white/85">
        {description}
      </div>
    </div>
  );
}

function ProductsOverviewCard(props: {
  metrics: ProductMetrics | null;
  loading: boolean;
  error: string | null;
}) {
  const { metrics, loading, error } = props;

  const total = metrics?.total ?? 0;
  const inStock = metrics?.inStock ?? 0;
  const outOfStock = metrics?.outOfStock ?? 0;

  const chartTotal = Math.max(inStock + outOfStock, 1);
  const inStockPct = (inStock / chartTotal) * 100;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">
          Products overview
        </h2>
        <a
          href="/products"
          className="text-xs font-medium text-[#8b5cff] hover:underline"
        >
          Manage products
        </a>
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center py-8 text-xs text-slate-400">
          Loading…
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-1 items-center justify-center py-8 text-xs text-rose-500">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
          <div className="flex flex-1 items-center justify-center">
            <DonutChart
              inStockPct={inStockPct}
              inStock={inStock}
              outOfStock={outOfStock}
            />
          </div>

          <div className="flex-1 space-y-2 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-slate-500">Total products</span>
              <span className="font-semibold text-slate-900">{total}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="inline-flex items-center gap-2 text-slate-500">
                <span className="h-2 w-2 rounded-full bg-[#4b5dff]" />
                In stock
              </span>
              <span className="font-semibold text-slate-900">{inStock}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="inline-flex items-center gap-2 text-slate-500">
                <span className="h-2 w-2 rounded-full bg-[#ff8a5c]" />
                Out of stock
              </span>
              <span className="font-semibold text-rose-500">
                {outOfStock}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DonutChart(props: {
  inStockPct: number;
  inStock: number;
  outOfStock: number;
}) {
  const { inStockPct, inStock, outOfStock } = props;

  const pct = Math.min(100, Math.max(0, inStockPct));
  const remaining = 100 - pct;

  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 36 36" className="h-full w-full">
        <circle
          className="text-indigo-100"
          stroke="currentColor"
          strokeWidth="3.5"
          fill="transparent"
          r="15.9155"
          cx="18"
          cy="18"
        />
        <circle
          className="text-[#4b5dff]"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="transparent"
          r="15.9155"
          cx="18"
          cy="18"
          strokeDasharray={`${pct} ${remaining}`}
          transform="rotate(-90 18 18)"
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xs font-medium text-slate-500">In stock</div>
        <div className="text-lg font-semibold text-slate-900">
          {inStock} / {inStock + outOfStock}
        </div>
      </div>
    </div>
  );
}

function OrdersStatusCard(props: {
  loading: boolean;
  error: string | null;
  statusLast30: OrdersSummary["statusLast30"];
}) {
  const { loading, error, statusLast30 } = props;

  const rows = [
    {
      label: "Completed",
      value: statusLast30.completed,
      color: "bg-[#4b5dff]",
    },
    {
      label: "Processing",
      value: statusLast30.processing,
      color: "bg-[#ffb84d]",
    },
    {
      label: "On hold / Pending UPI",
      value: statusLast30.onHold,
      color: "bg-[#ff6b88]",
    },
  ];

  const total = rows.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">
          Orders by status (last 30 days)
        </h2>
        <a
          href="/orders"
          className="text-xs font-medium text-[#8b5cff] hover:underline"
        >
          View all
        </a>
      </div>

      {loading && <div className="py-6 text-xs text-slate-400">Loading…</div>}
      {!loading && error && (
        <div className="py-6 text-xs text-rose-500">{error}</div>
      )}

      {!loading && !error && (
        <>
          <div className="space-y-3">
            {rows.map((row) => {
              const pct = (row.value / total) * 100;
              return (
                <div key={row.label} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">{row.label}</span>
                    <span className="font-semibold text-slate-900">
                      {row.value}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${row.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-[11px] text-slate-500">
            Use the <span className="font-medium text-slate-700">Orders</span>{" "}
            page to filter by status, date range, payment method and more.
          </p>
        </>
      )}
    </div>
  );
}

const checklistItems = [
  {
    label: "Set up your store profile (logo, address, contact details).",
    done: true,
  },
  {
    label: "Configure shipping zones & rates.",
    done: false,
  },
  {
    label: "Choose payment methods (Easebuzz, UPI, bank transfer, COD).",
    done: false,
  },
  {
    label: "Add your first products and organise them into categories.",
    done: false,
  },
  {
    label: "Use Orders to print pack slips and track fulfilment.",
    done: true,
  },
];

function ChecklistCard() {
  const doneCount = checklistItems.filter((i) => i.done).length;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">
          Getting started checklist
        </h2>
        <span className="rounded-full bg-[#f3e9ff] px-2 py-0.5 text-[11px] font-medium text-[#8b5cff]">
          {doneCount}/{checklistItems.length} done
        </span>
      </div>

      <ul className="space-y-2 text-xs">
        {checklistItems.map((item) => (
          <li
            key={item.label}
            className="flex items-start gap-2 rounded-xl bg-slate-50/60 px-2 py-2"
          >
            <span
              className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                item.done
                  ? "bg-emerald-500 text-white"
                  : "border border-slate-300 bg-white text-slate-400"
              }`}
            >
              {item.done ? "✓" : ""}
            </span>
            <span className="text-slate-600">{item.label}</span>
          </li>
        ))}
      </ul>

      <a
        href="/settings?tab=profile"
        className="mt-4 inline-flex items-center text-[11px] font-medium text-[#8b5cff] hover:underline"
      >
        Go to setup guide →
      </a>
    </div>
  );
}

function RevenueCard(props: {
  loading: boolean;
  error: string | null;
  revenue: OrdersSummary["revenueByWeek"];
}) {
  const { loading, error, revenue } = props;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">
        Revenue from completed orders (last 30 days)
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">
        Based on completed & processing orders in the last 30 days.
      </p>

      {loading && <div className="mt-6 text-xs text-slate-400">Loading…</div>}
      {!loading && error && (
        <div className="mt-6 text-xs text-rose-500">{error}</div>
      )}

      {!loading && !error && (
        <>
          {revenue.length === 0 || revenue.every((w) => w.total === 0) ? (
            <div className="mt-6 text-xs text-slate-400">
              No paid orders in the last 30 days.
            </div>
          ) : (
            <div className="mt-4 flex flex-1 items-end gap-4">
              {(() => {
                const max =
                  revenue.reduce((m, w) => (w.total > m ? w.total : m), 0) || 1;

                return revenue.map((w) => {
                  const height = (w.total / max) * 100;
                  return (
                    <div
                      key={w.label}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <div className="relative flex h-24 w-10 items-end overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="absolute bottom-0 w-full rounded-full bg-gradient-to-t from-[#4b5dff] via-[#8b5cff] to-[#ff6fb1]"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {w.label}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-800">
                        {formatShortMoney(w.total)}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RecentOrdersCard(props: {
  loading: boolean;
  error: string | null;
  orders: OrdersSummary["recentOrders"];
}) {
  const { loading, error, orders } = props;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Recent orders</h2>
        <a
          href="/orders"
          className="text-xs font-medium text-[#8b5cff] hover:underline"
        >
          View all
        </a>
      </div>

      {loading && (
        <div className="flex-1 py-4 text-xs text-slate-400">Loading…</div>
      )}
      {!loading && error && (
        <div className="flex-1 py-4 text-xs text-rose-500">{error}</div>
      )}

      {!loading && !error && (
        <div className="flex-1 space-y-2 text-xs">
          {orders.length === 0 && (
            <div className="py-4 text-xs text-slate-400">
              No orders yet. New orders will show here.
            </div>
          )}

          {orders.map((o) => {
            const status = o.status.toLowerCase();
            let statusLabel = o.status || "—";
            let statusClass =
              "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600";

            if (status === "completed") {
              statusLabel = "Completed";
              statusClass =
                "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600";
            } else if (status === "processing") {
              statusLabel = "Processing";
              statusClass =
                "inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600";
            } else if (status === "on-hold") {
              statusLabel = "On hold";
              statusClass =
                "inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600";
            }

            const d = new Date(o.date_created);
            const dateStr = d.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            });

            return (
              <a
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex items-center justify-between rounded-xl bg-slate-50/70 px-3 py-2 hover:bg-slate-100"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-slate-800">
                      {o.number}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {dateStr}
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    {o.customer}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">
                    {formatMoney(o.total)}
                  </div>
                  <div className="mt-1">
                    <span className={statusClass}>{statusLabel}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SupportCard() {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-gradient-to-br from-[#f5ecff] via-white to-[#e8f4ff] p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Support</h2>
      <p className="mt-1 text-xs text-slate-500">
        Run into an issue with your store setup, billing or technical settings?
        We’re here for you.
      </p>

      <div className="mt-4 space-y-2 text-xs">
        <a
          href="/support/knowledge-base"
          className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-slate-700 hover:bg-white"
        >
          <span>Browse Knowledge Base</span>
          <span className="text-[11px] text-slate-400">
            Docs &amp; how-to guides
          </span>
        </a>

        <a
          href="/support/tickets"
          className="flex items-center justify-between rounded-xl bg-[#8b5cff] px-3 py-2 text-xs font-medium text-white hover:bg-[#7a4cf0]"
        >
          <span>Open a support ticket</span>
          <span className="text-[11px] text-white/80">
            Avg. reply &lt; 24h
          </span>
        </a>

        <p className="pt-1 text-[11px] text-slate-500">
          For urgent issues, you can also use the WhatsApp button in the bottom
          right corner.
        </p>
      </div>
    </div>
  );
}