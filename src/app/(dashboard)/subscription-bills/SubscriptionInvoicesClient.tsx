"use client";

import {
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";

import {
  Button,
  buttonClassName,
} from "@/components/ui/button";
import {
  EmptyState,
} from "@/components/ui/empty-state";
import {
  StatusBadge,
} from "@/components/ui/status-badge";
import {
  formatInvoiceDate,
  formatMoney,
  type SubscriptionInvoice,
} from "@/lib/subscription-invoices";

export default function SubscriptionInvoicesClient({
  invoices,
}: {
  invoices:
    SubscriptionInvoice[];
}) {
  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    rowsPerPage,
    setRowsPerPage,
  ] =
    useState(10);

  const hasInvoices =
    invoices.length > 0;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        invoices.length /
          rowsPerPage
      )
    );

  const currentPage =
    Math.min(
      page,
      totalPages
    );

  const pageInvoices =
    useMemo(() => {
      const start =
        (
          currentPage -
          1
        ) *
        rowsPerPage;

      return invoices.slice(
        start,
        start +
          rowsPerPage
      );
    }, [
      invoices,
      currentPage,
      rowsPerPage,
    ]);

  const startIndex =
    invoices.length ===
    0
      ? 0
      : (
          currentPage -
          1
        ) *
          rowsPerPage +
        1;

  const endIndex =
    invoices.length ===
    0
      ? 0
      : Math.min(
          currentPage *
            rowsPerPage,
          invoices.length
        );

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 md:px-4">
        <div>
          <h2 className="text-sm font-extrabold text-heading md:text-base">
            Billing invoices
          </h2>

          <p className="mt-0.5 hidden text-xs text-muted-foreground md:block">
            Paid subscription and domain-renewal invoices.
          </p>
        </div>

        <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
          {
            invoices.length
          }{" "}
          invoice
          {invoices.length ===
          1
            ? ""
            : "s"}
        </span>
      </div>

      {!hasInvoices ? (
        <EmptyState
          icon={FileText}
          title="No billing invoices yet"
          description="Paid subscription and domain-renewal invoices will appear here."
        />
      ) : (
        <>
          <div className="divide-y divide-border md:hidden">
            {pageInvoices.map(
              (
                invoice
              ) => (
                <article
                  key={
                    invoice.id
                  }
                  className="p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/subscription-bills/${invoice.id}`}
                        className="block truncate text-sm font-extrabold text-primary"
                      >
                        {
                          invoice.invoiceNumber
                        }
                      </Link>

                      <div className="mt-0.5 truncate text-sm font-semibold text-heading">
                        {
                          invoice.planLabel
                        }
                      </div>

                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatInvoiceDate(
                          invoice.invoiceDate
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm font-extrabold text-heading">
                        {formatMoney(
                          invoice.totalAmount,
                          invoice.currency
                        )}
                      </div>

                      <div className="mt-1">
                        <StatusBadge
                          status={
                            invoice.status
                          }
                          label={
                            invoice.status ===
                            "paid"
                              ? "Paid"
                              : invoice.status
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-semibold text-foreground">
                      {invoice.serviceType ===
                      "domain_renewal"
                        ? "Domain Renewal"
                        : "Subscription"}
                    </span>

                    <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-semibold capitalize text-foreground">
                      {
                        invoice.billingCycle
                      }
                    </span>

                    <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-semibold text-foreground">
                      {invoice.gstRate >
                      0
                        ? `${invoice.gstRate}% GST`
                        : "No GST"}
                    </span>
                  </div>

                  <div className="mt-2.5 rounded-lg bg-surface-soft px-3 py-2 text-[11px] text-muted-foreground">
                    {formatInvoiceDate(
                      invoice.periodFrom
                    )}{" "}
                    –{" "}
                    {formatInvoiceDate(
                      invoice.periodTo
                    )}
                  </div>

                  <Link
                    href={`/subscription-bills/${invoice.id}`}
                    className={buttonClassName({
                      variant:
                        "outline",
                      size: "sm",
                      className:
                        "mt-3 w-full",
                    })}
                  >
                    View / Print
                  </Link>
                </article>
              )
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface-soft text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left">
                    Billing
                  </th>
                  <th className="px-4 py-3 text-right">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {pageInvoices.map(
                  (
                    invoice
                  ) => (
                    <tr
                      key={
                        invoice.id
                      }
                      className="border-t border-border hover:bg-muted/40"
                    >
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/subscription-bills/${invoice.id}`}
                          className="font-bold text-primary hover:underline"
                        >
                          {
                            invoice.invoiceNumber
                          }
                        </Link>

                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatInvoiceDate(
                            invoice.invoiceDate
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-heading">
                          {
                            invoice.planLabel
                          }
                        </div>

                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {invoice.serviceType ===
                          "domain_renewal"
                            ? "Domain Renewal"
                            : "Subscription"}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-foreground">
                        {formatInvoiceDate(
                          invoice.periodFrom
                        )}{" "}
                        –{" "}
                        {formatInvoiceDate(
                          invoice.periodTo
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs capitalize text-foreground">
                        {
                          invoice.billingCycle
                        }
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {invoice.gstRate >
                          0
                            ? `${invoice.gstRate}% GST`
                            : "No GST"}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-extrabold text-heading">
                        {formatMoney(
                          invoice.totalAmount,
                          invoice.currency
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusBadge
                          status={
                            invoice.status
                          }
                          label={
                            invoice.status ===
                            "paid"
                              ? "Paid"
                              : invoice.status
                          }
                        />
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/subscription-bills/${invoice.id}`}
                          className={buttonClassName({
                            variant:
                              "outline",
                            size:
                              "sm",
                          })}
                        >
                          View / Print
                        </Link>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-4">
            <div>
              Showing{" "}
              <span className="font-bold text-foreground">
                {
                  startIndex
                }
              </span>
              –
              <span className="font-bold text-foreground">
                {
                  endIndex
                }
              </span>{" "}
              of{" "}
              <span className="font-bold text-foreground">
                {
                  invoices.length
                }
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <label className="flex items-center gap-2">
                Rows
                <select
                  value={
                    rowsPerPage
                  }
                  onChange={(
                    event
                  ) => {
                    setRowsPerPage(
                      Number(
                        event.target
                          .value
                      ) ||
                        10
                    );
                    setPage(
                      1
                    );
                  }}
                  className="ls-focus-ring h-9 rounded-lg border border-input bg-card px-2 text-xs font-semibold text-foreground"
                >
                  <option value={10}>
                    10
                  </option>
                  <option value={20}>
                    20
                  </option>
                  <option value={50}>
                    50
                  </option>
                </select>
              </label>

              <div className="grid grid-cols-[40px_auto_40px] items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous page"
                  disabled={
                    currentPage <=
                    1
                  }
                  onClick={() =>
                    setPage(
                      (
                        current
                      ) =>
                        Math.max(
                          1,
                          current -
                            1
                        )
                    )
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="rounded-lg bg-surface-soft px-3 py-2 font-bold text-foreground">
                  {
                    currentPage
                  }{" "}
                  /{" "}
                  {
                    totalPages
                  }
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next page"
                  disabled={
                    currentPage >=
                    totalPages
                  }
                  onClick={() =>
                    setPage(
                      (
                        current
                      ) =>
                        Math.min(
                          totalPages,
                          current +
                            1
                        )
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
