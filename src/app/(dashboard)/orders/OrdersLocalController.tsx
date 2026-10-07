"use client";

import {
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import OrdersClient from "./OrdersClient";

import {
  BottomSheet,
} from "@/components/ui/bottom-sheet";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  STATUS_LABEL,
  type WCOrder,
} from "@/lib/order-utils";

type Category = {
  id: number;
  name: string;
  parent: number;
};

const canon = (
  value?: string
) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z-]/g,
      ""
    );

function withinRange(
  dateGmt?: string,
  from?: string,
  to?: string
) {
  if (!dateGmt) {
    return true;
  }

  const timestamp =
    Date.parse(
      dateGmt.endsWith(
        "Z"
      )
        ? dateGmt
        : `${dateGmt}Z`
    );

  if (
    Number.isNaN(
      timestamp
    )
  ) {
    return false;
  }

  if (from) {
    const start =
      Date.parse(
        `${from}T00:00:00Z`
      );

    if (
      timestamp <
      start
    ) {
      return false;
    }
  }

  if (to) {
    const end =
      Date.parse(
        `${to}T23:59:59Z`
      );

    if (
      timestamp >
      end
    ) {
      return false;
    }
  }

  return true;
}

const STATUS_TABS = [
  {
    key: "all",
    label: "All",
  },
  {
    key:
      "processing",
    label:
      STATUS_LABEL[
        "processing"
      ] ||
      "Processing",
  },
  {
    key:
      "on-hold",
    label:
      STATUS_LABEL[
        "on-hold"
      ] ||
      "On hold",
  },
  {
    key:
      "pending",
    label:
      STATUS_LABEL[
        "pending"
      ] ||
      "Pending",
  },
  {
    key:
      "completed",
    label:
      STATUS_LABEL[
        "completed"
      ] ||
      "Completed",
  },
  {
    key:
      "cancelled",
    label:
      STATUS_LABEL[
        "cancelled"
      ] ||
      "Cancelled",
  },
  {
    key: "trash",
    label: "Trash",
  },
] as const;

