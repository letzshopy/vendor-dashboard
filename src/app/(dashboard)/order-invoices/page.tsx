"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InvoicePdfClient from "../orders/ui/InvoicePdfClient";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreVertical,
  ReceiptText,
  Search,
} from "lucide-react";

type OrderRow = {
  id: number;
  number: string;
  date_created: string;
  status: string;
  payment_method_title?: string;
  total: string;
  billing?: { first_name?: string; last_name?: string; email?: string };
  line_items?: Array<{
    id: number;
    name: string;
    quantity: number;
    total: string;
    subtotal: string;
    price: number;
  }>;
};

function statusClass(status: string) {
  const s = (status || "").toLowerCase();

  if (s === "completed") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (s === "processing") {
    return "bg-blue-50 text-blue-700";
  }
  if (s === "cancelled" || s === "refunded" || s === "failed") {
    return "bg-rose-50 text-rose-700";
  }
  if (s === "on-hold") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { date: "-", time: "-" };
  }

  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString(),
  };
}

function buildCustomerName(order: OrderRow) {
  const name =
    (order.billing?.first_name || order.billing?.last_name
      ? `${order.billing?.first_name || ""} ${
          order.billing?.last_name || ""
        }`.trim()
      : "") || "";

  return name || order.billing?.email || "-";
}

function buildItemsText(order: OrderRow) {
  return (order.line_items || [])
    .map((li) => `${li.name}${li.quantity ? ` × ${li.quantity}` : ""}`)
    .join(", ");
}

function RowMenu({
  orderId,
  onCreate,
}: {
  orderId: number;
  onCreate: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-violet-300 hover:text-violet-700"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 min-w-[170px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <Link
            href={`/orders/${orderId}`}
            className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            View order
          </Link>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCreate(orderId);
            }}
            className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Create PDF Invoice
          </button>
        </div>
      )}
    </div>
  );
}

