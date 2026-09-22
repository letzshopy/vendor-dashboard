"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Loader2,
  Search,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  CurrencyTotal,
  PayGlocalLivePayment,
  PaymentLedgerMethodFilter,
  PaymentLedgerResponse,
  PaymentLedgerRow,
} from "@/types/payment-ledger";

type Filters = {
  search: string;
  method: PaymentLedgerMethodFilter;
  from: string;
  to: string;
};

type LiveState = {
  loading: boolean;
  error: string;
  payment: PayGlocalLivePayment | null;
};

type LivePayload = {
  ok: true;
  order: { orderId: number };
  payment: PayGlocalLivePayment;
};

const METHOD_OPTIONS: Array<{
  value: PaymentLedgerMethodFilter;
  label: string;
}> = [
  { value: "all", label: "All methods" },
  { value: "payglocal", label: "PayGlocal" },
  { value: "manual_upi", label: "Manual UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cod", label: "Cash on Delivery" },
  { value: "other", label: "Other" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function formatMoney(amount: string | number, currency = "INR"): string {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return "Not available";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: String(currency || "INR").toUpperCase(),
      minimumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${String(currency || "INR").toUpperCase()} ${numeric.toFixed(2)}`;
  }
}

function formatTotals(items: CurrencyTotal[]): string {
  return items.length
    ? items.map((item) => formatMoney(item.amount, item.currency)).join(" · ")
    : formatMoney(0, "INR");
}

function formatDate(value: string): string {
  if (!value) return "Not available";
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function friendlyWooStatus(value: string): string {
  const status = String(value || "").trim().toLowerCase();
  const labels: Record<string, string> = {
    pending: "Pending payment",
    processing: "Processing",
    "on-hold": "On hold",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
    failed: "Failed",
    trash: "Trash",
  };

  return labels[status] || status.replace(/[-_]+/g, " ") || "Not available";
}

function statusClass(label: string): string {
  const value = label.toLowerCase();

  if (
    value.includes("successful") ||
    value === "verified" ||
    value === "paid" ||
    value.includes("paid in woocommerce")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value.includes("declined") ||
    value.includes("failed") ||
    value.includes("cancelled") ||
    value.includes("not paid") ||
    value.includes("not completed") ||
    value.includes("error") ||
    value.includes("timed out")
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (
    value.includes("pending") ||
    value.includes("progress") ||
    value.includes("started") ||
    value.includes("review") ||
    value.includes("authorised") ||
    value.includes("check live")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function PaymentsLedgerClient() {
  const [data, setData] = useState<PaymentLedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const [draftSearch, setDraftSearch] = useState("");
  const [draftMethod, setDraftMethod] =
    useState<PaymentLedgerMethodFilter>("all");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  const [filters, setFilters] = useState<Filters>({
    search: "",
    method: "all",
    from: "",
    to: "",
  });

  const [liveByOrder, setLiveByOrder] =
    useState<Record<number, LiveState>>({});

  const requestedLiveOrderIds =
    useRef<Set<number>>(new Set());

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      method: filters.method,
    });

    if (filters.search) params.set("s", filters.search);
    if (filters.from) params.set("date_from", filters.from);
    if (filters.to) params.set("date_to", filters.to);

    return params.toString();
  }, [filters, page, perPage]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/payments/ledger?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok || !isRecord(payload)) {
          throw new Error(
            isRecord(payload) && typeof payload.error === "string"
              ? payload.error
              : "Failed to load payment transactions."
          );
        }

        if (
          payload.ok !== true ||
          !Array.isArray(payload.rows) ||
          !isRecord(payload.summary) ||
          !isRecord(payload.pagination)
        ) {
          throw new Error("Invalid payments response.");
        }

        setData(payload as unknown as PaymentLedgerResponse);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setData(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load payment transactions."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [query]);

  const applyFilters = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      setPage(1);
      setFilters({
        search: draftSearch.trim(),
        method: draftMethod,
        from: draftFrom,
        to: draftTo,
      });
    },
    [draftSearch, draftMethod, draftFrom, draftTo]
  );

  const clearFilters = useCallback(() => {
    setDraftSearch("");
    setDraftMethod("all");
    setDraftFrom("");
    setDraftTo("");
    setPage(1);
    setFilters({
      search: "",
      method: "all",
      from: "",
      to: "",
    });
  }, []);

  const checkLiveStatus = useCallback(async (row: PaymentLedgerRow) => {
    if (row.paymentMethod.kind !== "payglocal") return;

    setLiveByOrder((current) => ({
      ...current,
      [row.orderId]: {
        loading: true,
        error: "",
        payment: current[row.orderId]?.payment || null,
      },
    }));

    try {
      const response = await fetch(
        `/api/payments/orders/${row.orderId}/status`,
        { cache: "no-store" }
      );
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok || !isRecord(payload)) {
        throw new Error(
          isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : "Live status is unavailable."
        );
      }

      const result = payload as unknown as LivePayload;

      if (
        result.ok !== true ||
        result.order?.orderId !== row.orderId ||
        result.payment?.identityVerified !== true
      ) {
        throw new Error("Live payment status could not be verified.");
      }

      setLiveByOrder((current) => ({
        ...current,
        [row.orderId]: {
          loading: false,
          error: "",
          payment: result.payment,
        },
      }));
    } catch (liveError) {
      setLiveByOrder((current) => ({
        ...current,
        [row.orderId]: {
          loading: false,
          error:
            liveError instanceof Error
              ? liveError.message
              : "Live status is unavailable.",
          payment: current[row.orderId]?.payment || null,
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (!data?.rows.length) return;

    const queue = data.rows.filter(
      (row) =>
        row.paymentMethod.kind === "payglocal" &&
        !requestedLiveOrderIds.current.has(row.orderId)
    );

    if (!queue.length) return;

    for (const row of queue) {
      requestedLiveOrderIds.current.add(row.orderId);
    }

    let cancelled = false;
    const pending = [...queue];

    async function worker() {
      while (!cancelled) {
        const row = pending.shift();
        if (!row) return;
        await checkLiveStatus(row);
      }
    }

    const workerCount = Math.min(4, pending.length);

    void Promise.all(
      Array.from(
        { length: workerCount },
        () => worker()
      )
    );

    return () => {
      cancelled = true;
    };
  }, [data, checkLiveStatus]);

  const summary = data?.summary;
  const pagination = data?.pagination;
  const startRow =
    pagination && pagination.total > 0
      ? (pagination.page - 1) * pagination.perPage + 1
      : 0;
  const endRow = pagination
    ? Math.min(pagination.page * pagination.perPage, pagination.total)
    : 0;

  function statusFor(row: PaymentLedgerRow) {
    const live = liveByOrder[row.orderId];

    if (row.paymentMethod.kind === "payglocal") {
      if (live?.payment?.friendlyStatus) {
        return live.payment.friendlyStatus;
      }

      if (live?.loading) {
        return "Checking live status";
      }

      if (live?.error) {
        return "Live status unavailable";
      }
    }

    return row.paymentStatus.label;
  }

  function referenceFor(row: PaymentLedgerRow) {
    return (
      liveByOrder[row.orderId]?.payment?.gid ||
      row.reference?.value ||
      ""
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Transactions", String(summary?.totalTransactions || 0), "Orders in current filters"],
          ["Order value", formatTotals(summary?.orderValue || []), "Order totals, not settlement"],
          ["Woo recorded paid", formatTotals(summary?.wooRecordedPaidValue || []), "WooCommerce paid-date value"],
          ["UPI pending", String(summary?.manualUpiPendingVerification || 0), "Manual UPI awaiting verification"],
        ].map(([label, value, helper]) => (
          <div
            key={label}
            className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400">
              {label}
            </div>
            <div className="mt-2 break-words text-[20px] font-bold tracking-tight text-slate-950">
              {value}
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              {helper}
            </div>
          </div>
        ))}
      </section>

      <form
        onSubmit={applyFilters}
        className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto]">
          <div className="flex h-11 items-center rounded-2xl border border-slate-200 px-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="search"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.currentTarget.value)}
              placeholder="Order, customer, UTR, GID..."
              className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none"
            />
          </div>

          <select
            value={draftMethod}
            onChange={(event) =>
              setDraftMethod(
                event.currentTarget.value as PaymentLedgerMethodFilter
              )
            }
            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
          >
            {METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={draftFrom}
            onChange={(event) => setDraftFrom(event.currentTarget.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            aria-label="Start date"
          />

          <input
            type="date"
            value={draftTo}
            onChange={(event) => setDraftTo(event.currentTarget.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            aria-label="End date"
          />

          <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-1">
            <button
              type="submit"
              className="h-11 rounded-2xl bg-[#5366B7] px-4 text-sm font-semibold text-white"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-900">
              Payment transactions
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              PayGlocal live status loads automatically for the visible rows.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-500">
            Rows
            <select
              value={perPage}
              onChange={(event) => {
                setPerPage(Number(event.currentTarget.value) || 25);
                setPage(1);
              }}
              className="h-9 rounded-xl border border-slate-200 px-2 text-xs font-semibold"
            >
              {[10, 25, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
            Loading payments...
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm font-semibold text-slate-600">
            No payment transactions found.
          </div>
        ) : (
          <>
            <div className="space-y-3 bg-slate-50/60 p-3 md:hidden">
              {data.rows.map((row) => {
                const live = liveByOrder[row.orderId];
                const label = statusFor(row);

                return (
                  <article
                    key={row.orderId}
                    className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/orders/${row.orderId}`}
                          className="font-bold text-indigo-700"
                        >
                          #{row.orderNumber}
                        </Link>
                        <div className="mt-1 truncate text-sm font-semibold text-slate-800">
                          {row.customer.name || "Customer"}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {formatDate(row.createdAtGmt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-950">
                          {formatMoney(row.amount, row.currency)}
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-500">
                          {row.paymentMethod.title}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-[10px] font-semibold uppercase text-slate-400">
                          Payment
                        </div>
                        <span
                          className={`mt-1.5 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(label)}`}
                        >
                          {label}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-[10px] font-semibold uppercase text-slate-400">
                          Woo status
                        </div>
                        <div className="mt-1.5 text-xs font-semibold text-slate-700">
                          {friendlyWooStatus(row.woo.orderStatus)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 break-all rounded-2xl border border-slate-100 px-3 py-2.5 font-mono text-[11px] text-slate-600">
                      {referenceFor(row) || "No reference"}
                    </div>

                    {live?.error ? (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {live.error}
                      </div>
                    ) : null}

                    {row.manualUpi?.proofAvailable ? (
                      <a
                        href={`/api/orders/${row.orderId}/upi-proof`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700"
                      >
                        View proof
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1040px] text-sm">
                <thead>
                  <tr className="bg-violet-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {["Order", "Customer", "Method", "Payment status", "Woo status", "Amount", "Reference", "Date"].map(
                      (label) => (
                        <th key={label} className="px-4 py-3">
                          {label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => {
                    const live = liveByOrder[row.orderId];
                    const label = statusFor(row);

                    return (
                      <tr
                        key={row.orderId}
                        className="border-t border-slate-100 align-top hover:bg-violet-50/30"
                      >
                        <td className="px-4 py-4">
                          <Link
                            href={`/orders/${row.orderId}`}
                            className="font-semibold text-indigo-700 hover:underline"
                          >
                            #{row.orderNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <div className="max-w-[180px] truncate font-semibold text-slate-800">
                            {row.customer.name || "Customer"}
                          </div>
                          <div className="mt-0.5 max-w-[180px] truncate text-[11px] text-slate-400">
                            {row.customer.phone || row.customer.email || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-700">
                          {row.paymentMethod.title}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(label)}`}
                          >
                            {label}
                          </span>
                          {live?.payment ? (
                            <div className="mt-1 text-[10px] text-slate-400">
                              Provider: {live.payment.status}
                            </div>
                          ) : null}
                          {live?.error ? (
                            <div className="mt-1 max-w-[210px] text-[10px] leading-4 text-amber-700">
                              {live.error}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                          {friendlyWooStatus(row.woo.orderStatus)}
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-900">
                          {formatMoney(row.amount, row.currency)}
                        </td>
                        <td className="max-w-[210px] px-4 py-4">
                          <div className="break-all font-mono text-[10px] leading-4 text-slate-600">
                            {referenceFor(row) || "—"}
                          </div>
                          {row.manualUpi?.proofAvailable ? (
                            <a
                              href={`/api/orders/${row.orderId}/upi-proof`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 hover:underline"
                            >
                              View proof
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                          {formatDate(row.createdAtGmt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && !error && pagination && pagination.total > 0 ? (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              Showing {startRow}–{endRow} of {pagination.total}
            </div>
            <div className="grid grid-cols-[42px_1fr_42px] items-center gap-2">
              <button
                type="button"
                aria-label="Previous page"
                disabled={pagination.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex h-10 min-w-[120px] items-center justify-center rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-700">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <button
                type="button"
                aria-label="Next page"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() =>
                  setPage((current) =>
                    Math.min(pagination.totalPages, current + 1)
                  )
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 disabled:opacity-30"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
