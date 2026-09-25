"use client";

import {
  useRouter,
} from "next/navigation";
import {
  ArrowLeft,
  Printer,
  ReceiptText,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";
import {
  PageHeader,
} from "@/components/ui/page-header";
import {
  StatusBadge,
} from "@/components/ui/status-badge";
import {
  actionFeedback,
} from "@/lib/actionFeedback";
import {
  formatInvoiceDate,
  formatMoney,
  type SubscriptionInvoice,
} from "@/lib/subscription-invoices";

export default function InvoiceDetailClient({
  invoice,
}: {
  invoice:
    SubscriptionInvoice;
}) {
  const router =
    useRouter();

  const isDomainRenewal =
    invoice.serviceType ===
    "domain_renewal";

  function handlePrint() {
    const invoiceElement =
      document.getElementById(
        "billing-invoice-print"
      );

    if (
      !invoiceElement
    ) {
      return;
    }

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=900,height=1200"
      );

    if (!printWindow) {
      actionFeedback.warning({
        id:
          "invoice-print-popup",
        title:
          "Allow pop-ups to print",
        message:
          "Your browser blocked the invoice print window.",
        durationMs: 4200,
      });

      return;
    }

    const styles =
      Array.from(
        document.querySelectorAll(
          'link[rel="stylesheet"], style'
        )
      )
        .map(
          (node) =>
            node.outerHTML
        )
        .join("\n");

    printWindow.document.open();

    printWindow.document.write(
      `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <base href="${document.baseURI}" />
          <title>${invoice.invoiceNumber}</title>
          ${styles}
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            #billing-invoice-print {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              border: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
          </style>
        </head>
        <body>${invoiceElement.outerHTML}</body>
      </html>`
    );

    printWindow.document.close();

    const printInvoice =
      () => {
        printWindow.focus();
        printWindow.print();
      };

    printWindow.addEventListener(
      "afterprint",
      () =>
        printWindow.close(),
      {
        once: true,
      }
    );

    if (
      printWindow.document
        .readyState ===
      "complete"
    ) {
      window.setTimeout(
        printInvoice,
        250
      );
    } else {
      printWindow.addEventListener(
        "load",
        printInvoice,
        {
          once: true,
        }
      );
    }
  }

  return (
    <div className="space-y-4 print:space-y-0">
      <PageHeader
        className="hidden print:hidden md:flex"
        eyebrow="Reports & Billing · Subscription Invoices"
        icon={ReceiptText}
        title={
          invoice.invoiceNumber
        }
        description="View, print or save this billing invoice as PDF."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.back()
              }
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              type="button"
              onClick={
                handlePrint
              }
            >
              <Printer className="h-4 w-4" />
              Print / PDF
            </Button>
          </>
        }
      />

      <div className="flex justify-end print:hidden md:hidden">
        <Button
          type="button"
          size="sm"
          onClick={
            handlePrint
          }
        >
          <Printer className="h-3.5 w-3.5" />
          Print / PDF
        </Button>
      </div>

      <article
        id="billing-invoice-print"
        className="rounded-xl border border-border bg-card p-4 print:border-none print:bg-white print:p-0 md:rounded-2xl md:p-6"
      >
        <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between md:pb-5">
          <div>
            <div className="text-lg font-extrabold text-heading md:text-xl">
              {isDomainRenewal
                ? "LetzShopy Domain Renewal Invoice"
                : "LetzShopy Subscription Invoice"}
            </div>

            <div className="mt-1 text-xs leading-5 text-muted-foreground md:text-sm">
              LetzShopy
              <br />
              SaaS Store Builder Platform
            </div>
          </div>

          <div className="space-y-1 text-xs text-foreground sm:text-right md:text-sm">
            <div className="font-extrabold text-heading">
              Invoice #
              {
                invoice.invoiceNumber
              }
            </div>

            <div>
              {formatInvoiceDate(
                invoice.invoiceDate
              )}
            </div>

            <div className="flex sm:justify-end">
              <StatusBadge
                status="paid"
                label="Paid"
                tone="success"
              />
            </div>

            <div>
              {invoice.paymentMode ||
                "UPI"}
            </div>

            {invoice.paymentReference ? (
              <div className="max-w-[260px] break-all font-mono text-[10px] text-muted-foreground md:text-xs">
                {
                  invoice.paymentReference
                }
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 py-4 text-sm md:grid-cols-2 md:gap-4 md:py-5">
          <section className="rounded-xl bg-surface-soft p-3 md:rounded-2xl md:p-4">
            <div className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              Billed To
            </div>

            <div className="mt-2 font-bold text-heading">
              {
                invoice.billingName
              }
            </div>

            <pre className="mt-1.5 whitespace-pre-wrap font-sans text-sm leading-5 text-foreground">
              {
                invoice.billingAddress
              }
            </pre>

            <div className="mt-2 text-xs text-muted-foreground">
              State:{" "}
              {
                invoice.billingState
              }
              {invoice.billingPhone
                ? ` · Ph: ${invoice.billingPhone}`
                : ""}
            </div>

            {invoice.gstNumber ? (
              <div className="mt-1.5 text-xs text-muted-foreground">
                GSTIN:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {
                    invoice.gstNumber
                  }
                </span>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl bg-surface-soft p-3 md:rounded-2xl md:p-4">
            <div className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              {isDomainRenewal
                ? "Domain Service"
                : "Subscription"}
            </div>

            <div className="mt-2 font-bold text-heading">
              {
                invoice.planLabel
              }
            </div>

            {isDomainRenewal &&
            invoice.domainName ? (
              <div className="mt-1.5 text-sm text-foreground">
                Domain:{" "}
                <span className="font-semibold">
                  {
                    invoice.domainName
                  }
                </span>
              </div>
            ) : null}

            <div className="mt-1.5 text-xs capitalize text-muted-foreground">
              Billing:{" "}
              {
                invoice.billingCycle
              }
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              {formatInvoiceDate(
                invoice.periodFrom
              )}{" "}
              –{" "}
              {formatInvoiceDate(
                invoice.periodTo
              )}
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[1fr_auto] gap-3 bg-surface-soft px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground md:text-xs">
            <div>
              Description
            </div>
            <div>
              Amount
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3 px-3 py-3.5 text-sm">
            <div className="min-w-0">
              <div className="font-bold text-heading">
                {
                  invoice.planLabel
                }
              </div>

              <div className="mt-0.5 text-xs text-muted-foreground">
                {isDomainRenewal
                  ? "Renewal service"
                  : "Subscription"}{" "}
                ·{" "}
                {formatInvoiceDate(
                  invoice.periodFrom
                )}{" "}
                to{" "}
                {formatInvoiceDate(
                  invoice.periodTo
                )}
              </div>
            </div>

            <div className="font-bold text-heading">
              {formatMoney(
                invoice.taxableAmount,
                invoice.currency
              )}
            </div>
          </div>
        </section>

        <div className="mt-4 flex justify-end md:mt-5">
          <div className="w-full rounded-xl bg-surface-soft p-3 text-sm sm:max-w-sm md:rounded-2xl md:p-4">
            <div className="flex justify-between gap-3 py-1 text-foreground">
              <span>
                Subtotal
              </span>

              <span className="font-semibold">
                {formatMoney(
                  invoice.taxableAmount,
                  invoice.currency
                )}
              </span>
            </div>

            <div className="flex justify-between gap-3 py-1 text-foreground">
              <span>
                GST @{" "}
                {
                  invoice.gstRate
                }
                %
              </span>

              <span className="font-semibold">
                {formatMoney(
                  invoice.gstAmount,
                  invoice.currency
                )}
              </span>
            </div>

            <div className="mt-2 flex justify-between gap-3 border-t border-border pt-3 text-base font-extrabold text-heading">
              <span>
                Total
              </span>

              <span>
                {formatMoney(
                  invoice.totalAmount,
                  invoice.currency
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-3 text-[10px] leading-5 text-muted-foreground md:mt-6 md:text-[11px]">
          This is a system generated tax invoice for your LetzShopy{" "}
          {isDomainRenewal
            ? "domain renewal service"
            : "subscription"}
          . For any queries, contact{" "}
          <span className="font-semibold text-foreground">
            support@letzshopy.in
          </span>
          .
        </div>
      </article>
    </div>
  );
}