export default function OrderInvoicesPage() {
  const [allOrders, setAllOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => Number(k)),
    [selected]
  );

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/orders/all", { cache: "no-store" });
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : json;
      setAllOrders(list || []);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromDate = from ? new Date(from + "T00:00:00") : null;
    const toDate = to ? new Date(to + "T23:59:59") : null;

    return allOrders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;

      if (fromDate || toDate) {
        const od = new Date(o.date_created);
        if (fromDate && od < fromDate) return false;
        if (toDate && od > toDate) return false;
      }

      if (term) {
        const name = buildCustomerName(o);
        const email = o.billing?.email || "";
        const payment = o.payment_method_title || "";
        const itemText = buildItemsText(o);

        const haystack = [
          String(o.number || ""),
          String(o.id),
          name,
          email,
          payment,
          itemText,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [allOrders, status, search, from, to]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / (perPage || 1))
  );

  useEffect(() => {
    setPage((p) => {
      if (p < 1) return 1;
      if (p > totalPages) return totalPages;
      return p;
    });
  }, [totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return filteredOrders.slice(start, end);
  }, [filteredOrders, page, perPage]);

  const firstRow =
    filteredOrders.length === 0 ? 0 : (page - 1) * perPage + 1;
  const lastRow =
    filteredOrders.length === 0
      ? 0
      : Math.min(page * perPage, filteredOrders.length);

  function toggleAll(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;
    const next: Record<number, boolean> = { ...selected };

    paginatedOrders.forEach((o) => {
      next[o.id] = checked;
    });

    setSelected(next);
  }

  function toggleOne(id: number, value: boolean) {
    setSelected((s) => ({ ...s, [id]: value }));
  }

  const allPageSelected =
    paginatedOrders.length > 0 &&
    paginatedOrders.every((o) => selected[o.id]);

  async function createInvoices() {
    if (selectedIds.length === 0) return;
    await InvoicePdfClient.generateForOrders(selectedIds);
  }

  async function createSingleInvoice(id: number) {
    await InvoicePdfClient.generateForOrders([id]);
  }

  function goPrev() {
    setPage((p) => (p > 1 ? p - 1 : p));
  }

  function goNext() {
    setPage((p) => (p < totalPages ? p + 1 : p));
  }

  function onPerPageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = Number(e.target.value) || 25;
    setPerPage(value);
    setPage(1);
  }

  function clearFilters() {
    setStatus("all");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#f7f8ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
              <ReceiptText className="h-3.5 w-3.5" />
              Order Invoices
            </div>

            <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
              Order Invoices
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/orders"
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-4 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4 md:px-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-slate-900">
              Filters
            </h2>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-5">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All statuses</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
            <option value="on-hold">On hold</option>
            <option value="pending">Pending payment</option>
          </select>

          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              placeholder="Order # / customer / email / SKU / product"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />

          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {loading && (
          <div className="px-4 pb-4 text-xs text-slate-500 md:px-5">
            Loading orders...
          </div>
        )}
      </section>

      <section className="mt-4 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[16px] font-semibold text-slate-900">
                Invoice Orders
              </h2>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {filteredOrders.length} orders
              </div>
            </div>

            <button
              onClick={createInvoices}
              className={`inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold shadow-sm ${
                selectedIds.length
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "cursor-not-allowed bg-slate-200 text-slate-500"
              }`}
              disabled={!selectedIds.length}
            >
              Create PDF Invoice ({selectedIds.length})
            </button>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="block md:hidden">
          {paginatedOrders.length > 0 ? (
            <div className="space-y-2 p-3">
              {paginatedOrders.map((o) => {
                const dt = formatDateTime(o.date_created);
                const customerName = buildCustomerName(o);
                const itemsText = buildItemsText(o);
                const isChecked = !!selected[o.id];

                return (
                  <div
                    key={o.id}
                    className="rounded-[20px] border border-slate-200 bg-white px-3 py-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleOne(o.id, e.target.checked)}
                          aria-label={`Select order ${o.number || o.id}`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/orders/${o.id}`}
                              className="block text-[15px] font-semibold text-indigo-700 hover:underline"
                            >
                              #{o.number || o.id}
                            </Link>

                            <div className="mt-1 text-sm font-medium text-slate-900">
                              {customerName}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {dt.date} • {dt.time}
                            </div>
                          </div>

                          <RowMenu
                            orderId={o.id}
                            onCreate={createSingleInvoice}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${statusClass(
                              o.status
                            )}`}
                          >
                            {o.status.replace("_", " ")}
                          </span>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                            {o.payment_method_title || "-"}
                          </span>
                        </div>

                        {itemsText && (
                          <div className="mt-3 line-clamp-2 text-sm text-slate-600">
                            {itemsText}
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            Total
                          </div>
                          <div className="text-base font-semibold text-slate-900">
                            ₹{Number(o.total || 0).toFixed(2)}
                          </div>
                        </div>

                        <button
                          className="mt-3 inline-flex items-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          onClick={() => createSingleInvoice(o.id)}
                        >
                          Create PDF Invoice
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            !loading && (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="mt-4 text-sm font-semibold text-slate-700">
                  No orders found for the selected filters.
                </div>
              </div>
            )
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm border-collapse">
            <colgroup>
              <col className="w-10" />
              <col className="w-20" />
              <col className="w-40" />
              <col className="w-[26%]" />
              <col className="w-[16%]" />
              <col className="w-28" />
              <col className="w-32" />
              <col className="w-40" />
            </colgroup>
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    aria-label="Select all orders on this page"
                  />
                </th>
                <th className="p-3 text-left font-medium">#</th>
                <th className="p-3 text-left font-medium">Date</th>
                <th className="p-3 text-left font-medium">Customer</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-right font-medium">Total</th>
                <th className="p-3 text-left font-medium">Payment</th>
                <th className="p-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((o, idx) => {
                const dt = formatDateTime(o.date_created);
                const customerName = buildCustomerName(o);
                const isChecked = !!selected[o.id];

                return (
                  <tr
                    key={o.id}
                    className={`border-b border-slate-100 ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    <td className="p-3 align-top">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => toggleOne(o.id, e.target.checked)}
                        aria-label={`Select order ${o.number || o.id}`}
                      />
                    </td>

                    <td className="p-3 align-top">
                      <Link
                        className="text-blue-600 hover:underline text-sm font-medium"
                        href={`/orders/${o.id}`}
                      >
                        #{o.number || o.id}
                      </Link>
                    </td>

                    <td
                      className="p-3 align-top whitespace-nowrap text-slate-800"
                      suppressHydrationWarning
                    >
                      <div className="text-xs font-medium">{dt.date}</div>
                      <div className="text-[11px] text-slate-500">{dt.time}</div>
                    </td>

                    <td className="p-3 align-top">
                      <div className="text-sm text-slate-900">{customerName}</div>
                    </td>

                    <td className="p-3 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusClass(
                          o.status
                        )}`}
                      >
                        {o.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="p-3 align-top text-right font-semibold text-slate-900">
                      ₹{Number(o.total || 0).toFixed(2)}
                    </td>

                    <td className="p-3 align-top whitespace-nowrap text-sm text-slate-800">
                      {o.payment_method_title || "-"}
                    </td>

                    <td className="p-3 align-top text-right">
                      <button
                        className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => createSingleInvoice(o.id)}
                      >
                        Create PDF Invoice
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-6 text-center text-sm text-slate-500"
                  >
                    No orders found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between md:px-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span>Rows</span>
                <select
                  value={perPage}
                  onChange={onPerPageChange}
                  className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <span>
                Showing <span className="font-semibold">{firstRow}</span>-
                <span className="font-semibold">{lastRow}</span> of{" "}
                <span className="font-semibold">{filteredOrders.length}</span>
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={goNext}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}