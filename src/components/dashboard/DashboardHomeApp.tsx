"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  IndianRupee,
  PackageCheck,
  PackagePlus,
  ReceiptText,
  Settings2,
  ShoppingBag,
  Truck,
  Wallet,
} from "lucide-react";

import DashboardHomeAnalyticsCards from "@/components/dashboard/DashboardHomeAnalyticsCards";
import InstallAppCard from "@/components/pwa/InstallAppCard";
import RenewalNotice from "@/components/subscription/RenewalNotice";
import {
  useDashboardSubscription,
} from "@/components/subscription/SubscriptionContext";

type IconType =
  ComponentType<{
    className?: string;
  }>;

type ProductMetrics = {
  total: number;
  inStock: number;
  outOfStock: number;
};

type RevenueWeek = {
  label: string;
  total: number;
};

type RecentOrder = {
  id: number;
  number: string;
  customer: string;
  total: number;
  status: string;
  date_created: string;
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
  revenueByWeek: RevenueWeek[];
  recentOrders: RecentOrder[];
};

type DomainRenewalNotice = {
  enabled?: boolean;
  domain_name?: string;
  annual_amount?: number;
  amount?: number;
  renewal_date?: string;
  next_renewal_date?: string;
  status?: string;
  payment_status?: string;
  strong_message?: string;
};

type SummaryItem = {
  label: string;
  value: string;
  note: string;
  href: string;
  icon: IconType;
  iconClass: string;
  iconSurface: string;
};

type AttentionItem = {
  label: string;
  value: number;
  href: string;
  icon: IconType;
  iconClass: string;
  countClass: string;
  loading: boolean;
};

const QUICK_ACTIONS = [
  {
    label: "Add Product",
    href: "/products/add",
    icon: PackagePlus,
    iconClass:
      "bg-[#FDE9E5] text-[#E85D4A]",
  },
  {
    label: "Create Order",
    href: "/orders/new",
    icon: ClipboardList,
    iconClass:
      "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Print Slips",
    href: "/orders/packslips",
    icon: ReceiptText,
    iconClass:
      "bg-[#EEF1FA] text-[#5366B7]",
  },
  {
    label: "Shipments",
    href: "/sales/shipment-details",
    icon: Truck,
    iconClass:
      "bg-amber-50 text-amber-700",
  },
];

const SETUP_LINKS = [
  {
    label: "Complete store profile",
    href: "/settings?tab=profile",
  },
  {
    label: "Configure shipping charges",
    href: "/settings?tab=shipping",
  },
  {
    label: "Choose payment methods",
    href: "/settings?tab=payments",
  },
  {
    label: "Review fulfilment settings",
    href: "/settings?tab=shipmentFulfillment",
  },
];

function formatMoney(
  value: number
): string {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(
    Number.isFinite(value)
      ? value
      : 0
  );
}

function formatShortMoney(
  value: number
): string {
  const safeValue =
    Number.isFinite(value)
      ? value
      : 0;

  if (safeValue >= 10_000_000) {
    return `₹${(
      safeValue / 10_000_000
    ).toFixed(1)} Cr`;
  }

  if (safeValue >= 100_000) {
    return `₹${(
      safeValue / 100_000
    ).toFixed(1)} L`;
  }

  if (safeValue >= 1_000) {
    return `₹${(
      safeValue / 1_000
    ).toFixed(1)}k`;
  }

  return `₹${safeValue.toFixed(0)}`;
}

function formatDateShort(
  value: string
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "--";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
    }
  );
}

function greetingText(): string {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function readableStatus(
  value: string
): string {
  const normalized =
    value
      .replace(/[-_]+/g, " ")
      .trim();

  if (!normalized) {
    return "Unknown";
  }

  return normalized.replace(
    /\b\w/g,
    (character) =>
      character.toUpperCase()
  );
}

function statusClass(
  value: string
): string {
  const status =
    value.toLowerCase();

  if (status === "completed") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "processing") {
    return "bg-amber-50 text-amber-700";
  }

  if (
    status === "on-hold" ||
    status === "pending"
  ) {
    return "bg-rose-50 text-rose-600";
  }

  return "bg-slate-100 text-slate-600";
}

function summaryDividerClass(
  index: number
): string {
  if (index === 0) {
    return "border-b border-r md:border-b-0";
  }

  if (index === 1) {
    return "border-b md:border-b-0 md:border-r";
  }

  if (index === 2) {
    return "border-r";
  }

  return "";
}

function SectionSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-2xl border border-[#E6EAF3] bg-white/90 p-4",
        "shadow-[0_6px_20px_rgba(38,51,95,0.04)] md:p-5",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel = "View all",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[17px] font-bold text-[#26335F]">
          {title}
        </h2>

        {subtitle ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {subtitle}
          </p>
        ) : null}
      </div>

      {href ? (
        <Link
          href={href}
          className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-bold text-[#5366B7]"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function InlineError({
  text,
}: {
  text: string;
}) {
  return (
    <p className="mt-4 border-l-2 border-rose-400 pl-3 text-sm text-rose-700">
      {text}
    </p>
  );
}

export default function DashboardHomeApp() {
  const {
    subscription,
  } = useDashboardSubscription();

  const [
    productMetrics,
    setProductMetrics,
  ] =
    useState<ProductMetrics | null>(
      null
    );

  const [
    productLoading,
    setProductLoading,
  ] = useState(true);

  const [
    productError,
    setProductError,
  ] =
    useState<string | null>(
      null
    );

  const [
    orderStats,
    setOrderStats,
  ] =
    useState<OrdersSummary | null>(
      null
    );

  const [
    orderLoading,
    setOrderLoading,
  ] = useState(true);

  const [
    orderError,
    setOrderError,
  ] =
    useState<string | null>(
      null
    );

  const [
    domainRenewal,
    setDomainRenewal,
  ] =
    useState<DomainRenewalNotice | null>(
      null
    );

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setProductLoading(true);
        setProductError(null);

        const response =
          await fetch(
            "/api/metrics/products",
            {
              cache: "no-store",
            }
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load product metrics"
          );
        }

        const data =
          (
            await response.json()
          ) as ProductMetrics;

        if (!cancelled) {
          setProductMetrics(data);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setProductError(
            "Product information is temporarily unavailable."
          );
        }
      } finally {
        if (!cancelled) {
          setProductLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        setOrderLoading(true);
        setOrderError(null);

        const response =
          await fetch(
            "/api/metrics/orders",
            {
              cache: "no-store",
            }
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load order metrics"
          );
        }

        const data =
          (
            await response.json()
          ) as OrdersSummary;

        if (!cancelled) {
          setOrderStats(data);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setOrderError(
            "Order information is temporarily unavailable."
          );
        }
      } finally {
        if (!cancelled) {
          setOrderLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDomainRenewal() {
      try {
        const response =
          await fetch(
            "/api/settings/domain-renewal",
            {
              cache: "no-store",
            }
          );

        const value: unknown =
          await response
            .json()
            .catch(() => null);

        if (
          !cancelled &&
          response.ok &&
          value &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          setDomainRenewal(
            value as DomainRenewalNotice
          );
        }
      } catch {
        // Domain renewal is optional.
      }
    }

    void loadDomainRenewal();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalProducts =
    productMetrics?.total ?? 0;

  const inStock =
    productMetrics?.inStock ?? 0;

  const outOfStock =
    productMetrics?.outOfStock ?? 0;

  const processingOrders =
    orderStats
      ?.statusLast30
      ?.processing ?? 0;

  const pendingUpi =
    orderStats?.pendingOnHold ?? 0;

  const inStockPercentage =
    totalProducts > 0
      ? Math.round(
          (
            inStock /
            totalProducts
          ) * 100
        )
      : 0;

  const summaryItems:
    SummaryItem[] = [
      {
        label: "Today's sales",
        value: formatMoney(
          orderStats?.todaySales ??
            0
        ),
        note: "Orders received today",
        href: "/orders",
        icon: Wallet,
        iconClass:
          "text-[#E85D4A]",
        iconSurface:
          "bg-[#FDE9E5]",
      },
      {
        label: "Month sales",
        value: formatMoney(
          orderStats?.monthSales ??
            0
        ),
        note: "Current calendar month",
        href: "/reports",
        icon: IndianRupee,
        iconClass:
          "text-[#5366B7]",
        iconSurface:
          "bg-[#EEF1FA]",
      },
      {
        label: "Orders",
        value: String(
          orderStats
            ?.ordersLast30 ?? 0
        ),
        note: "During the last 30 days",
        href: "/orders",
        icon: ShoppingBag,
        iconClass:
          "text-emerald-700",
        iconSurface:
          "bg-emerald-50",
      },
      {
        label: "Products",
        value: String(
          totalProducts
        ),
        note: `${inStock} currently in stock`,
        href: "/products",
        icon: Boxes,
        iconClass:
          "text-[#2E3F7D]",
        iconSurface:
          "bg-[#E8EBF5]",
      },
    ];

  const attentionItems:
    AttentionItem[] = [
      {
        label: "Orders to process",
        value: processingOrders,
        href: "/orders?status=processing",
        icon: PackageCheck,
        iconClass:
          "text-[#5366B7]",
        countClass:
          "bg-[#EEF1FA] text-[#2E3F7D]",
        loading: orderLoading,
      },
      {
        label: "UPI reviews pending",
        value: pendingUpi,
        href: "/orders?status=on-hold",
        icon: Clock3,
        iconClass:
          "text-amber-700",
        countClass:
          "bg-amber-50 text-amber-700",
        loading: orderLoading,
      },
      {
        label: "Out-of-stock products",
        value: outOfStock,
        href:
          "/products?stock=outofstock",
        icon: AlertTriangle,
        iconClass:
          "text-rose-600",
        countClass:
          "bg-rose-50 text-rose-600",
        loading: productLoading,
      },
    ];

  const revenue =
    (
      orderStats
        ?.revenueByWeek ||
      []
    ).slice(-4);

  const maximumRevenue =
    Math.max(
      ...revenue.map(
        (week) =>
          week.total
      ),
      1
    );

  const fourWeekRevenue =
    revenue.reduce(
      (
        total,
        week
      ) =>
        total +
        week.total,
      0
    );

  const recentOrders =
    (
      orderStats
        ?.recentOrders ||
      []
    ).slice(0, 5);

  const attentionTotal =
    attentionItems.reduce(
      (
        total,
        item
      ) =>
        total +
        (
          item.loading
            ? 0
            : item.value
        ),
      0
    );

  const domainStatus =
    String(
      domainRenewal?.status ||
        domainRenewal
          ?.payment_status ||
        ""
    ).toLowerCase();

  const showDomainNotice =
    domainRenewal?.enabled ===
      true &&
    [
      "upcoming",
      "payment_due",
      "critical",
      "overdue_grace",
      "grace_expired",
      "payment_submitted",
    ].includes(domainStatus);

  return (
    <main className="mx-auto min-w-0 max-w-[1540px] pb-24 md:pb-8">
      {subscription ? (
        <RenewalNotice
          status={
            subscription.status
          }
          nextPaymentDate={
            subscription.nextPaymentDate
          }
        />
      ) : null}

      {showDomainNotice ? (
        <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-bold text-[#26335F]">
                {domainStatus ===
                "payment_submitted"
                  ? "Domain payment submitted"
                  : "Domain renewal requires attention"}
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-600">
                {domainRenewal
                  ?.strong_message ||
                  `${domainRenewal?.domain_name || "Your domain"} requires renewal payment.`}
              </p>
            </div>

            <Link
              href="/billing/subscription"
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#2E3F7D] px-4 text-sm font-bold text-white"
            >
              View Subscription
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : null}

      <header className="pb-4 pt-1 md:pb-5">
        <p
          suppressHydrationWarning
          className="text-sm font-bold text-[#E85D4A]"
        >
          {greetingText()}
        </p>

        <h1 className="mt-1 text-[25px] font-extrabold tracking-tight text-[#26335F] md:text-[31px]">
          Your store at a glance
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Today&apos;s sales, orders and store activity in one place.
        </p>
      </header>

      <DashboardHomeAnalyticsCards />

      <section
        aria-label="Business summary"
        className="mt-4 overflow-hidden rounded-2xl border border-[#E2E7F1] bg-[linear-gradient(135deg,#FFFFFF_0%,#F7F8FC_55%,#F1F3FA_100%)] shadow-[0_8px_24px_rgba(38,51,95,0.04)]"
      >
        <div className="grid grid-cols-2 md:grid-cols-4">
          {summaryItems.map(
            (
              item,
              index
            ) => {
              const Icon =
                item.icon;

              const loading =
                item.label ===
                "Products"
                  ? productLoading
                  : orderLoading;

              const error =
                item.label ===
                "Products"
                  ? productError
                  : orderError;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={[
                    "min-w-0 border-[#E2E7F1] px-3.5 py-4 md:px-5 md:py-5",
                    summaryDividerClass(
                      index
                    ),
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500">
                        {item.label}
                      </div>

                      <div className="mt-2 truncate text-[20px] font-extrabold tracking-tight text-[#26335F] md:text-[24px]">
                        {loading
                          ? "…"
                          : error
                            ? "--"
                            : item.value}
                      </div>
                    </div>

                    <span
                      className={[
                        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                        item.iconSurface,
                      ].join(" ")}
                    >
                      <Icon
                        className={[
                          "h-4 w-4",
                          item.iconClass,
                        ].join(" ")}
                      />
                    </span>
                  </div>

                  <div className="mt-2 truncate text-[11px] text-slate-400">
                    {item.note}
                  </div>
                </Link>
              );
            }
          )}
        </div>
      </section>

      <div className="mt-4 flex min-w-0 flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] xl:items-start xl:gap-5">
        <div className="contents xl:block xl:space-y-5">
          <SectionSurface className="order-4 xl:order-none">
            <SectionHeading
              title="Revenue Trend"
              subtitle="Paid-order revenue from the latest four weeks."
              href="/reports"
              linkLabel="Reports"
            />

            {orderLoading ? (
              <div className="mt-6 h-36 animate-pulse rounded-xl bg-slate-100" />
            ) : orderError ? (
              <InlineError text={orderError} />
            ) : revenue.length === 0 ? (
              <p className="mt-6 py-9 text-center text-sm text-slate-500">
                Revenue will appear after paid orders are received.
              </p>
            ) : (
              <>
                <div className="mt-5">
                  <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500">
                    Four-week revenue
                  </div>

                  <div className="mt-1 text-2xl font-extrabold text-[#26335F]">
                    {formatMoney(
                      fourWeekRevenue
                    )}
                  </div>
                </div>

                <div
                  className="mt-5 grid min-w-0 gap-3 rounded-xl bg-[#F7F8FC] px-3 pb-3 pt-5 md:px-5"
                  style={{
                    gridTemplateColumns:
                      `repeat(${revenue.length}, minmax(0, 1fr))`,
                  }}
                >
                  {revenue.map(
                    (week) => {
                      const height =
                        Math.max(
                          7,
                          (
                            week.total /
                            maximumRevenue
                          ) * 100
                        );

                      return (
                        <div
                          key={week.label}
                          className="min-w-0 text-center"
                        >
                          <div className="flex h-32 items-end justify-center border-b border-[#D9DEEC]">
                            <div
                              className="w-full max-w-[48px] rounded-t-lg bg-[linear-gradient(180deg,#6577C5_0%,#2E3F7D_100%)]"
                              style={{
                                height:
                                  `${height}%`,
                              }}
                            />
                          </div>

                          <div className="mt-2 truncate text-[10px] font-bold text-slate-500">
                            {week.label}
                          </div>

                          <div className="mt-0.5 truncate text-[10px] font-extrabold text-[#26335F]">
                            {formatShortMoney(
                              week.total
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </>
            )}
          </SectionSurface>

          <SectionSurface className="order-3 xl:order-none">
            <SectionHeading
              title="Recent Orders"
              subtitle="Latest customer orders and payment status."
              href="/orders"
            />

            {orderLoading ? (
              <div className="mt-4 space-y-3">
                <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ) : orderError ? (
              <InlineError text={orderError} />
            ) : recentOrders.length === 0 ? (
              <p className="mt-6 py-9 text-center text-sm text-slate-500">
                New orders will appear here.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[#E9ECF3]">
                {recentOrders.map(
                  (order) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="flex min-h-[70px] min-w-0 items-center gap-3 py-3"
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF1FA] text-[#5366B7]">
                        <ShoppingBag className="h-4 w-4" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-extrabold text-[#26335F]">
                            #{order.number}
                          </span>

                          <span className="shrink-0 text-[10px] text-slate-400">
                            {formatDateShort(
                              order.date_created
                            )}
                          </span>
                        </span>

                        <span className="mt-1 block truncate text-xs text-slate-500">
                          {order.customer ||
                            "Customer"}
                        </span>
                      </span>

                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-extrabold text-[#26335F]">
                          {formatMoney(
                            order.total
                          )}
                        </span>

                        <span
                          className={[
                            "mt-1 inline-flex rounded-full px-2 py-1 text-[9px] font-bold",
                            statusClass(
                              order.status
                            ),
                          ].join(" ")}
                        >
                          {readableStatus(
                            order.status
                          )}
                        </span>
                      </span>
                    </Link>
                  )
                )}
              </div>
            )}
          </SectionSurface>
        </div>

        <aside className="contents xl:block xl:space-y-5">
          <SectionSurface className="order-1 xl:order-none">
            <SectionHeading
              title="Needs Attention"
              subtitle="Important store work waiting for you."
            />

            {attentionTotal === 0 &&
            attentionItems.every(
              (item) =>
                !item.loading
            ) ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-3">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />

                <div>
                  <div className="text-sm font-bold text-emerald-700">
                    All caught up
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    No urgent actions right now.
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-[#E9ECF3]">
                {attentionItems.map(
                  (item) => {
                    const Icon =
                      item.icon;

                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="flex min-h-[58px] items-center gap-3 py-2"
                      >
                        <Icon
                          className={[
                            "h-[18px] w-[18px] shrink-0",
                            item.iconClass,
                          ].join(" ")}
                        />

                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
                          {item.label}
                        </span>

                        <span
                          className={[
                            "inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-xs font-extrabold",
                            item.countClass,
                          ].join(" ")}
                        >
                          {item.loading
                            ? "…"
                            : item.value}
                        </span>
                      </Link>
                    );
                  }
                )}
              </div>
            )}
          </SectionSurface>

          <SectionSurface className="order-2 xl:order-none">
            <SectionHeading
              title="Quick Actions"
              subtitle="Start common store tasks."
            />

            <div className="mt-5 grid grid-cols-4 gap-2">
              {QUICK_ACTIONS.map(
                (action) => {
                  const Icon =
                    action.icon;

                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="flex min-w-0 flex-col items-center text-center"
                    >
                      <span
                        className={[
                          "inline-flex h-11 w-11 items-center justify-center rounded-full",
                          action.iconClass,
                        ].join(" ")}
                      >
                        <Icon className="h-5 w-5" />
                      </span>

                      <span className="mt-2 w-full text-[11px] font-bold leading-4 text-[#26335F]">
                        {action.label}
                      </span>
                    </Link>
                  );
                }
              )}
            </div>
          </SectionSurface>

          <SectionSurface className="order-5 xl:order-none">
            <SectionHeading
              title="Products & Stock"
              subtitle="Current catalogue availability."
              href="/products"
              linkLabel="Manage"
            />

            {productLoading ? (
              <div className="mt-6 h-20 animate-pulse rounded-xl bg-slate-100" />
            ) : productError ? (
              <InlineError text={productError} />
            ) : (
              <>
                <div className="mt-5 grid grid-cols-3 divide-x divide-[#E5E9F2]">
                  <div className="pr-3">
                    <div className="text-xl font-extrabold text-[#26335F]">
                      {totalProducts}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Products
                    </div>
                  </div>

                  <Link
                    href="/products?stock=instock"
                    className="px-3"
                  >
                    <div className="text-xl font-extrabold text-[#5366B7]">
                      {inStock}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      In stock
                    </div>
                  </Link>

                  <Link
                    href="/products?stock=outofstock"
                    className="pl-3"
                  >
                    <div className="text-xl font-extrabold text-rose-600">
                      {outOfStock}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Out of stock
                    </div>
                  </Link>
                </div>

                <div className="mt-5 rounded-xl bg-[#F7F8FC] px-3 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">
                      Stock availability
                    </span>

                    <span className="font-extrabold text-[#26335F]">
                      {inStockPercentage}%
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rose-100">
                    <div
                      className="h-full rounded-full bg-[#5366B7]"
                      style={{
                        width:
                          `${inStockPercentage}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </SectionSurface>

          <details className="group order-6 rounded-2xl border border-[#E6EAF3] bg-white/90 px-4 py-3 shadow-[0_6px_20px_rgba(38,51,95,0.04)] xl:order-none">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF1FA] text-[#5366B7]">
                <Settings2 className="h-4 w-4" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[#26335F]">
                  Store Setup Guide
                </span>

                <span className="mt-0.5 block text-xs text-slate-500">
                  Open when you need setup help.
                </span>
              </span>

              <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>

            <div className="mt-3 divide-y divide-[#E9ECF3] border-t border-[#E9ECF3]">
              {SETUP_LINKS.map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    <span className="truncate">
                      {item.label}
                    </span>

                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                )
              )}
            </div>
          </details>
        </aside>
      </div>

      <div className="pt-5">
        <InstallAppCard />
      </div>
    </main>
  );
}
