"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Filter,
  RefreshCcw,
  Search,
  WalletCards,
} from "lucide-react";

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
  Skeleton,
} from "@/components/ui/skeleton";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/ui/status-badge";
import type {
  CurrencyTotal,
  PayGlocalLivePayment,
  PaymentLedgerMethodFilter,
  PaymentLedgerResponse,
  PaymentLedgerRow,
} from "@/types/payment-ledger";

type Filters = {
  search: string;
  method:
    PaymentLedgerMethodFilter;
  from: string;
  to: string;
};

type LiveState = {
  loading: boolean;
  error: string;
  payment:
    PayGlocalLivePayment | null;
};

type LivePayload = {
  ok: true;
  order: {
    orderId: number;
  };
  payment:
    PayGlocalLivePayment;
};

const METHOD_OPTIONS: Array<{
  value:
    PaymentLedgerMethodFilter;
  label: string;
}> = [
  {
    value: "all",
    label: "All methods",
  },
  {
    value: "payglocal",
    label: "PayGlocal",
  },
  {
    value: "manual_upi",
    label: "Manual UPI",
  },
  {
    value:
      "bank_transfer",
    label: "Bank Transfer",
  },
  {
    value: "cod",
    label:
      "Cash on Delivery",
  },
  {
    value: "other",
    label: "Other",
  },
];

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
  );
}

function formatMoney(
  amount:
    | string
    | number,
  currency = "INR"
): string {
  const numeric =
    Number(amount);

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency:
          String(
            currency ||
              "INR"
          ).toUpperCase(),
        minimumFractionDigits:
          2,
      }
    ).format(numeric);
  } catch {
    return `${String(
      currency || "INR"
    ).toUpperCase()} ${numeric.toFixed(
      2
    )}`;
  }
}

function formatTotals(
  items: CurrencyTotal[]
): string {
  return items.length
    ? items
        .map(
          (item) =>
            formatMoney(
              item.amount,
              item.currency
            )
        )
        .join(" · ")
    : formatMoney(
        0,
        "INR"
      );
}

function formatDate(
  value: string
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value.endsWith("Z")
        ? value
        : `${value}Z`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function friendlyWooStatus(
  value: string
): string {
  const status =
    String(value || "")
      .trim()
      .toLowerCase();

  const labels:
    Record<
      string,
      string
    > = {
    pending:
      "Pending payment",
    processing:
      "Processing",
    "on-hold":
      "On hold",
    completed:
      "Completed",
    cancelled:
      "Cancelled",
    refunded:
      "Refunded",
    failed: "Failed",
    trash: "Trash",
  };

  return (
    labels[status] ||
    status.replace(
      /[-_]+/g,
      " "
    ) ||
    "—"
  );
}

function toneForPayment(
  label: string
): StatusTone {
  const value =
    label.toLowerCase();

  if (
    value.includes(
      "successful"
    ) ||
    value === "verified" ||
    value === "paid" ||
    value.includes(
      "paid in woocommerce"
    )
  ) {
    return "success";
  }

  if (
    value.includes(
      "declined"
    ) ||
    value.includes(
      "failed"
    ) ||
    value.includes(
      "cancelled"
    ) ||
    value.includes(
      "not paid"
    ) ||
    value.includes(
      "error"
    ) ||
    value.includes(
      "timed out"
    )
  ) {
    return "danger";
  }

  if (
    value.includes(
      "pending"
    ) ||
    value.includes(
      "progress"
    ) ||
    value.includes(
      "started"
    ) ||
    value.includes(
      "review"
    ) ||
    value.includes(
      "authorised"
    ) ||
    value.includes(
      "checking"
    )
  ) {
    return "warning";
  }

  return "neutral";
}

function FilterFields({
  draftSearch,
  setDraftSearch,
  draftMethod,
  setDraftMethod,
  draftFrom,
  setDraftFrom,
  draftTo,
  setDraftTo,
}: {
  draftSearch: string;
  setDraftSearch:
    (value: string) =>
      void;
  draftMethod:
    PaymentLedgerMethodFilter;
  setDraftMethod:
    (
      value:
        PaymentLedgerMethodFilter
    ) => void;
  draftFrom: string;
  setDraftFrom:
    (value: string) =>
      void;
  draftTo: string;
  setDraftTo:
    (value: string) =>
      void;
}) {
  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          className="pl-9"
          value={
            draftSearch
          }
          onChange={(
            event
          ) =>
            setDraftSearch(
              event.currentTarget
                .value
            )
          }
          placeholder="Order, customer, UTR, GID"
        />
      </div>

      <select
        value={
          draftMethod
        }
        onChange={(
          event
        ) =>
          setDraftMethod(
            event
              .currentTarget
              .value as
              PaymentLedgerMethodFilter
          )
        }
        className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground"
      >
        {METHOD_OPTIONS.map(
          (option) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {
                option.label
              }
            </option>
          )
        )}
      </select>

      <Input
        type="date"
        value={
          draftFrom
        }
        onChange={(
          event
        ) =>
          setDraftFrom(
            event.currentTarget
              .value
          )
        }
        aria-label="Start date"
      />

      <Input
        type="date"
        value={
          draftTo
        }
        onChange={(
          event
        ) =>
          setDraftTo(
            event.currentTarget
              .value
          )
        }
        aria-label="End date"
      />
    </>
  );
}

