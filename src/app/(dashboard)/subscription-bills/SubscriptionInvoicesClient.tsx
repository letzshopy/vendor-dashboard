"use client";

import Link from "next/link";
import type { SubscriptionInvoice } from "@/lib/subscription-invoices";

function formatDate(d: string) {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Allow extra UI statuses beyond what the backend currently returns
type InvoiceStatus =
  | SubscriptionInvoice["status"]
  | "pending"
  | "overdue"
  | "failed";

function statusBadge(status: InvoiceStatus) {
  let classes =
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium";

  switch (status) {
    case "paid":
      classes += " bg-emerald-50 border-emerald-200 text-emerald-700";
      return (
        <span className={classes}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Paid (AutoPay – Easebuzz)
        </span>
      );

    case "pending":
      classes += " bg-amber-50 border-amber-200 text-amber-700";
      break;

    case "failed":
    case "overdue":
      classes += " bg-rose-50 border-rose-200 text-rose-700";
      break;

    default:
      classes += " bg-slate-50 border-slate-200 text-slate-700";
  }

  return <span className={classes}>{status}</span>;
}

export default function SubscriptionInvoicesClient({
  invoices,
}: {
  invoices: SubscriptionInvoice[];
}) {
  const hasInvoices = invoices.length > 0;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50/80 text-slate-600">
            <th className="text-left px-3 py-2.5 text-xs font-semibold border-b border-slate-100">
              Invoice #
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold border-b border-slate-100">
              Date
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold border-b border-slate-100">
              Plan
            </th>
            <th className="text-right px-3 py-2.5 text-xs font-semibold border-b border-slate-100">
              Amount
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold border-b border-slate-100">
              GST
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold border-b border-slate-100">
              Status
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold border-b border-slate-100">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {!hasInvoices && (
            <tr>
              <td
                colSpan={7}
                className="px-3 py-6 text-center text-sm text-slate-500"
              >
                No subscription invoices found yet.
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
              <td className="px-3 py-3 whitespace-nowrap">
                <Link
                  href={`/subscription-bills/${inv.id}`}
                  className="text-[13px] font-medium text-blue-600 hover:underline"
                >
                  {inv.number}
                </Link>
              </td>

              <td className="px-3 py-3 whitespace-nowrap text-slate-700">
                {formatDate(inv.date)}
              </td>

              <td className="px-3 py-3">
                <div className="text-[13px] font-medium text-slate-900">
                  {inv.planName}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {formatDate(inv.periodFrom)} – {formatDate(inv.periodTo)}
                </div>
              </td>

              <td className="px-3 py-3 text-right whitespace-nowrap font-semibold text-slate-900">
                ₹{inv.totalAmount.toLocaleString("en-IN")}
              </td>

              <td className="px-3 py-3 whitespace-nowrap text-[12px] text-slate-700">
                {inv.gstType === "gst"
                  ? `${inv.taxRate}% GST`
                  : "Non-GST invoice"}
              </td>

              <td className="px-3 py-3 whitespace-nowrap">
                {statusBadge(inv.status)}
              </td>

              <td className="px-3 py-3 whitespace-nowrap text-[13px]">
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
