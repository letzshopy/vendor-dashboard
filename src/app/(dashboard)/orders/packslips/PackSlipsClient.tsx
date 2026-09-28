"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FileDown,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  ShoppingBag,
} from "lucide-react";

import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Button,
} from "@/components/ui/button";
import {
  EmptyState,
} from "@/components/ui/empty-state";
import {
  Input,
} from "@/components/ui/input";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  actionFeedback,
} from "@/lib/actionFeedback";
import type {
  WCOrder,
} from "@/lib/order-utils";

type FilterKey =
  | "ready"
  | "all"
  | "processing"
  | "on-hold"
  | "completed";

type PackSlipsClientProps = {
  initialIds?: number[];
};

type OrdersResponse = {
  ok?: boolean;
  data?: WCOrder[];
  error?: string;
};

type ProfileResponse = {
  business?: {
    name?: string;
    address?: string;
  };
};

type GeneralProducts = {
  packslipReturnAddress?: string;
  packslipShowReturn?: boolean;
};

type GeneralResponse = {
  products?: GeneralProducts;
  general?: {
    products?: GeneralProducts;
  };
};

const FILTERS: Array<{
  value: FilterKey;
  label: string;
}> = [
  {
    value: "ready",
    label: "Ready",
  },
  {
    value: "processing",
    label: "Processing",
  },
  {
    value: "on-hold",
    label: "On hold",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "all",
    label: "All",
  },
];

const BLOCKED_STATUSES =
  new Set<string>([
    "cancelled",
    "refunded",
    "failed",
    "trash",
  ]);

function customerName(
  order: WCOrder
): string {
  const first =
    order.billing
      ?.first_name || "";
  const last =
    order.billing
      ?.last_name || "";

  return (
    `${first} ${last}`.trim() ||
    "Customer"
  );
}

function itemCount(
  order: WCOrder
): number {
  return (
    order.line_items || []
  ).reduce(
    (
      total,
      item
    ) =>
      total +
      Math.max(
        0,
        Number(
          item.quantity || 0
        )
      ),
    0
  );
}

function formatMoney(
  order: WCOrder
): string {
  const amount =
    Number(order.total);

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return order.total || "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency:
        order.currency ||
        "INR",
      maximumFractionDigits:
        2,
    }
  ).format(amount);
}