export default function PaymentsLedgerClient() {
  const [
    data,
    setData,
  ] =
    useState<PaymentLedgerResponse | null>(
      null
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
    useState("");

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

  const [
    filterOpen,
    setFilterOpen,
  ] =
    useState(false);

  const [
    refreshNonce,
    setRefreshNonce,
  ] =
    useState(0);

  const [
    draftSearch,
    setDraftSearch,
  ] =
    useState("");

  const [
    draftMethod,
    setDraftMethod,
  ] =
    useState<PaymentLedgerMethodFilter>(
      "all"
    );

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
    filters,
    setFilters,
  ] =
    useState<Filters>({
      search: "",
      method: "all",
      from: "",
      to: "",
    });

  const [
    liveByOrder,
    setLiveByOrder,
  ] =
    useState<
      Record<
        number,
        LiveState
      >
    >({});

  const requestedLiveOrderIds =
    useRef<Set<number>>(
      new Set()
    );

  const query =
    useMemo(() => {
      const params =
        new URLSearchParams({
          page:
            String(page),
          per_page:
            String(
              perPage
            ),
          method:
            filters.method,
        });

      if (
        filters.search
      ) {
        params.set(
          "s",
          filters.search
        );
      }

      if (filters.from) {
        params.set(
          "date_from",
          filters.from
        );
      }

      if (filters.to) {
        params.set(
          "date_to",
          filters.to
        );
      }

      return params.toString();
    }, [
      filters,
      page,
      perPage,
    ]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            `/api/payments/ledger?${query}`,
            {
              cache:
                "no-store",
              signal:
                controller.signal,
            }
          );

        const payload:
          unknown =
          await response
            .json()
            .catch(
              () => null
            );

        if (
          !response.ok ||
          !isRecord(
            payload
          )
        ) {
          throw new Error(
            isRecord(
              payload
            ) &&
              typeof payload.error ===
                "string"
              ? payload.error
              : "Failed to load payment transactions."
          );
        }

        if (
          payload.ok !==
            true ||
          !Array.isArray(
            payload.rows
          ) ||
          !isRecord(
            payload.summary
          ) ||
          !isRecord(
            payload.pagination
          )
        ) {
          throw new Error(
            "Invalid payments response."
          );
        }

        setData(
          payload as unknown as PaymentLedgerResponse
        );
      } catch (
        loadError
      ) {
        if (
          controller
            .signal
            .aborted
        ) {
          return;
        }

        setData(null);
        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Failed to load payment transactions."
        );
      } finally {
        if (
          !controller
            .signal
            .aborted
        ) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () =>
      controller.abort();
  }, [
    query,
    refreshNonce,
  ]);

  const applyFilters =
    useCallback(
      (
        event?: FormEvent<HTMLFormElement>
      ) => {
        event?.preventDefault();

        setPage(1);
        setFilters({
          search:
            draftSearch.trim(),
          method:
            draftMethod,
          from: draftFrom,
          to: draftTo,
        });
        setFilterOpen(
          false
        );
      },
      [
        draftSearch,
        draftMethod,
        draftFrom,
        draftTo,
      ]
    );

  const clearFilters =
    useCallback(() => {
      setDraftSearch("");
      setDraftMethod(
        "all"
      );
      setDraftFrom("");
      setDraftTo("");
      setPage(1);
      setFilters({
        search: "",
        method: "all",
        from: "",
        to: "",
      });
      setFilterOpen(
        false
      );
    }, []);

  const checkLiveStatus =
    useCallback(
      async (
        row:
          PaymentLedgerRow
      ) => {
        if (
          row.paymentMethod
            .kind !==
          "payglocal"
        ) {
          return;
        }

        setLiveByOrder(
          (current) => ({
            ...current,
            [row.orderId]: {
              loading: true,
              error: "",
              payment:
                current[
                  row.orderId
                ]?.payment ||
                null,
            },
          })
        );

        try {
          const response =
            await fetch(
              `/api/payments/orders/${row.orderId}/status`,
              {
                cache:
                  "no-store",
              }
            );

          const payload:
            unknown =
            await response
              .json()
              .catch(
                () => null
              );

          if (
            !response.ok ||
            !isRecord(
              payload
            )
          ) {
            throw new Error(
              isRecord(
                payload
              ) &&
                typeof payload.error ===
                  "string"
                ? payload.error
                : "Live status is unavailable."
            );
          }

          const result =
            payload as unknown as LivePayload;

          if (
            result.ok !==
              true ||
            result.order
              ?.orderId !==
              row.orderId ||
            result.payment
              ?.identityVerified !==
              true
          ) {
            throw new Error(
              "Live payment status could not be verified."
            );
          }

          setLiveByOrder(
            (current) => ({
              ...current,
              [row.orderId]: {
                loading:
                  false,
                error: "",
                payment:
                  result.payment,
              },
            })
          );
        } catch (
          liveError
        ) {
          setLiveByOrder(
            (current) => ({
              ...current,
              [row.orderId]: {
                loading:
                  false,
                error:
                  liveError instanceof
                    Error
                    ? liveError.message
                    : "Live status is unavailable.",
                payment:
                  current[
                    row.orderId
                  ]?.payment ||
                  null,
              },
            })
          );
        }
      },
      []
    );

  useEffect(() => {
    if (
      !data?.rows.length
    ) {
      return;
    }

    const queue =
      data.rows.filter(
        (row) =>
          row.paymentMethod
            .kind ===
            "payglocal" &&
          !requestedLiveOrderIds.current.has(
            row.orderId
          )
      );

    if (!queue.length) {
      return;
    }

    for (
      const row
      of queue
    ) {
      requestedLiveOrderIds.current.add(
        row.orderId
      );
    }

    let cancelled =
      false;

    const pending = [
      ...queue,
    ];

    async function worker() {
      while (
        !cancelled
      ) {
        const row =
          pending.shift();

        if (!row) {
          return;
        }

        await checkLiveStatus(
          row
        );
      }
    }

    const workerCount =
      Math.min(
        4,
        pending.length
      );

    void Promise.all(
      Array.from(
        {
          length:
            workerCount,
        },
        () => worker()
      )
    );

    return () => {
      cancelled = true;
    };
  }, [
    data,
    checkLiveStatus,
  ]);

  const summary =
    data?.summary;

  const pagination =
    data?.pagination;

  const startRow =
    pagination &&
    pagination.total > 0
      ? (
          pagination.page -
          1
        ) *
          pagination.perPage +
        1
      : 0;

  const endRow =
    pagination
      ? Math.min(
          pagination.page *
            pagination.perPage,
          pagination.total
        )
      : 0;

  const activeFilterCount =
    [
      filters.search,
      filters.method !==
      "all"
        ? filters.method
        : "",
      filters.from,
      filters.to,
    ].filter(Boolean)
      .length;

  function statusFor(
    row:
      PaymentLedgerRow
  ) {
    const live =
      liveByOrder[
        row.orderId
      ];

    if (
      row.paymentMethod
        .kind ===
      "payglocal"
    ) {
      if (
        live?.payment
          ?.friendlyStatus
      ) {
        return live
          .payment
          .friendlyStatus;
      }

      if (
        live?.loading
      ) {
        return "Checking live status";
      }

      if (live?.error) {
        return "Live status unavailable";
      }
    }

    return row
      .paymentStatus
      .label;
  }

  function referenceFor(
    row:
      PaymentLedgerRow
  ) {
    return (
      liveByOrder[
        row.orderId
      ]?.payment?.gid ||
      row.reference
        ?.value ||
      ""
    );
  }

  if (
    loading &&
    !data
  ) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {Array.from({
            length: 4,
          }).map(
            (
              _,
              index
            ) => (
              <Skeleton
                key={
                  index
                }
                className="h-24 rounded-xl md:h-28 md:rounded-2xl"
              />
            )
          )}
        </div>
        <Skeleton className="h-12 rounded-xl md:h-16 md:rounded-2xl" />
        <Skeleton className="h-80 rounded-xl md:rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {[
          [
            "Transactions",
            String(
              summary
                ?.totalTransactions ||
                0
            ),
          ],
          [
            "Order value",
            formatTotals(
              summary
                ?.orderValue ||
                []
            ),
          ],
          [
            "Woo paid",
            formatTotals(
              summary
                ?.wooRecordedPaidValue ||
                []
            ),
          ],
          [
            "UPI pending",
            String(
              summary
                ?.manualUpiPendingVerification ||
                0
            ),
          ],
        ].map(
          ([
            label,
            value,
          ]) => (
            <div
              key={label}
              className="min-w-0 rounded-xl border border-border bg-card p-3 md:rounded-2xl md:p-4"
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground md:text-[11px]">
                {label}
              </div>
              <div className="mt-1.5 break-words text-[17px] font-extrabold tracking-tight text-heading md:mt-2 md:text-[20px]">
                {value}
              </div>
            </div>
          )
        )}
      </section>

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
              {activeFilterCount}
            </span>
          ) : null}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh payments"
          onClick={() => {
            requestedLiveOrderIds.current.clear();
            setRefreshNonce(
              (current) =>
                current + 1
            );
          }}
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      <form
        onSubmit={
          applyFilters
        }
        className="hidden rounded-2xl border border-border bg-card p-3 md:block"
      >
        <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto]">
          <FilterFields
            draftSearch={
              draftSearch
            }
            setDraftSearch={
              setDraftSearch
            }
            draftMethod={
              draftMethod
            }
            setDraftMethod={
              setDraftMethod
            }
            draftFrom={
              draftFrom
            }
            setDraftFrom={
              setDraftFrom
            }
            draftTo={
              draftTo
            }
            setDraftTo={
              setDraftTo
            }
          />

          <div className="flex gap-2">
            <Button
              type="submit"
            >
              Apply
            </Button>
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
        </div>
      </form>

      <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 md:px-4">
          <div>
            <h2 className="text-sm font-extrabold text-heading md:text-base">
              Payment transactions
            </h2>
            <p className="mt-0.5 hidden text-xs text-muted-foreground md:block">
              PayGlocal status refreshes automatically for visible rows.
            </p>
          </div>

          <label className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
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
                    event
                      .currentTarget
                      .value
                  ) || 25
                );
                setPage(1);
              }}
              className="ls-focus-ring h-9 rounded-lg border border-input bg-card px-2 text-xs font-semibold text-foreground"
            >
              {[
                10,
                25,
                50,
                100,
              ].map(
                (value) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {value}
                  </option>
                )
              )}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({
              length: 5,
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
        ) : error ? (
          <div className="p-3 md:p-5">
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
              {error}
            </div>
          </div>
        ) : !data ||
          data.rows
            .length ===
            0 ? (
          <EmptyState
            icon={
              WalletCards
            }
            title="No payment transactions"
            description="Try changing the filters or check again after new orders arrive."
          />
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {data.rows.map(
                (row) => {
                  const live =
                    liveByOrder[
                      row
                        .orderId
                    ];

                  const label =
                    statusFor(
                      row
                    );

                  return (
                    <article
                      key={
                        row.orderId
                      }
                      className="p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/orders/${row.orderId}`}
                            className="text-sm font-extrabold text-primary"
                          >
                            #
                            {
                              row.orderNumber
                            }
                          </Link>

                          <div className="mt-0.5 truncate text-sm font-semibold text-heading">
                            {row
                              .customer
                              .name ||
                              "Customer"}
                          </div>

                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {formatDate(
                              row.createdAtGmt
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-sm font-extrabold text-heading">
                            {formatMoney(
                              row.amount,
                              row.currency
                            )}
                          </div>

                          <div className="mt-0.5 max-w-[130px] truncate text-[11px] font-semibold text-muted-foreground">
                            {
                              row
                                .paymentMethod
                                .title
                            }
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <StatusBadge
                          status={
                            label
                          }
                          label={
                            label
                          }
                          tone={toneForPayment(
                            label
                          )}
                        />

                        <StatusBadge
                          status={
                            row
                              .woo
                              .orderStatus
                          }
                          label={friendlyWooStatus(
                            row
                              .woo
                              .orderStatus
                          )}
                        />
                      </div>

                      {referenceFor(
                        row
                      ) ? (
                        <div className="mt-2.5 truncate rounded-lg bg-surface-soft px-2.5 py-2 font-mono text-[10px] text-muted-foreground">
                          {referenceFor(
                            row
                          )}
                        </div>
                      ) : null}

                      <div className="mt-2 flex items-center justify-between gap-2">
                        {row
                          .manualUpi
                          ?.proofAvailable ? (
                          <a
                            href={`/api/orders/${row.orderId}/upi-proof`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-secondary px-2.5 text-xs font-bold text-secondary-foreground"
                          >
                            Proof
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span />
                        )}

                        {live?.error ? (
                          <span className="text-[10px] text-amber-700">
                            Live status unavailable
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                }
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-soft text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {[
                      "Order",
                      "Customer",
                      "Method",
                      "Payment",
                      "Woo status",
                      "Amount",
                      "Reference",
                      "Date",
                    ].map(
                      (
                        label
                      ) => (
                        <th
                          key={
                            label
                          }
                          className="px-4 py-3"
                        >
                          {label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {data.rows.map(
                    (row) => {
                      const live =
                        liveByOrder[
                          row
                            .orderId
                        ];

                      const label =
                        statusFor(
                          row
                        );

                      return (
                        <tr
                          key={
                            row.orderId
                          }
                          className="border-b border-border last:border-b-0 hover:bg-muted/40"
                        >
                          <td className="px-4 py-3.5">
                            <Link
                              href={`/orders/${row.orderId}`}
                              className="font-bold text-primary hover:underline"
                            >
                              #
                              {
                                row.orderNumber
                              }
                            </Link>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="max-w-[180px] truncate font-semibold text-heading">
                              {row
                                .customer
                                .name ||
                                "Customer"}
                            </div>
                            <div className="mt-0.5 max-w-[180px] truncate text-[11px] text-muted-foreground">
                              {row
                                .customer
                                .phone ||
                                row
                                  .customer
                                  .email ||
                                "—"}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-medium text-foreground">
                            {
                              row
                                .paymentMethod
                                .title
                            }
                          </td>

                          <td className="px-4 py-3.5">
                            <StatusBadge
                              status={
                                label
                              }
                              label={
                                label
                              }
                              tone={toneForPayment(
                                label
                              )}
                            />
                            {live?.error ? (
                              <div className="mt-1 max-w-[180px] text-[10px] text-amber-700">
                                {
                                  live.error
                                }
                              </div>
                            ) : null}
                          </td>

                          <td className="px-4 py-3.5">
                            <StatusBadge
                              status={
                                row
                                  .woo
                                  .orderStatus
                              }
                              label={friendlyWooStatus(
                                row
                                  .woo
                                  .orderStatus
                              )}
                            />
                          </td>

                          <td className="px-4 py-3.5 font-extrabold text-heading">
                            {formatMoney(
                              row.amount,
                              row.currency
                            )}
                          </td>

                          <td className="max-w-[220px] px-4 py-3.5">
                            <div className="truncate font-mono text-[10px] text-muted-foreground">
                              {referenceFor(
                                row
                              ) ||
                                "—"}
                            </div>

                            {row
                              .manualUpi
                              ?.proofAvailable ? (
                              <a
                                href={`/api/orders/${row.orderId}/upi-proof`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                              >
                                View proof
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : null}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground">
                            {formatDate(
                              row.createdAtGmt
                            )}
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
        !error &&
        pagination &&
        pagination.total >
          0 ? (
          <div className="flex flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between md:px-4">
            <div className="text-xs text-muted-foreground">
              Showing{" "}
              {startRow}–
              {endRow} of{" "}
              {
                pagination.total
              }
            </div>

            <div className="grid grid-cols-[42px_1fr_42px] items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous page"
                disabled={
                  pagination.page <=
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
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="flex h-11 min-w-[120px] items-center justify-center rounded-xl bg-surface-soft px-3 text-xs font-bold text-foreground">
                Page{" "}
                {
                  pagination.page
                }{" "}
                of{" "}
                {
                  pagination.totalPages
                }
              </div>

              <Button
                variant="outline"
                size="icon"
                aria-label="Next page"
                disabled={
                  pagination.page >=
                  pagination.totalPages
                }
                onClick={() =>
                  setPage(
                    (
                      current
                    ) =>
                      Math.min(
                        pagination.totalPages,
                        current +
                          1
                      )
                  )
                }
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <BottomSheet
        open={
          filterOpen
        }
        onOpenChange={
          setFilterOpen
        }
        title="Payment filters"
        description="Search by order, customer or transaction reference."
        popupClassName="md:mx-auto md:max-w-lg"
      >
        <form
          onSubmit={
            applyFilters
          }
          className="space-y-3"
        >
          <FilterFields
            draftSearch={
              draftSearch
            }
            setDraftSearch={
              setDraftSearch
            }
            draftMethod={
              draftMethod
            }
            setDraftMethod={
              setDraftMethod
            }
            draftFrom={
              draftFrom
            }
            setDraftFrom={
              setDraftFrom
            }
            draftTo={
              draftTo
            }
            setDraftTo={
              setDraftTo
            }
          />

          <div className="grid grid-cols-2 gap-2 pt-1">
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
              type="submit"
            >
              Apply Filters
            </Button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
