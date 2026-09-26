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
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";

import DashboardHomeAnalyticsCards from "@/components/dashboard/DashboardHomeAnalyticsCards";
import InstallAppCard from "@/components/pwa/InstallAppCard";
import RenewalNotice from "@/components/subscription/RenewalNotice";
import {
  useDashboardSubscription,
} from "@/components/subscription/SubscriptionContext";
import {
  Skeleton,
} from "@/components/ui/skeleton";

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
  borderClass: string;
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
    className:
      "bg-[#F15E4A] text-white",
  },
  {
    label: "Create Order",
    href: "/orders/new",
    icon: ClipboardList,
    className:
      "bg-[#20B486] text-white",
  },
  {
    label: "Print Slips",
    href: "/orders/packslips",
    icon: ReceiptText,
    className:
      "bg-[#4059A7] text-white",
  },
  {
    label: "Shipments",
    href: "/sales/shipment-details",
    icon: Truck,
    className:
      "bg-[#D88A16] text-white",
  },
];

const SETUP_LINKS = [
  {
    label:
      "Complete store profile",
    href:
      "/settings?tab=profileAccount",
  },
  {
    label:
      "Configure shipping & delivery",
    href:
      "/settings?tab=shippingDelivery",
  },
  {
    label:
      "Choose payment methods",
    href:
      "/settings?tab=payments",
  },
  {
    label:
      "Review website setup",
    href:
      "/settings?tab=setupSite",
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

  if (
    safeValue >=
    10_000_000
  ) {
    return `₹${(
      safeValue /
      10_000_000
    ).toFixed(1)} Cr`;
  }

  if (
    safeValue >=
    100_000
  ) {
    return `₹${(
      safeValue /
      100_000
    ).toFixed(1)} L`;
  }

  if (
    safeValue >=
    1_000
  ) {
    return `₹${(
      safeValue / 1_000
    ).toFixed(1)}k`;
  }

  return `₹${safeValue.toFixed(
    0
  )}`;
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
      .replace(
        /[-_]+/g,
        " "
      )
      .trim();

  if (!normalized) {
    return "Unknown";
  }

  return normalized.replace(
    /\b\w/g,
    (
      character
    ) =>
      character.toUpperCase()
  );
}

function statusClass(
  value: string
): string {
  const status =
    value.toLowerCase();

  if (
    status ===
    "completed"
  ) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (
    status ===
    "processing"
  ) {
    return "bg-sky-100 text-sky-800";
  }

  if (
    status ===
      "on-hold" ||
    status ===
      "pending"
  ) {
    return "bg-amber-100 text-amber-800";
  }

  if (
    status ===
      "cancelled" ||
    status ===
      "failed"
  ) {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
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
        "overflow-hidden rounded-2xl border border-[#E1E6F0] bg-white shadow-[0_8px_24px_rgba(38,51,95,0.06)]",
        className,
      ].join(
        " "
      )}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = "View all",
  tone = "navy",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  tone?:
    | "navy"
    | "coral"
    | "green"
    | "plain";
}) {
  const toneClass =
    tone === "coral"
      ? "bg-[#F15E4A] text-white"
      : tone === "green"
        ? "bg-[#20B486] text-white"
        : tone === "plain"
          ? "border-b border-[#E5E9F2] bg-white text-[#26335F]"
          : "bg-[#26366E] text-white";

  const secondaryText =
    tone === "plain"
      ? "text-slate-500"
      : "text-white/70";

  return (
    <div
      className={[
        "flex items-start justify-between gap-3 px-4 py-3.5 md:px-5",
        toneClass,
      ].join(
        " "
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[16px] font-extrabold tracking-tight">
          {title}
        </h2>

        {subtitle ? (
          <p
            className={[
              "mt-0.5 text-xs leading-5",
              secondaryText,
            ].join(
              " "
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      {href ? (
        <Link
          href={href}
          className={[
            "inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-extrabold",
            tone === "plain"
              ? "text-[#5366B7]"
              : "bg-white/12 text-white",
          ].join(
            " "
          )}
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
    <p className="m-4 border-l-2 border-rose-400 pl-3 text-sm text-rose-700">
      {text}
    </p>
  );
}

export default function DashboardHomeApp() {
  const {
    subscription,
  } =
    useDashboardSubscription();

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
  ] =
    useState(true);

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
  ] =
    useState(true);

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
    let cancelled =
      false;

    async function loadProducts() {
      try {
        setProductLoading(
          true
        );
        setProductError(
          null
        );

        const response =
          await fetch(
            "/api/metrics/products",
            {
              cache:
                "no-store",
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            "Failed to load product metrics"
          );
        }

        const data =
          (
            await response.json()
          ) as ProductMetrics;

        if (!cancelled) {
          setProductMetrics(
            data
          );
        }
      } catch (
        error
      ) {
        console.error(
          error
        );

        if (!cancelled) {
          setProductError(
            "Product information is temporarily unavailable."
          );
        }
      } finally {
        if (!cancelled) {
          setProductLoading(
            false
          );
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled =
        true;
    };
  }, []);

  useEffect(() => {
    let cancelled =
      false;

    async function loadOrders() {
      try {
        setOrderLoading(
          true
        );
        setOrderError(
          null
        );

        const response =
          await fetch(
            "/api/metrics/orders",
            {
              cache:
                "no-store",
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            "Failed to load order metrics"
          );
        }

        const data =
          (
            await response.json()
          ) as OrdersSummary;

        if (!cancelled) {
          setOrderStats(
            data
          );
        }
      } catch (
        error
      ) {
        console.error(
          error
        );

        if (!cancelled) {
          setOrderError(
            "Order information is temporarily unavailable."
          );
        }
      } finally {
        if (!cancelled) {
          setOrderLoading(
            false
          );
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled =
        true;
    };
  }, []);

  useEffect(() => {
    let cancelled =
      false;

    async function loadDomainRenewal() {
      try {
        const response =
          await fetch(
            "/api/settings/domain-renewal",
            {
              cache:
                "no-store",
            }
          );

        const value:
          unknown =
          await response
            .json()
            .catch(
              () => null
            );

        if (
          !cancelled &&
          response.ok &&
          value &&
          typeof value ===
            "object" &&
          !Array.isArray(
            value
          )
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
      cancelled =
        true;
    };
  }, []);

  const totalProducts =
    productMetrics?.total ??
    0;

  const inStock =
    productMetrics
      ?.inStock ?? 0;

  const outOfStock =
    productMetrics
      ?.outOfStock ?? 0;

  const processingOrders =
    orderStats
      ?.statusLast30
      ?.processing ?? 0;

  const pendingUpi =
    orderStats
      ?.pendingOnHold ?? 0;

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
        label:
          "Today's sales",
        value:
          formatMoney(
            orderStats
              ?.todaySales ??
              0
          ),
        note:
          "Paid orders today",
        href: "/orders",
        icon: Wallet,
        iconClass:
          "text-white",
        iconSurface:
          "bg-[#F15E4A]",
        borderClass:
          "border-t-[#F15E4A]",
      },
      {
        label:
          "Month sales",
        value:
          formatMoney(
            orderStats
              ?.monthSales ??
              0
          ),
        note:
          "Current calendar month",
        href: "/reports",
        icon:
          IndianRupee,
        iconClass:
          "text-white",
        iconSurface:
          "bg-[#4059A7]",
        borderClass:
          "border-t-[#4059A7]",
      },
      {
        label:
          "Orders",
        value:
          String(
            orderStats
              ?.ordersLast30 ??
              0
          ),
        note:
          "Last 30 days",
        href: "/orders",
        icon:
          ShoppingBag,
        iconClass:
          "text-white",
        iconSurface:
          "bg-[#20B486]",
        borderClass:
          "border-t-[#20B486]",
      },
      {
        label:
          "Products",
        value:
          String(
            totalProducts
          ),
        note:
          `${inStock} in stock`,
        href: "/products",
        icon: Boxes,
        iconClass:
          "text-white",
        iconSurface:
          "bg-[#D88A16]",
        borderClass:
          "border-t-[#D88A16]",
      },
    ];

  const attentionItems:
    AttentionItem[] = [
      {
        label:
          "Orders to process",
        value:
          processingOrders,
        href:
          "/orders?status=processing",
        icon:
          PackageCheck,
        iconClass:
          "text-[#4059A7]",
        countClass:
          "bg-[#E8EDFF] text-[#304A9A]",
        loading:
          orderLoading,
      },
      {
        label:
          "UPI reviews pending",
        value:
          pendingUpi,
        href:
          "/orders?status=on-hold",
        icon: Clock3,
        iconClass:
          "text-[#D88A16]",
        countClass:
          "bg-amber-100 text-amber-800",
        loading:
          orderLoading,
      },
      {
        label:
          "Out-of-stock products",
        value:
          outOfStock,
        href:
          "/products?stock=outofstock",
        icon:
          AlertTriangle,
        iconClass:
          "text-[#D84F3E]",
        countClass:
          "bg-rose-100 text-rose-700",
        loading:
          productLoading,
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
        (
          week
        ) => week.total
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
      domainRenewal
        ?.status ||
        domainRenewal
          ?.payment_status ||
        ""
    ).toLowerCase();

  const showDomainNotice =
    domainRenewal
      ?.enabled ===
      true &&
    [
      "upcoming",
      "payment_due",
      "critical",
      "overdue_grace",
      "grace_expired",
      "payment_submitted",
    ].includes(
      domainStatus
    );

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
        <section className="mb-4 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-[0_8px_24px_rgba(38,51,95,0.05)]">
          <div className="border-l-4 border-[#D88A16] px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-extrabold text-heading">
                  {domainStatus ===
                  "payment_submitted"
                    ? "Domain payment submitted"
                    : "Domain renewal requires attention"}
                </h2>

                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {domainRenewal
                    ?.strong_message ||
                    `${domainRenewal?.domain_name || "Your domain"} requires renewal payment.`}
                </p>
              </div>

              <Link
                href="/billing/subscription"
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#26366E] px-4 text-sm font-extrabold text-white"
              >
                View Subscription
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <header className="pb-4 pt-1 md:flex md:items-end md:justify-between md:gap-4 md:pb-5">
        <div>
          <div
            suppressHydrationWarning
            className="inline-flex items-center gap-2 rounded-full bg-[#FDE9E5] px-2.5 py-1 text-[11px] font-extrabold text-[#D84F3E]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {greetingText()}
          </div>

          <h1 className="mt-2 text-[25px] font-extrabold tracking-tight text-[#182451] md:text-[31px]">
            Your store at a glance
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Sales, orders, stock and website activity in one place.
          </p>
        </div>

        <Link
          href="/products/add"
          className="mt-3 hidden min-h-10 items-center gap-2 rounded-xl bg-[#F15E4A] px-4 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(241,94,74,0.18)] hover:bg-[#D84F3E] md:inline-flex"
        >
          <PackagePlus className="h-4 w-4" />
          Add Product
        </Link>
      </header>

      <DashboardHomeAnalyticsCards />

      <section
        aria-label="Business summary"
        className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3"
      >
        {summaryItems.map(
          (
            item
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
                key={
                  item.label
                }
                href={
                  item.href
                }
                className={[
                  "min-w-0 rounded-2xl border border-[#E1E6F0] border-t-4 bg-white p-3.5 shadow-[0_8px_22px_rgba(38,51,95,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(38,51,95,0.08)] md:p-4",
                  item.borderClass,
                ].join(
                  " "
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[10px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground">
                      {
                        item.label
                      }
                    </div>

                    <div className="mt-2 truncate text-[20px] font-extrabold tracking-tight text-[#182451] md:text-[24px]">
                      {loading
                        ? (
                          <Skeleton className="h-7 w-20" />
                        )
                        : error
                          ? "--"
                          : item.value}
                    </div>
                  </div>

                  <span
                    className={[
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
                      item.iconSurface,
                    ].join(
                      " "
                    )}
                  >
                    <Icon
                      className={[
                        "h-4 w-4",
                        item.iconClass,
                      ].join(
                        " "
                      )}
                    />
                  </span>
                </div>

                <div className="mt-2 truncate text-[11px] text-muted-foreground">
                  {item.note}
                </div>
              </Link>
            );
          }
        )}
      </section>

      <div className="mt-4 flex min-w-0 flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] xl:items-start xl:gap-5">
        <div className="contents xl:block xl:space-y-5">
          <SectionSurface className="order-4 xl:order-none">
            <SectionHeader
              title="Revenue Trend"
              subtitle="Paid-order revenue from the latest four weeks."
              href="/reports"
              linkLabel="Reports"
              tone="navy"
            />

            <div className="p-4 md:p-5">
              {orderLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : orderError ? (
                <InlineError
                  text={
                    orderError
                  }
                />
              ) : revenue.length ===
                0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Revenue will appear after paid orders are received.
                </p>
              ) : (
                <>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground">
                        Four-week revenue
                      </div>

                      <div className="mt-1 text-2xl font-extrabold text-[#182451]">
                        {formatMoney(
                          fourWeekRevenue
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#EEF1FA] px-3 py-2 text-right">
                      <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        Paid orders
                      </div>
                      <div className="mt-0.5 text-sm font-extrabold text-[#26366E]">
                        Processing + Completed
                      </div>
                    </div>
                  </div>

                  <div
                    className="mt-5 grid min-w-0 gap-3 rounded-xl bg-[#F4F6FB] px-3 pb-3 pt-5 md:px-5"
                    style={{
                      gridTemplateColumns:
                        `repeat(${revenue.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {revenue.map(
                      (
                        week,
                        index
                      ) => {
                        const height =
                          Math.max(
                            7,
                            (
                              week.total /
                              maximumRevenue
                            ) *
                              100
                          );

                        const barClass =
                          index ===
                          revenue.length -
                            1
                            ? "bg-[#F15E4A]"
                            : "bg-[#4059A7]";

                        return (
                          <div
                            key={
                              week.label
                            }
                            className="min-w-0 text-center"
                          >
                            <div className="flex h-32 items-end justify-center border-b border-[#D9DEEC]">
                              <div
                                className={[
                                  "w-full max-w-[48px] rounded-t-lg shadow-sm",
                                  barClass,
                                ].join(
                                  " "
                                )}
                                style={{
                                  height:
                                    `${height}%`,
                                }}
                              />
                            </div>

                            <div className="mt-2 truncate text-[10px] font-bold text-muted-foreground">
                              {
                                week.label
                              }
                            </div>

                            <div className="mt-0.5 truncate text-[10px] font-extrabold text-[#182451]">
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
            </div>
          </SectionSurface>

          <SectionSurface className="order-3 xl:order-none">
            <SectionHeader
              title="Recent Orders"
              subtitle="Latest customer orders and payment status."
              href="/orders"
              tone="plain"
            />

            {orderLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : orderError ? (
              <InlineError
                text={
                  orderError
                }
              />
            ) : recentOrders.length ===
              0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                New orders will appear here.
              </p>
            ) : (
              <div className="divide-y divide-[#E9ECF3] px-4 md:px-5">
                {recentOrders.map(
                  (
                    order
                  ) => (
                    <Link
                      key={
                        order.id
                      }
                      href={`/orders/${order.id}`}
                      className="flex min-h-[72px] min-w-0 items-center gap-3 py-3"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#26366E] text-white">
                        <ShoppingBag className="h-4 w-4" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-extrabold text-[#182451]">
                            #
                            {
                              order.number
                            }
                          </span>

                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatDateShort(
                              order.date_created
                            )}
                          </span>
                        </span>

                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {order.customer ||
                            "Customer"}
                        </span>
                      </span>

                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-extrabold text-[#182451]">
                          {formatMoney(
                            order.total
                          )}
                        </span>

                        <span
                          className={[
                            "mt-1 inline-flex rounded-full px-2 py-1 text-[9px] font-extrabold",
                            statusClass(
                              order.status
                            ),
                          ].join(
                            " "
                          )}
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
            <SectionHeader
              title="Needs Attention"
              subtitle="Important store work waiting for you."
              tone="coral"
            />

            {attentionTotal ===
              0 &&
            attentionItems.every(
              (
                item
              ) =>
                !item.loading
            ) ? (
              <div className="m-4 flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-3">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />

                <div>
                  <div className="text-sm font-extrabold text-emerald-700">
                    All caught up
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    No urgent actions right now.
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#E9ECF3] px-4">
                {attentionItems.map(
                  (
                    item
                  ) => {
                    const Icon =
                      item.icon;

                    return (
                      <Link
                        key={
                          item.label
                        }
                        href={
                          item.href
                        }
                        className="flex min-h-[60px] items-center gap-3 py-2.5"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F4F6FB]">
                          <Icon
                            className={[
                              "h-[18px] w-[18px]",
                              item.iconClass,
                            ].join(
                              " "
                            )}
                          />
                        </span>

                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#34405F]">
                          {
                            item.label
                          }
                        </span>

                        <span
                          className={[
                            "inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-xs font-extrabold",
                            item.countClass,
                          ].join(
                            " "
                          )}
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
            <SectionHeader
              title="Quick Actions"
              subtitle="Start common store tasks."
              tone="plain"
            />

            <div className="grid grid-cols-2 gap-2.5 p-4">
              {QUICK_ACTIONS.map(
                (
                  action
                ) => {
                  const Icon =
                    action.icon;

                  return (
                    <Link
                      key={
                        action.label
                      }
                      href={
                        action.href
                      }
                      className={[
                        "flex min-h-[88px] min-w-0 flex-col justify-between rounded-xl p-3 shadow-sm transition hover:-translate-y-0.5",
                        action.className,
                      ].join(
                        " "
                      )}
                    >
                      <Icon className="h-5 w-5" />

                      <span className="mt-3 text-sm font-extrabold leading-4">
                        {
                          action.label
                        }
                      </span>
                    </Link>
                  );
                }
              )}
            </div>
          </SectionSurface>

          <SectionSurface className="order-5 xl:order-none">
            <SectionHeader
              title="Products & Stock"
              subtitle="Current catalogue availability."
              href="/products"
              linkLabel="Manage"
              tone="green"
            />

            {productLoading ? (
              <div className="p-4">
                <Skeleton className="h-24 w-full" />
              </div>
            ) : productError ? (
              <InlineError
                text={
                  productError
                }
              />
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-3 divide-x divide-[#E5E9F2]">
                  <div className="pr-3">
                    <div className="text-xl font-extrabold text-[#182451]">
                      {
                        totalProducts
                      }
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Products
                    </div>
                  </div>

                  <Link
                    href="/products?stock=instock"
                    className="px-3"
                  >
                    <div className="text-xl font-extrabold text-[#20B486]">
                      {
                        inStock
                      }
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      In stock
                    </div>
                  </Link>

                  <Link
                    href="/products?stock=outofstock"
                    className="pl-3"
                  >
                    <div className="text-xl font-extrabold text-[#D84F3E]">
                      {
                        outOfStock
                      }
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Out of stock
                    </div>
                  </Link>
                </div>

                <div className="mt-5 rounded-xl bg-[#F4F6FB] px-3 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">
                      Stock availability
                    </span>

                    <span className="font-extrabold text-[#182451]">
                      {
                        inStockPercentage
                      }
                      %
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-rose-100">
                    <div
                      className="h-full rounded-full bg-[#20B486]"
                      style={{
                        width:
                          `${inStockPercentage}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </SectionSurface>

          <details className="group order-6 overflow-hidden rounded-2xl border border-[#E1E6F0] bg-white shadow-[0_8px_24px_rgba(38,51,95,0.05)] xl:order-none">
            <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 bg-[#26366E] px-4 text-white">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4059A7]">
                <Settings2 className="h-4 w-4" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold">
                  Store Setup Guide
                </span>

                <span className="mt-0.5 block text-xs text-indigo-100/70">
                  Open when you need setup help.
                </span>
              </span>

              <ChevronDown className="h-5 w-5 shrink-0 text-indigo-100 transition-transform group-open:rotate-180" />
            </summary>

            <div className="divide-y divide-[#E9ECF3] px-4">
              {SETUP_LINKS.map(
                (
                  item
                ) => (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm font-semibold text-[#34405F]"
                  >
                    <span className="truncate">
                      {
                        item.label
                      }
                    </span>

                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
