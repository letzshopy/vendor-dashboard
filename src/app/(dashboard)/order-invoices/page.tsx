// src/app/order-invoices/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InvoicePdfClient from "../orders/ui/InvoicePdfClient";

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

export default function OrderInvoicesPage() {
  const [allOrders, setAllOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // selection (kept across pages)
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => Number(k)),
    [selected]
  );

  // Fetch all orders (no filters in API – we filter on client)
  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/orders/all", { cache: "no-store" });
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : json;
      setAllOrders(list || []);
      setPage(1); // go back to first page on refresh/search
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  // --- Client-side filtering ---
  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromDate = from ? new Date(from + "T00:00:00") : null;
    const toDate = to ? new Date(to + "T23:59:59") : null;

    return allOrders.filter((o) => {
      // by status
      if (status !== "all" && o.status !== status) return false;

      // by date range
      if (fromDate || toDate) {
        const od = new Date(o.date_created);
        if (fromDate && od < fromDate) return false;
        if (toDate && od > toDate) return false;
      }

      // by search term
      if (term) {
        const name =
          (o.billing?.first_name || o.billing?.last_name
            ? `${o.billing?.first_name || ""} ${
                o.billing?.last_name || ""
              }`.trim()
            : "") || "";

        const email = o.billing?.email || "";
        const pm = o.payment_method_title || "";

        const lineText = (o.line_items || [])
          .map((li) => li.name)
          .join(" ");

        const haystack = [
          String(o.number || ""),
          String(o.id),
          name,
          email,
          pm,
          lineText,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [allOrders, status, search, from, to]);

  // --- Pagination based on filtered list ---
  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / perPage || 1)
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

  function toggleOne(id: number, v: boolean) {
    setSelected((s) => ({ ...s, [id]: v }));
  }

  const allPageSelected =
    paginatedOrders.length > 0 &&
    paginatedOrders.every((o) => selected[o.id]);

  async function createInvoices() {
    if (selectedIds.length === 0) return;
    await InvoicePdfClient.generateForOrders(selectedIds);
  }

  function goPrev() {
    setPage((p) => (p > 1 ? p - 1 : p));
  }

  function goNext() {
    setPage((p) => (p < totalPages ? p + 1 : p));
  }

  function onPerPageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = Number(e.target.value) || 25;
    setPerPage(val);
    setPage(1);
  }

  // When clicking Search, just refresh from server & go to first page
  function onSearchClick() {
    fetchOrders();
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Order Invoices
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              Search completed orders and generate PDF tax invoices in one
              click. Select multiple orders to download a combined invoice
              batch.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Back to Orders
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <section className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-100 px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status */}
            <div className="w-full sm:w-auto">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 w-full sm:w-40 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All statuses</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
                <option value="on-hold">On hold</option>
                <option value="pending">Pending payment</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Search
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs">
                  🔍
                </span>
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-7 pr-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  placeholder="Order # / customer / email / SKU / product"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Date range */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Right side buttons */}
            <div className="ml-auto flex flex-col items-stretch sm:items-end gap-2">
              <button
                onClick={onSearchClick}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 h-10 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Search
              </button>

              <button
                onClick={createInvoices}
                className={`inline-flex items-center justify-center rounded-xl px-4 h-10 text-xs sm:text-sm font-semibold shadow-sm ${
                  selectedIds.length
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
                disabled={!selectedIds.length}
                title={
                  selectedIds.length
                    ? "Create PDF invoices for selected orders"
                    : "Select orders first"
                }
              >
                Create PDF Invoice ({selectedIds.length})
              </button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              Loading orders…
            </div>
          )}
        </section>

        {/* Orders table */}
        <section className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
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
                <th className="p-2 text-left">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    aria-label="Select all orders on this page"
                  />
                </th>
                <th className="p-2 text-left font-medium">#</th>
                <th className="p-2 text-left font-medium">Date</th>
                <th className="p-2 text-left font-medium">Customer</th>
                <th className="p-2 text-left font-medium">Status</th>
                <th className="p-2 text-right font-medium">Total</th>
                <th className="p-2 text-left font-medium">Payment</th>
                <th className="p-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((o, idx) => {
                const d = new Date(o.date_created);
                const dateLabel = d.toLocaleDateString();
                const timeLabel = d.toLocaleTimeString();

                const name =
                  (o.billing?.first_name || o.billing?.last_name
                    ? `${o.billing?.first_name || ""} ${
                        o.billing?.last_name || ""
                      }`.trim()
                    : "") || o.billing?.email || "-";

                const isChecked = !!selected[o.id];

                const statusClass =
                  o.status === "completed"
                    ? "bg-emerald-50 text-emerald-700"
                    : o.status === "processing"
                    ? "bg-blue-50 text-blue-700"
                    : o.status === "cancelled" || o.status === "refunded"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-slate-100 text-slate-700";

                return (
                  <tr
                    key={o.id}
                    className={`border-b border-slate-100 ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    <td className="p-2 align-top">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => toggleOne(o.id, e.target.checked)}
                        aria-label={`Select order ${o.number || o.id}`}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <Link
                        className="text-blue-600 hover:underline text-sm font-medium"
                        href={`/orders/${o.id}`}
                      >
                        #{o.number || o.id}
                      </Link>
                    </td>
                    <td
                      className="p-2 align-top text-slate-800 whitespace-nowrap"
                      suppressHydrationWarning
                    >
                      <div className="text-xs font-medium">{dateLabel}</div>
                      <div className="text-[11px] text-slate-500">
                        {timeLabel}
                      </div>
                    </td>
                    <td className="p-2 align-top">
                      <div className="text-sm text-slate-900">{name}</div>
                    </td>
                    <td className="p-2 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusClass}`}
                      >
                        {o.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-2 align-top text-right font-semibold text-slate-900">
                      ₹{Number(o.total || 0).toFixed(2)}
                    </td>
                    <td className="p-2 align-top text-sm text-slate-800 whitespace-nowrap">
                      {o.payment_method_title || "-"}
                    </td>
                    <td className="p-2 align-top text-right">
                      <button
                        className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() =>
                          InvoicePdfClient.generateForOrders([o.id])
                        }
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
                    className="p-6 text-center text-slate-500 text-sm"
                  >
                    No orders found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination bar */}
          {filteredOrders.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={perPage}
                  onChange={onPerPageChange}
                  className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="ml-3">
                  Showing{" "}
                  <span className="font-semibold">
                    {firstRow}-{lastRow}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold">
                    {filteredOrders.length}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={page <= 1}
                  className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs">
                  Page{" "}
                  <span className="font-semibold">{page}</span> of{" "}
                  <span className="font-semibold">{totalPages}</span>
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={page >= totalPages}
                  className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
