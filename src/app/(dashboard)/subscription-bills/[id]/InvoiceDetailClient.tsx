"use client";

import { useRouter } from "next/navigation";
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

export default function InvoiceDetailClient({
  invoice,
}: {
  invoice: SubscriptionInvoice;
}) {
  const router = useRouter();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white/95 rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 print:bg-white print:shadow-none print:border-none">
      {/* Top actions (hidden on print) */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to invoices
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
          >
            Print / Download PDF
          </button>
        </div>
      </div>

      {/* Invoice header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            LetzShopy Subscription Invoice
          </h1>
          <div className="mt-1 text-sm text-slate-600">
            LetzShopy – SaaS Store Builder Platform
            <br />
            (Your company address here)
          </div>
        </div>

        <div className="text-right text-sm space-y-1">
          <div className="font-semibold text-slate-900">
            Invoice #{invoice.number}
          </div>
          <div className="text-slate-700">Date: {formatDate(invoice.date)}</div>

          <div className="mt-1">
            <span className="text-slate-600">Status: </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Paid (AutoPay – Easebuzz)
            </span>
          </div>
          <div className="text-slate-600">
            Payment Mode: {invoice.paymentMode || "Easebuzz AutoPay"}
          </div>
        </div>
      </div>

      {/* Billing + subscription details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
        <div className="space-y-1">
          <div className="font-semibold text-slate-900">Billed To</div>
          <div className="font-medium text-slate-900">
            {invoice.billingName}
          </div>
          <pre className="whitespace-pre-wrap text-slate-700">
            {invoice.billingAddress}
          </pre>
          <div className="mt-1 text-slate-600">
            State: {invoice.billingState}
            {invoice.billingPhone ? ` · Ph: ${invoice.billingPhone}` : null}
          </div>
          {invoice.gstType === "gst" && invoice.gstNumber && (
            <div className="mt-1 text-slate-600">
              GSTIN:{" "}
              <span className="font-mono text-slate-900">
                {invoice.gstNumber}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-slate-900">
            Subscription Details
          </div>
          <div className="font-medium text-slate-900">
            {invoice.planName}
          </div>
          <div className="mt-1 text-slate-600">
            Period: {formatDate(invoice.periodFrom)} –{" "}
            {formatDate(invoice.periodTo)}
          </div>
          <div className="mt-1 text-slate-600">
            Payment Mode: {invoice.paymentMode || "Easebuzz AutoPay"}
          </div>
          <div className="mt-1 text-slate-600">
            Invoice Type:{" "}
            {invoice.gstType === "gst" ? "GST Invoice" : "Non-GST Invoice"}
          </div>
        </div>
      </div>

      {/* Line item table */}
      <table className="w-full text-sm border-t border-b border-slate-200 mb-4">
        <thead className="bg-slate-50/80">
          <tr>
            <th className="text-left px-3 py-2 border-b border-slate-200 text-xs font-semibold text-slate-600">
              Description
            </th>
            <th className="text-right px-3 py-2 border-b border-slate-200 text-xs font-semibold text-slate-600">
              Amount (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="px-3 py-2 align-top">
              <div className="font-medium text-slate-900">
                {invoice.planName}
              </div>
              <div className="mt-0.5 text-[12px] text-slate-500">
                Subscription from {formatDate(invoice.periodFrom)} to{" "}
                {formatDate(invoice.periodTo)}
              </div>
            </td>
            <td className="px-3 py-2 text-right align-top text-slate-900">
              {invoice.amountExclTax.toLocaleString("en-IN")}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full md:w-72 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-slate-600">Subtotal</span>
            <span className="text-slate-900">
              ₹{invoice.amountExclTax.toLocaleString("en-IN")}
            </span>
          </div>
          {invoice.gstType === "gst" && invoice.taxRate > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-slate-600">GST @ {invoice.taxRate}%</span>
              <span className="text-slate-900">
                ₹{invoice.taxAmount.toLocaleString("en-IN")}
              </span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-slate-200 py-2 font-semibold">
            <span className="text-slate-900">Total</span>
            <span className="text-slate-900">
              ₹{invoice.totalAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-6 text-[11px] text-slate-500">
        This is a system generated{" "}
        {invoice.gstType === "gst" ? "tax invoice" : "invoice"} for your
        LetzShopy subscription. For any queries, please contact{" "}
        <span className="font-medium">support@letzshopy.in</span>.
      </div>
    </div>
  );
}
