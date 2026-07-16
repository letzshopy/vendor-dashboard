"use client";

import Link from "next/link";
import {
  formatInvoiceDate,
  formatMoney,
  type SubscriptionInvoice,
} from "@/lib/subscription-invoices";
import { ChevronLeft, ChevronRight, FileText, MoreVertical } from "lucide-react";
import { useMemo, useState } from "react";

function statusBadge(status: SubscriptionInvoice["status"]) {
  const classes =
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium bg-emerald-50 border-emerald-200 text-emerald-700";

  return (
    <span className={classes}>
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {status === "paid" ? "Paid" : status}
    </span>
  );
}

function RowMenu({ id }: { id: string }) {
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
        <div className="absolute right-0 top-11 z-30 min-w-[150px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <Link
            href={`/subscription-bills/${id}`}
            className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            View / Print
          </Link>
        </div>
      )}
    </div>
  );
}

export default function SubscriptionInvoicesClient({
  invoices,
}: {
  invoices: SubscriptionInvoice[];
}) {
  const hasInvoices = invoices.length > 0;

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const totalPages = Math.max(1, Math.ceil(invoices.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);

  const pageInvoices = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return invoices.slice(start, start + rowsPerPage);
  }, [invoices, currentPage, rowsPerPage]);

  const startIndex =
    invoices.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex =
    invoices.length === 0
      ? 0
      : Math.min(currentPage * rowsPerPage, invoices.length);

  return (
    <div>
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4 md:px-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-semibold text-slate-900">
            Invoice List
          </h2>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="block md:hidden">
        {hasInvoices ? (
          <div className="space-y-2 p-3">
            {pageInvoices.map((inv) => (
              <div
                key={inv.id}
                className="rounded-[20px] border border-slate-200 bg-white px-3 py-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/subscription-bills/${inv.id}`}
                      className="block text-[15px] font-semibold text-indigo-700 hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>

                    <div className="mt-1 text-sm text-slate-600">
                      {inv.planLabel}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {formatInvoiceDate(inv.invoiceDate)}
                    </div>
                  </div>

                  <RowMenu id={inv.id} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {statusBadge(inv.status)}
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                    {inv.serviceType === "domain_renewal"
                      ? "Domain Renewal"
                      : "Subscription"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium capitalize text-slate-700">
                    {inv.billingCycle}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                    {inv.gstRate > 0 ? `${inv.gstRate}% GST` : "No GST"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Amount
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {formatMoney(inv.totalAmount, inv.currency)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Period
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-700">
                      {formatInvoiceDate(inv.periodFrom)} –{" "}
                      {formatInvoiceDate(inv.periodTo)}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/subscription-bills/${inv.id}`}
                  className="mt-3 inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View / Print
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FileText className="h-6 w-6" />
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-700">
              No paid billing invoices found yet.
            </div>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-slate-600">
              <th className="border-b border-slate-100 px-4 py-3 text-left text-xs font-semibold">
                Invoice #
              </th>
              <th className="border-b border-slate-100 px-4 py-3 text-left text-xs font-semibold">
                Date
              </th>
              <th className="border-b border-slate-100 px-4 py-3 text-left text-xs font-semibold">
                Service
              </th>
              <th className="border-b border-slate-100 px-4 py-3 text-left text-xs font-semibold">
                Billing Cycle
              </th>
              <th className="border-b border-slate-100 px-4 py-3 text-right text-xs font-semibold">
                Amount
              </th>
              <th className="border-b border-slate-100 px-4 py-3 text-left text-xs font-semibold">
                GST
              </th>
              <th className="border-b border-slate-100 px-4 py-3 text-left text-xs font-semibold">
                Status
              </th>
              <th className="border-b border-slate-100 px-4 py-3 text-left text-xs font-semibold">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {!hasInvoices && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-10 text-center text-sm text-slate-500"
                >
                  No paid billing invoices found yet.
                </td>
              </tr>
            )}

            {pageInvoices.map((inv, idx) => (
              <tr
                key={inv.id}
                className={`border-b border-slate-100 ${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <Link
                    href={`/subscription-bills/${inv.id}`}
                    className="text-[13px] font-medium text-blue-600 hover:underline"
                  >
                    {inv.invoiceNumber}
                  </Link>
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {formatInvoiceDate(inv.invoiceDate)}
                </td>

                <td className="px-4 py-3">
                  <div className="text-[13px] font-medium text-slate-900">
                    {inv.planLabel}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {formatInvoiceDate(inv.periodFrom)} –{" "}
                    {formatInvoiceDate(inv.periodTo)}
                  </div>
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-[12px] capitalize text-slate-700">
                  {inv.billingCycle}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                  {formatMoney(inv.totalAmount, inv.currency)}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-[12px] text-slate-700">
                  {inv.gstRate > 0 ? `${inv.gstRate}% GST` : "No GST"}
                </td>

                <td className="whitespace-nowrap px-4 py-3">
                  {statusBadge(inv.status)}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-[13px]">
                  <Link
                    href={`/subscription-bills/${inv.id}`}
                    className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View / Print
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasInvoices && (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-4 text-xs text-slate-600 md:flex-row md:items-center md:justify-between md:px-5">
          <div>
            Showing <span className="font-semibold">{startIndex}</span> –{" "}
            <span className="font-semibold">{endIndex}</span> of{" "}
            <span className="font-semibold">{invoices.length}</span> invoices
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Rows</span>
              <select
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value) || 10)}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                Page {currentPage} of {totalPages}
              </span>

              <button
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
