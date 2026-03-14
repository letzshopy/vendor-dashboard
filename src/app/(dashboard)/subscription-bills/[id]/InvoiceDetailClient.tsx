"use client";

import { useRouter } from "next/navigation";
import {
  formatInvoiceDate,
  formatMoney,
  type SubscriptionInvoice,
} from "@/lib/subscription-invoices";

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
    <div className="rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-sm print:border-none print:bg-white print:shadow-none sm:p-6">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to invoices
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
        >
          Print / Download PDF
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            LetzShopy Subscription Invoice
          </h1>
          <div className="mt-1 text-sm text-slate-600">
            LetzShopy
            <br />
            SaaS Store Builder Platform
          </div>
        </div>

        <div className="space-y-1 text-right text-sm">
          <div className="font-semibold text-slate-900">
            Invoice #{invoice.invoiceNumber}
          </div>
          <div className="text-slate-700">
            Date: {formatInvoiceDate(invoice.invoiceDate)}
          </div>
          <div>
            <span className="text-slate-600">Status: </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Paid
            </span>
          </div>
          <div className="text-slate-600">
            Payment Mode: {invoice.paymentMode || "UPI"}
          </div>
          {invoice.paymentReference ? (
            <div className="text-slate-600">
              Payment Ref: {invoice.paymentReference}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
        <div className="space-y-1">
          <div className="font-semibold text-slate-900">Billed To</div>
          <div className="font-medium text-slate-900">{invoice.billingName}</div>
          <pre className="whitespace-pre-wrap text-slate-700">
            {invoice.billingAddress}
          </pre>
          <div className="mt-1 text-slate-600">
            State: {invoice.billingState}
            {invoice.billingPhone ? ` · Ph: ${invoice.billingPhone}` : null}
          </div>
          {invoice.gstNumber ? (
            <div className="mt-1 text-slate-600">
              GSTIN:{" "}
              <span className="font-mono text-slate-900">
                {invoice.gstNumber}
              </span>
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-slate-900">
            Subscription Details
          </div>
          <div className="font-medium text-slate-900">{invoice.planLabel}</div>
          <div className="mt-1 capitalize text-slate-600">
            Billing Cycle: {invoice.billingCycle}
          </div>
          <div className="mt-1 text-slate-600">
            Period: {formatInvoiceDate(invoice.periodFrom)} –{" "}
            {formatInvoiceDate(invoice.periodTo)}
          </div>
          <div className="mt-1 text-slate-600">
            Invoice Type: GST Invoice
          </div>
        </div>
      </div>

      <table className="mb-4 w-full border-t border-b border-slate-200 text-sm">
        <thead className="bg-slate-50/80">
          <tr>
            <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">
              Description
            </th>
            <th className="border-b border-slate-200 px-3 py-2 text-right text-xs font-semibold text-slate-600">
              Amount (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="px-3 py-2 align-top">
              <div className="font-medium text-slate-900">
                {invoice.planLabel}
              </div>
              <div className="mt-0.5 text-[12px] text-slate-500">
                Subscription from {formatInvoiceDate(invoice.periodFrom)} to{" "}
                {formatInvoiceDate(invoice.periodTo)}
              </div>
            </td>
            <td className="px-3 py-2 text-right align-top text-slate-900">
              {formatMoney(invoice.taxableAmount, invoice.currency)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-full text-sm md:w-80">
          <div className="flex justify-between py-1">
            <span className="text-slate-600">Subtotal</span>
            <span className="text-slate-900">
              {formatMoney(invoice.taxableAmount, invoice.currency)}
            </span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-slate-600">GST @ {invoice.gstRate}%</span>
            <span className="text-slate-900">
              {formatMoney(invoice.gstAmount, invoice.currency)}
            </span>
          </div>

          <div className="mt-1 flex justify-between border-t border-slate-200 py-2 font-semibold">
            <span className="text-slate-900">Total</span>
            <span className="text-slate-900">
              {formatMoney(invoice.totalAmount, invoice.currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 text-[11px] text-slate-500">
        This is a system generated tax invoice for your LetzShopy subscription.
        For any queries, please contact{" "}
        <span className="font-medium">support@letzshopy.in</span>.
      </div>
    </div>
  );
}