function formatDate(
  value?: string
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function statusLabel(
  status: string
): string {
  return status
    .replace(
      /[-_]+/g,
      " "
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function statusClass(
  status: string
): string {
  switch (
    status.toLowerCase()
  ) {
    case "processing":
      return "bg-sky-100 text-sky-800";
    case "on-hold":
      return "bg-amber-100 text-amber-800";
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "pending":
      return "bg-violet-100 text-violet-800";
    case "cancelled":
      return "bg-slate-200 text-slate-700";
    case "refunded":
      return "bg-purple-100 text-purple-800";
    case "failed":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function eligible(
  order: WCOrder
): boolean {
  return !BLOCKED_STATUSES.has(
    String(order.status)
      .toLowerCase()
  );
}

function matchesFilter(
  order: WCOrder,
  filter: FilterKey
): boolean {
  const status =
    String(order.status)
      .toLowerCase();

  if (
    filter === "all"
  ) {
    return status !==
      "trash";
  }

  if (
    filter === "ready"
  ) {
    return [
      "processing",
      "on-hold",
      "pending",
    ].includes(status);
  }

  return status ===
    filter;
}

function errorMessage(
  value: unknown,
  fallback: string
): string {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(value) &&
    "error" in value
  ) {
    const error =
      (
        value as {
          error?: unknown;
        }
      ).error;

    if (
      typeof error ===
      "string" &&
      error.trim()
    ) {
      return error;
    }
  }

  return fallback;
}

export default function PackSlipsClient({
  initialIds = [],
}: PackSlipsClientProps) {
  const [
    orders,
    setOrders,
  ] =
    useState<WCOrder[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<FilterKey>(
      initialIds.length
        ? "all"
        : "ready"
    );

  const [
    selected,
    setSelected,
  ] =
    useState<Set<number>>(
      () =>
        new Set<number>(
          initialIds
        )
    );

  const [
    generating,
    setGenerating,
  ] =
    useState(false);

  const [
    storeName,
    setStoreName,
  ] =
    useState(
      "Your Store"
    );

  const [
    senderConfigured,
    setSenderConfigured,
  ] =
    useState(false);

  async function loadOrders() {
    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/orders/all",
          {
            cache:
              "no-store",
          }
        );

      const payload =
        (
          await response
            .json()
            .catch(
              () => ({})
            )
        ) as OrdersResponse;

      if (!response.ok) {
        throw new Error(
          errorMessage(
            payload,
            "Could not load orders."
          )
        );
      }

      const nextOrders =
        Array.isArray(
          payload.data
        )
          ? payload.data
          : [];

      setOrders(
        nextOrders
      );

      if (
        initialIds.length
      ) {
        const available =
          new Set<number>(
            nextOrders
              .filter(
                (order) =>
                  initialIds.includes(
                    order.id
                  ) &&
                  eligible(order)
              )
              .map(
                (order) =>
                  order.id
              )
          );

        setSelected(
          available
        );
      }
    } catch (
      loadError
    ) {
      setError(
        loadError instanceof
        Error
          ? loadError.message
          : "Could not load orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
    // Initial IDs are intentionally fixed for the mounted route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled =
      false;

    async function loadBrand() {
      try {
        const [
          profileResponse,
          generalResponse,
        ] =
          await Promise.all([
            fetch(
              "/api/settings/profile",
              {
                cache:
                  "no-store",
              }
            ),
            fetch(
              "/api/settings/general",
              {
                cache:
                  "no-store",
              }
            ),
          ]);

        const profile =
          (
            await profileResponse
              .json()
              .catch(
                () => ({})
              )
          ) as ProfileResponse;

        const general =
          (
            await generalResponse
              .json()
              .catch(
                () => ({})
              )
          ) as GeneralResponse;

        if (cancelled) {
          return;
        }

        const business =
          profile.business ||
          {};

        const products:
          GeneralProducts =
          general.products ||
          general.general
            ?.products ||
          {};

        const customAddress =
          String(
            products
              .packslipReturnAddress ||
              ""
          ).trim();

        const profileAddress =
          String(
            business.address ||
              ""
          ).trim();

        setStoreName(
          String(
            business.name ||
              "Your Store"
          ).trim() ||
            "Your Store"
        );

        setSenderConfigured(
          (
            Boolean(
              products
                .packslipShowReturn
            ) &&
            Boolean(
              customAddress
            )
          ) ||
          Boolean(
            profileAddress
          )
        );
      } catch {
        if (
          !cancelled
        ) {
          setSenderConfigured(
            false
          );
        }
      }
    }

    void loadBrand();

    return () => {
      cancelled =
        true;
    };
  }, []);

  const readyCount =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            matchesFilter(
              order,
              "ready"
            ) &&
            eligible(order)
        ).length,
      [orders]
    );

  const filtered =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          if (
            !matchesFilter(
              order,
              filter
            )
          ) {
            return false;
          }

          if (
            !normalized
          ) {
            return true;
          }

          const searchable =
            [
              order.number,
              order.id,
              customerName(
                order
              ),
              order.billing
                ?.phone,
              order.billing
                ?.email,
              ...(order.line_items ||
                []).map(
                  (item) =>
                    item.name
                ),
              ...(order.line_items ||
                []).map(
                  (item) =>
                    item.sku
                ),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            normalized
          );
        }
      );
    }, [
      orders,
      query,
      filter,
    ]);

  const visibleEligibleIds =
    filtered
      .filter(
        eligible
      )
      .map(
        (order) =>
          order.id
      );

  const allVisibleSelected =
    visibleEligibleIds.length >
      0 &&
    visibleEligibleIds.every(
      (id) =>
        selected.has(id)
    );

  function toggleOne(
    order: WCOrder
  ) {
    if (
      !eligible(order)
    ) {
      return;
    }

    setSelected(
      (current) => {
        const next =
          new Set<number>(
            current
          );

        if (
          next.has(
            order.id
          )
        ) {
          next.delete(
            order.id
          );
        } else {
          next.add(
            order.id
          );
        }

        return next;
      }
    );
  }

  function toggleShown() {
    if (
      !visibleEligibleIds.length
    ) {
      return;
    }

    setSelected(
      (current) => {
        const next =
          new Set<number>(
            current
          );

        if (
          allVisibleSelected
        ) {
          visibleEligibleIds.forEach(
            (id) =>
              next.delete(
                id
              )
          );
        } else {
          visibleEligibleIds.forEach(
            (id) =>
              next.add(id)
          );
        }

        return next;
      }
    );
  }

  async function generatePdf() {
    if (
      !selected.size ||
      generating
    ) {
      return;
    }

    const ids =
      Array.from(
        selected
      );

    const feedbackId =
      "packslips-generate";

    setGenerating(
      true
    );

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Preparing packing slips…",
      message:
        `${ids.length} selected order${ids.length === 1 ? "" : "s"}`,
    });

    try {
      const module =
        await import(
          "../ui/PackingSlipPdfClient"
        );

      await module.default.generateForOrders(
        ids,
        storeName
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Packing slips ready",
        message:
          "PDF download started.",
        durationMs: 2800,
      });
    } catch (
      generateError
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Packing slip failed",
        message:
          generateError instanceof
          Error
            ? generateError.message
            : "The PDF could not be generated.",
        durationMs: 4200,
      });
    } finally {
      setGenerating(
        false
      );
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-[#E1E6F0] bg-white shadow-[0_8px_24px_rgba(38,51,95,0.05)]">
        <div className="bg-[#26366E] px-3 py-3 text-white md:px-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#18A6C9]">
              <Printer className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-indigo-100/70">
                Self shipping
              </div>

              <div className="mt-0.5 text-base font-extrabold">
                Packing Slips
              </div>
            </div>

            <div className="hidden rounded-xl bg-[#314784] px-3 py-2 text-right md:block">
              <div className="text-[9px] font-extrabold uppercase tracking-wide text-indigo-100/70">
                Print format
              </div>
              <div className="mt-0.5 text-xs font-extrabold">
                A4 · 2 per page
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#E8ECF3] border-b border-[#E8ECF3] bg-[#F8FAFD]">
          <div className="px-2 py-2.5 text-center">
            <div className="text-lg font-extrabold text-[#182451]">
              {readyCount}
            </div>
            <div className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
              Ready
            </div>
          </div>

          <div className="px-2 py-2.5 text-center">
            <div className="text-lg font-extrabold text-[#4059A7]">
              {selected.size}
            </div>
            <div className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
              Selected
            </div>
          </div>

          <Link
            href="/settings?tab=shippingDelivery"
            className="px-2 py-2.5 text-center"
          >
            <div
              className={[
                "mx-auto inline-flex min-h-6 items-center rounded-full px-2 text-[10px] font-extrabold",
                senderConfigured
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800",
              ].join(
                " "
              )}
            >
              {senderConfigured
                ? "Configured"
                : "Set up"}
            </div>

            <div className="mt-1 text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
              Sender
            </div>
          </Link>
        </div>

        <div className="space-y-3 p-3 md:p-4">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder="Search order, customer, phone, SKU"
                className="pl-10"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={loading}
              onClick={() =>
                void loadOrders()
              }
              aria-label="Refresh orders"
            >
              <RefreshCw
                className={[
                  "h-4 w-4",
                  loading
                    ? "animate-spin"
                    : "",
                ].join(
                  " "
                )}
              />
            </Button>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {FILTERS.map(
              (item) => (
                <button
                  key={
                    item.value
                  }
                  type="button"
                  onClick={() =>
                    setFilter(
                      item.value
                    )
                  }
                  className={[
                    "ls-focus-ring min-h-9 shrink-0 rounded-xl px-3 text-xs font-extrabold transition",
                    filter ===
                    item.value
                      ? "bg-[#18A6C9] text-white"
                      : "bg-[#EEF1FA] text-[#34405F]",
                  ].join(
                    " "
                  )}
                >
                  {item.label}
                </button>
              )
            )}
          </div>

          <div className="flex min-h-9 items-center justify-between gap-3">
            <label className="inline-flex min-h-9 items-center gap-2 text-xs font-bold text-muted-foreground">
              <input
                type="checkbox"
                checked={
                  allVisibleSelected
                }
                onChange={
                  toggleShown
                }
                disabled={
                  !visibleEligibleIds.length
                }
                className="h-4 w-4 rounded border-[#BFC7D8] accent-[#18A6C9]"
              />
              {allVisibleSelected
                ? "Clear shown"
                : "Select shown"}
            </label>

            <div className="text-xs font-semibold text-muted-foreground">
              {filtered.length} shown
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {!senderConfigured ? (
        <Link
          href="/settings?tab=shippingDelivery"
          className="mt-3 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-900"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100">
            <Settings2 className="h-4 w-4" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold">
              Add packing slip sender address
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-amber-800/75">
              The PDF uses the sender / return address configured in Shipping & Delivery.
            </span>
          </span>
        </Link>
      ) : null}

      {loading ? (
        <div className="mt-3 space-y-2.5 md:mt-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : filtered.length ===
        0 ? (
        <div className="mt-3 md:mt-4">
          <EmptyState
            icon={
              ShoppingBag
            }
            title="No orders found"
            description="Try another search or status filter."
          />
        </div>
      ) : (
        <div className="mt-3 md:mt-4">
          <div className="space-y-2.5 md:hidden">
            {filtered.map(
              (order) => {
                const active =
                  selected.has(
                    order.id
                  );
                const canSelect =
                  eligible(order);

                return (
                  <article
                    key={
                      order.id
                    }
                    className={[
                      "rounded-2xl border bg-white p-3 shadow-[0_6px_18px_rgba(38,51,95,0.05)]",
                      active
                        ? "border-[#18A6C9] ring-2 ring-[#18A6C9]/10"
                        : "border-[#E1E6F0]",
                      canSelect
                        ? ""
                        : "opacity-70",
                    ].join(
                      " "
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={active}
                        disabled={!canSelect}
                        onChange={() =>
                          toggleOne(
                            order
                          )
                        }
                        aria-label={`Select order #${order.number || order.id}`}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-[#BFC7D8] accent-[#18A6C9]"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-[#182451]">
                              Order #
                              {order.number ||
                                order.id}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-muted-foreground">
                              {customerName(
                                order
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-sm font-extrabold text-[#182451]">
                            {formatMoney(
                              order
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span
                            className={[
                              "rounded-full px-2 py-1 text-[9px] font-extrabold",
                              statusClass(
                                order.status
                              ),
                            ].join(
                              " "
                            )}
                          >
                            {statusLabel(
                              order.status
                            )}
                          </span>

                          <span className="rounded-full bg-[#EEF1FA] px-2 py-1 text-[9px] font-extrabold text-[#4059A7]">
                            {itemCount(
                              order
                            )}{" "}
                            item
                            {itemCount(
                              order
                            ) === 1
                              ? ""
                              : "s"}
                          </span>

                          <span className="rounded-full bg-[#F4F6FB] px-2 py-1 text-[9px] font-bold text-muted-foreground">
                            {formatDate(
                              order.date_created_gmt
                            )}
                          </span>
                        </div>

                        {!canSelect ? (
                          <div className="mt-2 text-[10px] font-extrabold text-rose-600">
                            Packing slip disabled for this order status.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[#E1E6F0] bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F6FB] text-left text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-14 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={
                        allVisibleSelected
                      }
                      onChange={
                        toggleShown
                      }
                      aria-label="Select shown orders"
                      className="h-4 w-4 rounded border-[#BFC7D8] accent-[#18A6C9]"
                    />
                  </th>
                  <th className="px-3 py-3">
                    Order
                  </th>
                  <th className="px-3 py-3">
                    Customer
                  </th>
                  <th className="px-3 py-3">
                    Items
                  </th>
                  <th className="px-3 py-3">
                    Status
                  </th>
                  <th className="px-3 py-3">
                    Total
                  </th>
                  <th className="px-3 py-3">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E9ECF3]">
                {filtered.map(
                  (order) => {
                    const active =
                      selected.has(
                        order.id
                      );
                    const canSelect =
                      eligible(order);

                    return (
                      <tr
                        key={
                          order.id
                        }
                        className={
                          canSelect
                            ? ""
                            : "bg-slate-50/70 text-slate-400"
                        }
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={
                              active
                            }
                            disabled={
                              !canSelect
                            }
                            onChange={() =>
                              toggleOne(
                                order
                              )
                            }
                            aria-label={`Select order #${order.number || order.id}`}
                            className="h-4 w-4 rounded border-[#BFC7D8] accent-[#18A6C9]"
                          />
                        </td>

                        <td className="px-3 py-3 font-extrabold text-[#182451]">
                          #
                          {order.number ||
                            order.id}
                        </td>

                        <td className="px-3 py-3">
                          <div className="font-bold text-foreground">
                            {customerName(
                              order
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {order.billing
                              ?.phone ||
                              "—"}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-muted-foreground">
                          {itemCount(
                            order
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-1 text-[10px] font-extrabold",
                              statusClass(
                                order.status
                              ),
                            ].join(
                              " "
                            )}
                          >
                            {statusLabel(
                              order.status
                            )}
                          </span>
                        </td>

                        <td className="px-3 py-3 font-bold text-[#182451]">
                          {formatMoney(
                            order
                          )}
                        </td>

                        <td className="px-3 py-3 text-muted-foreground">
                          {formatDate(
                            order.date_created_gmt
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected.size >
      0 ? (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+var(--ls-safe-area-bottom))] z-50 border-t border-[#D8DEEA] bg-white/95 px-3 py-2.5 shadow-[0_-10px_30px_rgba(17,27,63,0.12)] backdrop-blur md:static md:mt-4 md:rounded-2xl md:border md:px-4 md:shadow-none">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-[#182451]">
                {selected.size}{" "}
                selected
              </div>
              <div className="hidden text-xs text-muted-foreground md:block">
                PDF format: A4 portrait · two packing slips per page.
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={generating}
                onClick={() =>
                  setSelected(
                    new Set<number>()
                  )
                }
              >
                Clear
              </Button>

              <AsyncButton
                size="sm"
                loading={generating}
                loadingLabel="Preparing…"
                onClick={
                  generatePdf
                }
                className="bg-[#18A6C9] text-white hover:bg-[#1283A1]"
              >
                <FileDown className="h-4 w-4" />
                Generate PDF
              </AsyncButton>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 hidden items-center gap-2 rounded-2xl bg-[#EEF1FA] px-4 py-3 text-xs text-[#4059A7] md:flex">
        <PackageCheck className="h-4 w-4 shrink-0" />
        Select orders, generate the PDF, then print it from your device. Two packing slips are laid out on each A4 page.
      </div>
    </>
  );
}