export default function OrdersLocalController({
  initial,
  categories = [],
  storeName = "Your Store",
}: {
  initial: WCOrder[];
  categories?: Category[];
  storeName?: string;
}) {
  const [
    status,
    setStatus,
  ] =
    useState<string>(
      "all"
    );
  const [
    search,
    setSearch,
  ] =
    useState("");
  const deferredSearch =
    useDeferredValue(
      search
    );

  const [
    filtersOpen,
    setFiltersOpen,
  ] =
    useState(false);
  const [
    draftFrom,
    setDraftFrom,
  ] =
    useState("");
  const [
    draftTo,
    setDraftTo,
  ] =
    useState("");
  const [
    from,
    setFrom,
  ] =
    useState("");
  const [
    to,
    setTo,
  ] =
    useState("");

  const statusCounts =
    useMemo(() => {
      const map:
        Record<
          string,
          number
        > = {};
      let nonTrashTotal =
        0;

      for (
        const order of
        initial
      ) {
        const nextStatus =
          canon(
            order.status
          ) ||
          "pending";

        map[nextStatus] =
          (map[
            nextStatus
          ] ||
            0) +
          1;

        if (
          nextStatus !==
          "trash"
        ) {
          nonTrashTotal +=
            1;
        }
      }

      map.all =
        nonTrashTotal;

      return map;
    }, [initial]);

  const filtered =
    useMemo(() => {
      let rows =
        initial;

      if (
        status ===
        "all"
      ) {
        rows =
          rows.filter(
            (
              order
            ) =>
              canon(
                order.status
              ) !==
              "trash"
          );
      } else {
        const wanted =
          canon(status);

        rows =
          rows.filter(
            (
              order
            ) =>
              canon(
                order.status
              ) ===
              wanted
          );
      }

      if (
        from ||
        to
      ) {
        rows =
          rows.filter(
            (
              order
            ) =>
              withinRange(
                order.date_created_gmt,
                from,
                to
              )
          );
      }

      const query =
        deferredSearch
          .trim()
          .toLowerCase();

      if (query) {
        rows =
          rows.filter(
            (
              order
            ) => {
              const id =
                String(
                  order.id ||
                    ""
                );
              const number =
                String(
                  order.number ||
                    id
                ).toLowerCase();
              const name =
                `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`
                  .trim()
                  .toLowerCase();
              const email =
                (
                  order.billing?.email ||
                  ""
                ).toLowerCase();
              const phone =
                (
                  order.billing?.phone ||
                  ""
                ).toLowerCase();

              if (
                id ===
                  query ||
                number.includes(
                  query
                ) ||
                name.includes(
                  query
                ) ||
                email.includes(
                  query
                ) ||
                phone.includes(
                  query
                )
              ) {
                return true;
              }

              return (
                order.line_items ||
                []
              ).some(
                (
                  item
                ) =>
                  (
                    item.sku ||
                    ""
                  )
                    .toLowerCase()
                    .includes(
                      query
                    ) ||
                  (
                    item.name ||
                    ""
                  )
                    .toLowerCase()
                    .includes(
                      query
                    )
              );
            }
          );
      }

      return rows;
    }, [
      initial,
      status,
      from,
      to,
      deferredSearch,
    ]);

  const hasDateFilters =
    Boolean(
      from ||
      to
    );
  const hasSearch =
    Boolean(
      search.trim()
    );
  const activeFilterCount =
    Number(
      Boolean(from)
    ) +
    Number(
      Boolean(to)
    );

  function clearAllFilters() {
    setSearch("");
    setDraftFrom("");
    setDraftTo("");
    setFrom("");
    setTo("");
  }

  function openFilters() {
    setDraftFrom(
      from
    );
    setDraftTo(to);
    setFiltersOpen(
      true
    );
  }

  function applyFilters() {
    if (
      draftFrom &&
      draftTo &&
      draftFrom >
        draftTo
    ) {
      return;
    }

    setFrom(
      draftFrom
    );
    setTo(draftTo);
    setFiltersOpen(
      false
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <section
        aria-label="Order status"
      >
        <label className="block md:hidden">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Order status
          </span>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.currentTarget.value
              )
            }
            className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-bold text-heading shadow-[0_1px_2px_rgba(25,35,75,0.03)]"
          >
            {STATUS_TABS.map(
              (tab) => (
                <option
                  key={tab.key}
                  value={tab.key}
                >
                  {tab.label} ({statusCounts[tab.key] || 0})
                </option>
              )
            )}
          </select>
        </label>

        <div className="hidden flex-wrap gap-2 md:flex">
          {STATUS_TABS.map(
            (tab) => {
              const active =
                status ===
                tab.key;
              const count =
                statusCounts[
                  tab.key
                ] || 0;

              return (
                <button
                  key={
                    tab.key
                  }
                  type="button"
                  aria-pressed={
                    active
                  }
                  onClick={() =>
                    setStatus(
                      tab.key
                    )
                  }
                  className={[
                    "ls-focus-ring inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-heading",
                  ].join(
                    " "
                  )}
                >
                  <span>
                    {
                      tab.label
                    }
                  </span>

                  <span
                    className={[
                      "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
                      active
                        ? "bg-white/15 text-white"
                        : "bg-muted text-muted-foreground",
                    ].join(
                      " "
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-2.5 md:rounded-2xl md:p-3">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="search"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event
                    .currentTarget
                    .value
                )
              }
              placeholder="Search order, customer, phone, SKU..."
              className="pl-9"
            />
          </div>

          <Button
            variant={
              hasDateFilters
                ? "secondary"
                : "outline"
            }
            size="icon"
            aria-label="Filter orders"
            onClick={
              openFilters
            }
            className="relative"
          >
            <SlidersHorizontal className="h-4 w-4" />

            {activeFilterCount >
            0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground ring-2 ring-card">
                {
                  activeFilterCount
                }
              </span>
            ) : null}
          </Button>

          {hasSearch ||
          hasDateFilters ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear search and date filters"
              onClick={
                clearAllFilters
              }
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-muted-foreground">
          <span>
            {
              filtered.length
            }{" "}
            result
            {filtered.length ===
            1
              ? ""
              : "s"}
          </span>

          {hasDateFilters ? (
            <span className="truncate font-semibold text-foreground">
              {from ||
                "Any"}{" "}
              →{" "}
              {to ||
                "Any"}
            </span>
          ) : (
            <span className="hidden sm:inline">
              Search updates instantly
            </span>
          )}
        </div>
      </section>

      <OrdersClient
        orders={
          filtered
        }
        categories={
          categories
        }
        storeName={
          storeName
        }
      />

      <BottomSheet
        open={
          filtersOpen
        }
        onOpenChange={
          setFiltersOpen
        }
        title="Filter orders"
        description="Narrow the order list by created date."
        popupClassName="md:mx-auto md:max-w-lg"
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-bold text-heading">
              From
            </span>
            <Input
              type="date"
              value={
                draftFrom
              }
              onChange={(
                event
              ) =>
                setDraftFrom(
                  event
                    .currentTarget
                    .value
                )
              }
            />
          </label>

          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-bold text-heading">
              To
            </span>
            <Input
              type="date"
              value={
                draftTo
              }
              onChange={(
                event
              ) =>
                setDraftTo(
                  event
                    .currentTarget
                    .value
                )
              }
            />
          </label>
        </div>

        {draftFrom &&
        draftTo &&
        draftFrom >
          draftTo ? (
          <p className="mt-2 text-xs font-semibold text-destructive">
            Start date cannot be after end date.
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setDraftFrom("");
              setDraftTo("");
            }}
          >
            Clear dates
          </Button>

          <Button
            onClick={
              applyFilters
            }
            disabled={
              Boolean(
                draftFrom &&
                  draftTo &&
                  draftFrom >
                    draftTo
              )
            }
          >
            Apply filters
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
