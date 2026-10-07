"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Search,
} from "lucide-react";

import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  BottomSheet,
} from "@/components/ui/bottom-sheet";
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
  PageHeader,
} from "@/components/ui/page-header";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  StatusBadge,
} from "@/components/ui/status-badge";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

import InvoicePdfClient from "../orders/ui/InvoicePdfClient";

type OrderRow = {
  id: number;
  number: string;
  date_created: string;
  status: string;
  payment_method_title?: string;
  total: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  line_items?: Array<{
    id: number;
    name: string;
    quantity: number;
    total: string;
    subtotal: string;
    price: number;
  }>;
};

function formatDateTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      date: "-",
      time: "-",
    };
  }

  return {
    date:
      date.toLocaleDateString(
        "en-IN",
        {
          day:
            "2-digit",
          month:
            "short",
          year:
            "numeric",
        }
      ),
    time:
      date.toLocaleTimeString(
        "en-IN",
        {
          hour:
            "2-digit",
          minute:
            "2-digit",
        }
      ),
  };
}

function buildCustomerName(
  order: OrderRow
) {
  const name =
    (
      order.billing
        ?.first_name ||
      order.billing
        ?.last_name
        ? `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim()
        : ""
    ) || "";

  return (
    name ||
    order.billing
      ?.email ||
    "-"
  );
}

function buildItemsText(
  order: OrderRow
) {
  return (
    order.line_items ||
    []
  )
    .map(
      (item) =>
        `${item.name}${item.quantity ? ` × ${item.quantity}` : ""}`
    )
    .join(", ");
}

export default function OrderInvoicesPage() {
  const [
    allOrders,
    setAllOrders,
  ] =
    useState<
      OrderRow[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    generating,
    setGenerating,
  ] =
    useState(false);

  const [
    filterOpen,
    setFilterOpen,
  ] =
    useState(false);

  const [
    status,
    setStatus,
  ] =
    useState("all");

  const [
    search,
    setSearch,
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

  const [
    selected,
    setSelected,
  ] =
    useState<
      Record<
        number,
        boolean
      >
    >({});

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    perPage,
    setPerPage,
  ] =
    useState(25);

  const selectedIds =
    useMemo(
      () =>
        Object.entries(
          selected
        )
          .filter(
            (
              [
                ,
                value,
              ]
            ) =>
              value
          )
          .map(
            (
              [
                key,
              ]
            ) =>
              Number(
                key
              )
          ),
      [selected]
    );

  async function fetchOrders() {
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/orders/all",
          {
            cache:
              "no-store",
          }
        );

      const json =
        await response.json();

      const list =
        Array.isArray(
          json?.data
        )
          ? json.data
          : json;

      setAllOrders(
        list || []
      );

      setPage(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchOrders();
  }, []);

  const filteredOrders =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      const fromDate =
        from
          ? new Date(
              `${from}T00:00:00`
            )
          : null;

      const toDate =
        to
          ? new Date(
              `${to}T23:59:59`
            )
          : null;

      return allOrders.filter(
        (
          order
        ) => {
          if (
            status !==
              "all" &&
            order.status !==
              status
          ) {
            return false;
          }

          if (
            fromDate ||
            toDate
          ) {
            const orderDate =
              new Date(
                order.date_created
              );

            if (
              fromDate &&
              orderDate <
                fromDate
            ) {
              return false;
            }

            if (
              toDate &&
              orderDate >
                toDate
            ) {
              return false;
            }
          }

          if (term) {
            const haystack =
              [
                String(
                  order.number ||
                    ""
                ),
                String(
                  order.id
                ),
                buildCustomerName(
                  order
                ),
                order.billing
                  ?.email ||
                  "",
                order.payment_method_title ||
                  "",
                buildItemsText(
                  order
                ),
              ]
                .join(" ")
                .toLowerCase();

            if (
              !haystack.includes(
                term
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      allOrders,
      status,
      search,
      from,
      to,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredOrders.length /
          (
            perPage ||
            1
          )
      )
    );

  useEffect(() => {
    setPage(
      (
        current
      ) => {
        if (
          current <
          1
        ) {
          return 1;
        }

        if (
          current >
          totalPages
        ) {
          return totalPages;
        }

        return current;
      }
    );
  }, [
    totalPages,
  ]);

  const paginatedOrders =
    useMemo(() => {
      const start =
        (
          page -
          1
        ) *
        perPage;

      return filteredOrders.slice(
        start,
        start +
          perPage
      );
    }, [
      filteredOrders,
      page,
      perPage,
    ]);

  const firstRow =
    filteredOrders.length ===
    0
      ? 0
      : (
          page -
          1
        ) *
          perPage +
        1;

  const lastRow =
    filteredOrders.length ===
    0
      ? 0
      : Math.min(
          page *
            perPage,
          filteredOrders.length
        );

  const allPageSelected =
    paginatedOrders.length >
      0 &&
    paginatedOrders.every(
      (
        order
      ) =>
        selected[
          order.id
        ]
    );

  const activeFilterCount =
    [
      status !==
      "all"
        ? status
        : "",
      search,
      from,
      to,
    ].filter(Boolean)
      .length;

  function toggleAll(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const checked =
      event.target
        .checked;

    const next = {
      ...selected,
    };

    paginatedOrders.forEach(
      (
        order
      ) => {
        next[
          order.id
        ] =
          checked;
      }
    );

    setSelected(
      next
    );
  }

  function toggleOne(
    id: number,
    value: boolean
  ) {
    setSelected(
      (
        current
      ) => ({
        ...current,
        [id]: value,
      })
    );
  }

  async function createInvoices(
    ids =
      selectedIds
  ) {
    if (
      ids.length ===
      0 ||
      generating
    ) {
      return;
    }

    setGenerating(
      true
    );

    actionFeedback.loading({
      id:
        "order-invoice-generate",
      title:
        ids.length ===
        1
          ? "Creating invoice…"
          : `Creating ${ids.length} invoices…`,
    });

    try {
      await InvoicePdfClient.generateForOrders(
        ids
      );

      actionFeedback.success({
        id:
          "order-invoice-generate",
        title:
          ids.length ===
          1
            ? "Invoice created"
            : "Invoices created",
        durationMs:
          2200,
      });
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id:
          "order-invoice-generate",
        title:
          "Could not create invoice PDF",
        message:
          error instanceof
            Error
            ? error.message
            : "Please try again.",
        durationMs:
          4200,
      });
    } finally {
      setGenerating(
        false
      );
    }
  }

  function clearFilters() {
    setStatus(
      "all"
    );
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
    setFilterOpen(
      false
    );
  }

  function FilterFields() {
    return (
      <>
        <select
          value={
            status
          }
          onChange={(
            event
          ) => {
            setStatus(
              event.target
                .value
            );
            setPage(1);
          }}
          className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground"
        >
          <option value="all">
            All statuses
          </option>
          <option value="processing">
            Processing
          </option>
          <option value="completed">
            Completed
          </option>
          <option value="cancelled">
            Cancelled
          </option>
          <option value="refunded">
            Refunded
          </option>
          <option value="on-hold">
            On hold
          </option>
          <option value="pending">
            Pending payment
          </option>
        </select>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />

          <Input
            className="pl-9"
            placeholder="Order, customer, email, SKU or product"
            value={search}
            onChange={(
              event
            ) => {
              setSearch(
                event.target
                  .value
              );
              setPage(
                1
              );
            }}
          />
        </div>

        <Input
          type="date"
          value={from}
          onChange={(
            event
          ) => {
            setFrom(
              event.target
                .value
            );
            setPage(1);
          }}
        />

        <Input
          type="date"
          value={to}
          onChange={(
            event
          ) => {
            setTo(
              event.target
                .value
            );
            setPage(1);
          }}
        />
      </>
    );
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
      <PageHeader
        className="hidden md:flex"
        eyebrow="Reports & Billing"
        icon={FileText}
        title="Order Invoices"
        description="Find customer orders and generate single or bulk PDF invoices."
        actions={
          <Link
            href="/orders"
            className="ls-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
          >
            View Orders
          </Link>
        }
      />

      <div className="space-y-4 md:mt-5">
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              setFilterOpen(
                true
              )
            }
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount ? (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {
                  activeFilterCount
                }
              </span>
            ) : null}
          </Button>

          <AsyncButton
            type="button"
            size="sm"
            loading={
              generating
            }
            loadingLabel="Creating…"
            disabled={
              selectedIds.length ===
              0
            }
            onClick={() =>
              void createInvoices()
            }
          >
            <Download className="h-3.5 w-3.5" />
            {selectedIds.length >
            0
              ? `PDF (${selectedIds.length})`
              : "PDF"}
          </AsyncButton>
        </div>

        <section className="hidden rounded-2xl border border-border bg-card p-3 md:block">
          <div className="grid gap-3 xl:grid-cols-[0.8fr_1.5fr_0.8fr_0.8fr_auto]">
            <FilterFields />

            <Button
              type="button"
              variant="outline"
              onClick={
                clearFilters
              }
            >
              Clear
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 md:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-extrabold text-heading md:text-base">
                Invoice Orders
              </h2>

              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
                {
                  filteredOrders.length
                }
              </span>
            </div>

            <AsyncButton
              type="button"
              size="sm"
              className="hidden md:inline-flex"
              loading={
                generating
              }
              loadingLabel="Creating…"
              disabled={
                selectedIds.length ===
                0
              }
              onClick={() =>
                void createInvoices()
              }
            >
              <Download className="h-3.5 w-3.5" />
              Create PDF
              {selectedIds.length >
              0
                ? ` (${selectedIds.length})`
                : ""}
            </AsyncButton>
          </div>

          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({
                length: 6,
              }).map(
                (
                  _,
                  index
                ) => (
                  <Skeleton
                    key={
                      index
                    }
                    className="h-20 rounded-xl"
                  />
                )
              )}
            </div>
          ) : paginatedOrders.length ===
            0 ? (
            <EmptyState
              icon={FileText}
              title="No orders found"
              description="Change the filters or check again after new orders arrive."
            />
          ) : (
            <>
              <div className="divide-y divide-border md:hidden">
                {paginatedOrders.map(
                  (
                    order
                  ) => {
                    const date =
                      formatDateTime(
                        order.date_created
                      );

                    const customerName =
                      buildCustomerName(
                        order
                      );

                    const items =
                      buildItemsText(
                        order
                      );

                    const checked =
                      Boolean(
                        selected[
                          order.id
                        ]
                      );

                    return (
                      <article
                        key={
                          order.id
                        }
                        className="p-3"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={
                              checked
                            }
                            onChange={(
                              event
                            ) =>
                              toggleOne(
                                order.id,
                                event.target
                                  .checked
                              )
                            }
                            aria-label={`Select order ${order.number || order.id}`}
                            className="mt-1 h-4 w-4 rounded border-input"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <Link
                                  href={`/orders/${order.id}`}
                                  className="text-sm font-extrabold text-primary"
                                >
                                  #
                                  {order.number ||
                                    order.id}
                                </Link>

                                <div className="mt-0.5 truncate text-sm font-semibold text-heading">
                                  {
                                    customerName
                                  }
                                </div>

                                <div className="mt-0.5 text-[11px] text-muted-foreground">
                                  {
                                    date.date
                                  }{" "}
                                  ·{" "}
                                  {
                                    date.time
                                  }
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                <div className="text-sm font-extrabold text-heading">
                                  ₹
                                  {Number(
                                    order.total ||
                                      0
                                  ).toLocaleString(
                                    "en-IN",
                                    {
                                      minimumFractionDigits:
                                        2,
                                      maximumFractionDigits:
                                        2,
                                    }
                                  )}
                                </div>

                                <div className="mt-1">
                                  <StatusBadge
                                    status={
                                      order.status
                                    }
                                    label={order.status
                                      .replace(
                                        /[-_]+/g,
                                        " "
                                      )
                                      .replace(
                                        /\b\w/g,
                                        (
                                          character
                                        ) =>
                                          character.toUpperCase()
                                      )}
                                  />
                                </div>
                              </div>
                            </div>

                            {items ? (
                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                {
                                  items
                                }
                              </p>
                            ) : null}

                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <span className="truncate text-[11px] font-semibold text-muted-foreground">
                                {order.payment_method_title ||
                                  "Payment method unavailable"}
                              </span>

                              <AsyncButton
                                type="button"
                                variant="outline"
                                size="sm"
                                loading={
                                  generating
                                }
                                loadingLabel="Creating…"
                                onClick={() =>
                                  void createInvoices(
                                    [
                                      order.id,
                                    ]
                                  )
                                }
                              >
                                PDF
                              </AsyncButton>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="bg-surface-soft text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={
                            allPageSelected
                          }
                          onChange={
                            toggleAll
                          }
                          aria-label="Select all orders on page"
                        />
                      </th>
                      <th className="px-4 py-3 text-left">
                        Order
                      </th>
                      <th className="px-4 py-3 text-left">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left">
                        Payment
                      </th>
                      <th className="px-4 py-3 text-right">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedOrders.map(
                      (
                        order
                      ) => {
                        const date =
                          formatDateTime(
                            order.date_created
                          );

                        return (
                          <tr
                            key={
                              order.id
                            }
                            className="border-t border-border hover:bg-muted/40"
                          >
                            <td className="px-4 py-3.5">
                              <input
                                type="checkbox"
                                checked={Boolean(
                                  selected[
                                    order.id
                                  ]
                                )}
                                onChange={(
                                  event
                                ) =>
                                  toggleOne(
                                    order.id,
                                    event.target
                                      .checked
                                  )
                                }
                                aria-label={`Select order ${order.number || order.id}`}
                              />
                            </td>

                            <td className="px-4 py-3.5">
                              <Link
                                href={`/orders/${order.id}`}
                                className="font-bold text-primary hover:underline"
                              >
                                #
                                {order.number ||
                                  order.id}
                              </Link>
                            </td>

                            <td className="px-4 py-3.5 font-semibold text-heading">
                              {buildCustomerName(
                                order
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              <StatusBadge
                                status={
                                  order.status
                                }
                                label={order.status
                                  .replace(
                                    /[-_]+/g,
                                    " "
                                  )
                                  .replace(
                                    /\b\w/g,
                                    (
                                      character
                                    ) =>
                                      character.toUpperCase()
                                  )}
                              />
                            </td>

                            <td className="px-4 py-3.5 text-foreground">
                              {order.payment_method_title ||
                                "—"}
                            </td>

                            <td className="px-4 py-3.5 text-right font-extrabold text-heading">
                              ₹
                              {Number(
                                order.total ||
                                  0
                              ).toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits:
                                    2,
                                  maximumFractionDigits:
                                    2,
                                }
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground">
                              {
                                date.date
                              }
                              <div className="mt-0.5 text-[11px]">
                                {
                                  date.time
                                }
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              <AsyncButton
                                type="button"
                                variant="outline"
                                size="sm"
                                loading={
                                  generating
                                }
                                loadingLabel="Creating…"
                                onClick={() =>
                                  void createInvoices(
                                    [
                                      order.id,
                                    ]
                                  )
                                }
                              >
                                Create PDF
                              </AsyncButton>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!loading &&
          filteredOrders.length >
            0 ? (
            <div className="flex flex-col gap-3 border-t border-border px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-4">
              <div>
                Showing{" "}
                <span className="font-bold text-foreground">
                  {
                    firstRow
                  }
                </span>
                –
                <span className="font-bold text-foreground">
                  {
                    lastRow
                  }
                </span>{" "}
                of{" "}
                <span className="font-bold text-foreground">
                  {
                    filteredOrders.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <label className="flex items-center gap-2">
                  Rows
                  <select
                    value={
                      perPage
                    }
                    onChange={(
                      event
                    ) => {
                      setPerPage(
                        Number(
                          event.target
                            .value
                        ) ||
                          25
                      );
                      setPage(
                        1
                      );
                    }}
                    className="ls-focus-ring h-9 rounded-lg border border-input bg-card px-2 text-xs font-semibold text-foreground"
                  >
                    <option value={10}>
                      10
                    </option>
                    <option value={25}>
                      25
                    </option>
                    <option value={50}>
                      50
                    </option>
                    <option value={100}>
                      100
                    </option>
                  </select>
                </label>

                <div className="grid grid-cols-[40px_auto_40px] items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Previous page"
                    disabled={
                      page <=
                      1
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.max(
                            1,
                            current -
                              1
                          )
                      )
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <span className="rounded-lg bg-surface-soft px-3 py-2 font-bold text-foreground">
                    {page} /{" "}
                    {
                      totalPages
                    }
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Next page"
                    disabled={
                      page >=
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.min(
                            totalPages,
                            current +
                              1
                          )
                      )
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <BottomSheet
        open={
          filterOpen
        }
        onOpenChange={
          setFilterOpen
        }
        title="Invoice filters"
        description="Find orders by status, customer, product or date."
        popupClassName="md:mx-auto md:max-w-lg"
      >
        <div className="space-y-3">
          <FilterFields />

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={
                clearFilters
              }
            >
              Clear
            </Button>

            <Button
              type="button"
              onClick={() =>
                setFilterOpen(
                  false
                )
              }
            >
              Apply
            </Button>
          </div>
        </div>
      </BottomSheet>
    </main>
  );
}
