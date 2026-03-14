"use client";

import Link from "next/link";
import {
  formatInvoiceDate,
  formatMoney,
  type SubscriptionInvoice,
} from "@/lib/subscription-invoices";

function statusBadge(status: SubscriptionInvoice["status"]) {
  const classes =
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium bg-emerald-50 border-emerald-200 text-emerald-700";

  return (
    <span className={classes}>
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Paid
    </span>
  );
}

export default function SubscriptionInvoicesClient({
  invoices,
}: {
  invoices: SubscriptionInvoice[];
}) {
  const hasInvoices = invoices.length > 0;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50/80 text-slate-600">
            <th className="border-b border-slate-100 px-3 py-2.5 text-left text-xs font-semibold">
              Invoice #
            </th>
            <th className="border-b border-slate-100 px-3 py-2.5 text-left text-xs font-semibold">
              Date
            </th>
            <th className="border-b border-slate-100 px-3 py-2.5 text-left text-xs font-semibold">
              Plan
            </th>
            <th className="border-b border-slate-100 px-3 py-2.5 text-left text-xs font-semibold">
              Billing Cycle
            </th>
            <th className="border-b border-slate-100 px-3 py-2.5 text-right text-xs font-semibold">
              Amount
            </th>
            <th className="border-b border-slate-100 px-3 py-2.5 text-left text-xs font-semibold">
              GST
            </th>
            <th className="border-b border-slate-100 px-3 py-2.5 text-left text-xs font-semibold">
              Status
            </th>
            <th className="border-b border-slate-100 px-3 py-2.5 text-left text-xs font-semibold">
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
                No paid subscription invoices found yet.
              </td>
            </tr>
          )}

          {invoices.map((inv, idx) => (
            <tr
              key={inv.id}
              className={`border-b border-slate-100 ${
                idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
              }`}
            >
              <td className="whitespace-nowrap px-3 py-3">
                <Link
                  href={`/subscription-bills/${inv.id}`}
                  className="text-[13px] font-medium text-blue-600 hover:underline"
                >
                  {inv.invoiceNumber}
                </Link>
              </td>

              <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                {formatInvoiceDate(inv.invoiceDate)}
              </td>

              <td className="px-3 py-3">
                <div className="text-[13px] font-medium text-slate-900">
                  {inv.planLabel}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {formatInvoiceDate(inv.periodFrom)} –{" "}
                  {formatInvoiceDate(inv.periodTo)}
                </div>
              </td>

              <td className="whitespace-nowrap px-3 py-3 text-[12px] capitalize text-slate-700">
                {inv.billingCycle}
              </td>

              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900">
                {formatMoney(inv.totalAmount, inv.currency)}
              </td>

              <td className="whitespace-nowrap px-3 py-3 text-[12px] text-slate-700">
                {inv.gstRate > 0 ? `${inv.gstRate}% GST` : "No GST"}
              </td>

              <td className="whitespace-nowrap px-3 py-3">
                {statusBadge(inv.status)}
              </td>

              <td className="whitespace-nowrap px-3 py-3 text-[13px]">
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
  );
}