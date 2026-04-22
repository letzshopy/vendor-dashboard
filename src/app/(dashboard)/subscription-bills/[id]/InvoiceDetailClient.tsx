"use client";

import { useRouter } from "next/navigation";
import {
  formatInvoiceDate,
  formatMoney,
  type SubscriptionInvoice,
} from "@/lib/subscription-invoices";
import { ArrowLeft, Printer, ReceiptText } from "lucide-react";

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
    <div className="space-y-4 print:space-y-0">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#f7f8ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] print:hidden md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
              <ReceiptText className="h-3.5 w-3.5" />
              Invoice Detail
            </div>

            <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
              {invoice.invoiceNumber}
            </h1>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" />
              Print / PDF
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] print:border-none print:bg-white print:p-0 print:shadow-none sm:p-6">
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

          <div className="space-y-1 text-left text-sm sm:text-right">
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
              <div className="break-all text-slate-600">
                Payment Ref: {invoice.paymentReference}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div className="font-semibold text-slate-900">Billed To</div>
            <div className="mt-2 font-medium text-slate-900">
              {invoice.billingName}
            </div>
            <pre className="mt-2 whitespace-pre-wrap text-slate-700 font-sans">
              {invoice.billingAddress}
            </pre>
            <div className="mt-2 text-slate-600">
              State: {invoice.billingState}
              {invoice.billingPhone ? ` · Ph: ${invoice.billingPhone}` : null}
            </div>
            {invoice.gstNumber ? (
              <div className="mt-2 text-slate-600">
                GSTIN:{" "}
                <span className="font-mono text-slate-900">
                  {invoice.gstNumber}
                </span>
              </div>
            ) : null}
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div className="font-semibold text-slate-900">
              Subscription Details
            </div>
            <div className="mt-2 font-medium text-slate-900">
              {invoice.planLabel}
            </div>
            <div className="mt-2 capitalize text-slate-600">
              Billing Cycle: {invoice.billingCycle}
            </div>
            <div className="mt-1 text-slate-600">
              Period: {formatInvoiceDate(invoice.periodFrom)} –{" "}
              {formatInvoiceDate(invoice.periodTo)}
            </div>
            <div className="mt-1 text-slate-600">Invoice Type: GST Invoice</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold text-slate-600">
                  Description
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-right text-xs font-semibold text-slate-600">
                  Amount (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-3 align-top">
                  <div className="font-medium text-slate-900">
                    {invoice.planLabel}
                  </div>
                  <div className="mt-0.5 text-[12px] text-slate-500">
                    Subscription from {formatInvoiceDate(invoice.periodFrom)} to{" "}
                    {formatInvoiceDate(invoice.periodTo)}
                  </div>
                </td>
                <td className="px-3 py-3 text-right align-top text-slate-900">
                  {formatMoney(invoice.taxableAmount, invoice.currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <div className="w-full rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm md:w-80">
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

            <div className="mt-2 flex justify-between border-t border-slate-200 pt-3 font-semibold">
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
    </div>
  );
}