"use client";

import { useEffect, useMemo, useState } from "react";
import RenewalNotice from "@/components/subscription/RenewalNotice";
import { useDashboardSubscription } from "@/components/subscription/SubscriptionContext";
import InstallAppCard from "@/components/pwa/InstallAppCard";
import {
  ArrowRight,
  Boxes,
  CircleCheckBig,
  Clock3,
  IndianRupee,
  PackageCheck,
  ShoppingBag,
  Wallet,
} from "lucide-react";

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

  if (n >= 1_00_00_000) return "₹" + (n / 1_00_00_000).toFixed(1) + " Cr";
  if (n >= 1_00_000) return "₹" + (n / 1_00_000).toFixed(1) + " L";
  if (n >= 1_000) return "₹" + (n / 1_000).toFixed(1) + "k";
  return "₹" + n.toFixed(0);
}

function formatDateShort(dateString: string): string {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
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
        if (!cancelled) setProductMetrics(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setProductErr("Failed to load product metrics");
      } finally {
        if (!cancelled) setProductLoading(false);
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
        if (!cancelled) setOrderStats(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setOrderErr("Failed to load order metrics");
      } finally {
        if (!cancelled) setOrderLoading(false);
      }
    }

    loadOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  const quickHighlights = useMemo(
    () => [
      {
        title: "Today's sales",
        value: formatMoney(orderStats?.todaySales ?? 0),
        note: "Created today",
        icon: Wallet,
        gradient: "from-[#ff8fa2] via-[#ff7fae] to-[#ff6fb1]",
      },
      {
        title: "This month's sales",
        value: formatMoney(orderStats?.monthSales ?? 0),
        note: "This month",
        icon: IndianRupee,
        gradient: "from-[#5b8cff] via-[#5a74ff] to-[#6a5cff]",
      },
      {
        title: "Orders",
        value: String(orderStats?.ordersLast30 ?? 0),
        note: "Last 30 days",
        icon: ShoppingBag,
        gradient: "from-[#19c6b4] via-[#13b5cf] to-[#1aa4ff]",
      },
      {
        title: "Pending UPI",
        value: String(orderStats?.pendingOnHold ?? 0),
        note: "Needs review",
        icon: Clock3,
        gradient: "from-[#ffb27a] via-[#ff9c78] to-[#ff7e8c]",
      },
    ],
    [orderStats]
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {subscription && (
        <section>
          <RenewalNotice
            status={subscription.status}
            nextPaymentDate={subscription.nextPaymentDate}
          />
        </section>
      )}

      <section>
        <InstallAppCard />
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {quickHighlights.map((item) => (
          <SummaryCard
            key={item.title}
            title={item.title}
            value={item.value}
            note={item.note}
            gradient={item.gradient}
            icon={item.icon}
            loading={orderLoading}
            error={orderErr}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
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
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <RevenueCard
          loading={orderLoading}
          error={orderErr}
          revenue={orderStats?.revenueByWeek || []}
        />

        <ChecklistCard />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <RecentOrdersCard
          loading={orderLoading}
          error={orderErr}
          orders={orderStats?.recentOrders || []}
        />

        <SupportCard />
      </section>
    </div>
  );
}

function SummaryCard(props: {
  title: string;
  value: string;
  note: string;
  gradient: string;
  loading?: boolean;
  error?: string | null;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const { title, value, note, gradient, loading, error, icon: Icon } = props;

  return (
    <div className="group overflow-hidden rounded-[24px] border border-white/40 bg-white shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5">
      <div className={`relative min-h-[138px] bg-gradient-to-br ${gradient}`}>
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-white/10" />

        <div className="relative flex h-full flex-col justify-between p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 md:text-xs">
              {title}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/16 text-white backdrop-blur">
              <Icon className="h-4 w-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {loading ? "…" : error ? "--" : value}
            </div>
            <div className="mt-1 text-[11px] text-white/85 md:text-xs">
              {note}
            </div>
          </div>
        </div>
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
    <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm shadow-slate-200/60 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Products overview
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Stock health and product count
          </p>
        </div>

        <a
          href="/products"
          className="inline-flex items-center gap-1 rounded-full bg-[#f3eeff] px-3 py-1.5 text-xs font-medium text-[#7a4cf0] hover:bg-[#ece4ff]"
        >
          Manage
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {loading && <LoadingBlock />}
      {!loading && error && <ErrorBlock text={error} />}

      {!loading && !error && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex justify-center md:w-[220px]">
            <DonutChart
              inStockPct={inStockPct}
              inStock={inStock}
              outOfStock={outOfStock}
            />
          </div>

          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
            <StatTile
              label="Total products"
              value={String(total)}
              color="bg-slate-100 text-slate-900"
            />
            <StatTile
              label="In stock"
              value={String(inStock)}
              color="bg-indigo-50 text-indigo-700"
            />
            <StatTile
              label="Out of stock"
              value={String(outOfStock)}
              color="bg-rose-50 text-rose-600"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile(props: {
  label: string;
  value: string;
  color: string;
}) {
  const { label, value, color } = props;

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div
        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${color}`}
      >
        {value}
      </div>
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
    <div className="relative h-40 w-40">
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
        <div className="text-[11px] font-medium text-slate-500">In stock</div>
        <div className="text-xl font-semibold text-slate-900">
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
      light: "bg-indigo-50",
      icon: CircleCheckBig,
    },
    {
      label: "Processing",
      value: statusLast30.processing,
      color: "bg-[#ffb84d]",
      light: "bg-amber-50",
      icon: PackageCheck,
    },
    {
      label: "On hold / Pending UPI",
      value: statusLast30.onHold,
      color: "bg-[#ff6b88]",
      light: "bg-rose-50",
      icon: Clock3,
    },
  ];

  const total = rows.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm shadow-slate-200/60 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Orders by status
          </h2>
          <p className="mt-1 text-xs text-slate-500">Last 30 days overview</p>
        </div>

        <a
          href="/orders"
          className="inline-flex items-center gap-1 rounded-full bg-[#f3eeff] px-3 py-1.5 text-xs font-medium text-[#7a4cf0] hover:bg-[#ece4ff]"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {loading && <LoadingBlock />}
      {!loading && error && <ErrorBlock text={error} />}

      {!loading && !error && (
        <div className="space-y-3">
          {rows.map((row) => {
            const pct = (row.value / total) * 100;
            const Icon = row.icon;

            return (
              <div
                key={row.label}
                className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${row.light}`}
                    >
                      <Icon className="h-4 w-4 text-slate-700" />
                    </span>
                    <span className="truncate text-sm font-medium text-slate-700">
                      {row.label}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {row.value}
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full ${row.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          <p className="pt-1 text-xs leading-5 text-slate-500">
            Open the <span className="font-medium text-slate-700">Orders</span>{" "}
            page to filter by status, date range, payment method and more.
          </p>
        </div>
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
    <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm shadow-slate-200/60 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Getting started
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Setup checklist for your store
          </p>
        </div>

        <span className="rounded-full bg-[#f3e9ff] px-2.5 py-1 text-[11px] font-medium text-[#8b5cff]">
          {doneCount}/{checklistItems.length} done
        </span>
      </div>

      <ul className="space-y-2.5">
        {checklistItems.map((item) => (
          <li
            key={item.label}
            className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-3"
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                item.done
                  ? "bg-emerald-500 text-white"
                  : "border border-slate-300 bg-white text-slate-400"
              }`}
            >
              {item.done ? "✓" : ""}
            </span>
            <span className="text-sm leading-5 text-slate-600">
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <a
        href="/settings?tab=profile"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#8b5cff] hover:underline"
      >
        Go to setup guide
        <ArrowRight className="h-4 w-4" />
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
    <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm shadow-slate-200/60 md:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">
          Revenue trend
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Completed and processing orders from the last 30 days
        </p>
      </div>

      {loading && <LoadingBlock />}
      {!loading && error && <ErrorBlock text={error} />}

      {!loading && !error && (
        <>
          {revenue.length === 0 || revenue.every((w) => w.total === 0) ? (
            <EmptyBlock text="No paid orders in the last 30 days." />
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {(() => {
                const max =
                  revenue.reduce((m, w) => (w.total > m ? w.total : m), 0) || 1;

                return revenue.map((w) => {
                  const height = (w.total / max) * 100;

                  return (
                    <div
                      key={w.label}
                      className="flex flex-col items-center justify-end gap-2"
                    >
                      <div className="flex h-32 w-full items-end justify-center">
                        <div className="relative flex h-full w-12 items-end overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="absolute bottom-0 w-full rounded-full bg-gradient-to-t from-[#4b5dff] via-[#8b5cff] to-[#ff6fb1]"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-[11px] font-medium text-slate-500">
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
    <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm shadow-slate-200/60 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Recent orders
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Latest activity from your store
          </p>
        </div>

        <a
          href="/orders"
          className="inline-flex items-center gap-1 rounded-full bg-[#f3eeff] px-3 py-1.5 text-xs font-medium text-[#7a4cf0] hover:bg-[#ece4ff]"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {loading && <LoadingBlock />}
      {!loading && error && <ErrorBlock text={error} />}

      {!loading && !error && (
        <div className="space-y-2.5">
          {orders.length === 0 && (
            <EmptyBlock text="No orders yet. New orders will show here." />
          )}

          {orders.map((o) => {
            const status = o.status.toLowerCase();
            let statusLabel = o.status || "—";
            let statusClass =
              "inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600";

            if (status === "completed") {
              statusLabel = "Completed";
              statusClass =
                "inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[10px] text-emerald-600";
            } else if (status === "processing") {
              statusLabel = "Processing";
              statusClass =
                "inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-600";
            } else if (status === "on-hold") {
              statusLabel = "On hold";
              statusClass =
                "inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-[10px] text-rose-600";
            }

            return (
              <a
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-3 transition hover:bg-slate-100"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-slate-800">{o.number}</div>
                    <span className="text-[10px] text-slate-400">
                      {formatDateShort(o.date_created)}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-[12px] text-slate-500">
                    {o.customer}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-slate-900">
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
    <div className="rounded-[28px] border border-slate-200/70 bg-gradient-to-br from-[#f5ecff] via-white to-[#e8f4ff] p-4 shadow-sm shadow-slate-200/60 md:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Need help?</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          For billing, settings, shipping or technical issues, use the support
          options below.
        </p>
      </div>

      <div className="space-y-2.5">
        <a
          href="/support/knowledge-base"
          className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-3 py-3 text-sm text-slate-700 hover:bg-white"
        >
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-slate-500" />
            <span>Browse Knowledge Base</span>
          </div>
          <span className="text-[11px] text-slate-400">Guides</span>
        </a>

        <a
          href="/support/tickets"
          className="flex items-center justify-between rounded-2xl bg-[#8b5cff] px-3 py-3 text-sm font-medium text-white hover:bg-[#7a4cf0]"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            <span>Open support ticket</span>
          </div>
          <span className="text-[11px] text-white/80">&lt; 24h reply</span>
        </a>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        For urgent issues, you can also use the WhatsApp button in the bottom
        right corner.
      </p>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-slate-200/70 bg-slate-50/60 text-sm text-slate-400">
      Loading…
    </div>
  );
}

function ErrorBlock({ text }: { text: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm text-rose-600">
      {text}
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 text-sm text-slate-400">
      {text}
    </div>
  );
}