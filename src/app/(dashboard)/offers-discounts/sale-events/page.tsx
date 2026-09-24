import Link from "next/link";
import {
  CalendarRange,
  Plus,
} from "lucide-react";

import {
  EmptyState,
} from "@/components/ui/empty-state";
import {
  PageHeader,
} from "@/components/ui/page-header";
import {
  StatusBadge,
} from "@/components/ui/status-badge";
import SaleEventDeleteButton from "@/components/offers/SaleEventDeleteButton";
import {
  fetchSaleEvents,
  formatSaleEventDate,
  salePricingLabel,
} from "@/lib/saleEventsApi";
import {
  deleteSaleEventAction,
} from "../../sale-events/actions";

export const dynamic =
  "force-dynamic";

export default async function SaleEventsPage() {
  const events =
    await fetchSaleEvents();

  const live =
    events.filter(
      (item) =>
        item.status ===
        "live"
    ).length;

  const scheduled =
    events.filter(
      (item) =>
        item.status ===
        "scheduled"
    ).length;

  const closed =
    events.filter(
      (item) =>
        item.status ===
        "closed"
    ).length;

  return (
    <main className="ls-page mx-auto max-w-[1440px] px-3 pb-28 pt-4 md:px-4 md:pb-8 md:pt-5">
      <div className="hidden md:block">
        <PageHeader
          eyebrow="Offers & Discounts"
          icon={CalendarRange}
          title="Sale Events"
          description="Schedule product discounts or free-shipping campaigns."
          actions={
            <Link
              href="/offers-discounts/sale-events/new"
              className="ls-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-95"
            >
              <Plus className="h-4 w-4" />
              Create event
            </Link>
          }
        />
      </div>

      <div className="flex items-center justify-between gap-3 md:hidden">
        <div>
          <span className="text-[21px] font-extrabold tracking-tight text-heading">
            {events.length}
          </span>
          <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
            events
          </span>
        </div>

        <Link
          href="/offers-discounts/sale-events/new"
          className="ls-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Create
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 md:mt-5">
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          {live} live
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
          {scheduled} scheduled
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
          {closed} closed
        </span>
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        {events.length ===
        0 ? (
          <EmptyState
            icon={CalendarRange}
            title="No sale events yet"
            description="Create your first scheduled promotion."
            action={
              <Link
                href="/offers-discounts/sale-events/new"
                className="ls-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Create event
              </Link>
            }
          />
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {events.map(
                (item) => (
                  <article
                    key={
                      item.id
                    }
                    className="px-4 py-3"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={
                            `/offers-discounts/sale-events/${item.id}`
                          }
                          className="block truncate text-sm font-extrabold text-heading"
                        >
                          {
                            item.title
                          }
                        </Link>

                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatSaleEventDate(
                            item.start_date
                          )}{" "}
                          –{" "}
                          {formatSaleEventDate(
                            item.end_date
                          )}
                        </div>
                      </div>

                      <StatusBadge
                        status={
                          item.status
                        }
                        label={
                          item.status ===
                          "live"
                            ? "Live"
                            : item.status ===
                                "scheduled"
                              ? "Scheduled"
                              : "Closed"
                        }
                        tone={
                          item.status ===
                          "live"
                            ? "success"
                            : item.status ===
                                "scheduled"
                              ? "warning"
                              : "neutral"
                        }
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {salePricingLabel(
                          item.pricing_type,
                          item.discount_value
                        )}
                      </span>

                      <span>
                        {
                          item.effective_product_count
                        }{" "}
                        products
                      </span>

                      <span>
                        {item.homepage_visible
                          ? "Homepage"
                          : "Not on homepage"}
                      </span>
                    </div>

                    {item.promotional_copy ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {
                          item.promotional_copy
                        }
                      </p>
                    ) : null}

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Link
                        href={
                          `/offers-discounts/sale-events/${item.id}`
                        }
                        className="ls-focus-ring inline-flex min-h-10 items-center rounded-xl px-3 text-xs font-bold text-primary hover:bg-secondary"
                      >
                        Edit
                      </Link>

                      <SaleEventDeleteButton
                        id={
                          String(
                            item.id
                          )
                        }
                        title={
                          item.title
                        }
                        action={
                          deleteSaleEventAction
                        }
                      />
                    </div>
                  </article>
                )
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-soft text-left text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">
                      Event
                    </th>
                    <th className="px-3 py-3">
                      Period
                    </th>
                    <th className="px-3 py-3">
                      Offer
                    </th>
                    <th className="px-3 py-3 text-right">
                      Products
                    </th>
                    <th className="px-3 py-3">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {events.map(
                    (
                      item
                    ) => (
                      <tr
                        key={
                          item.id
                        }
                        className="transition hover:bg-muted/50"
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            href={
                              `/offers-discounts/sale-events/${item.id}`
                            }
                            className="font-bold text-heading hover:text-primary"
                          >
                            {
                              item.title
                            }
                          </Link>

                          {item.promotional_copy ? (
                            <div className="mt-0.5 max-w-[28rem] truncate text-xs text-muted-foreground">
                              {
                                item.promotional_copy
                              }
                            </div>
                          ) : null}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3.5 text-muted-foreground">
                          {formatSaleEventDate(
                            item.start_date
                          )}{" "}
                          –{" "}
                          {formatSaleEventDate(
                            item.end_date
                          )}
                        </td>

                        <td className="px-3 py-3.5 text-foreground">
                          {salePricingLabel(
                            item.pricing_type,
                            item.discount_value
                          )}
                        </td>

                        <td className="px-3 py-3.5 text-right font-semibold text-foreground">
                          {
                            item.effective_product_count
                          }
                        </td>

                        <td className="px-3 py-3.5">
                          <StatusBadge
                            status={
                              item.status
                            }
                            label={
                              item.status ===
                              "live"
                                ? "Live"
                                : item.status ===
                                    "scheduled"
                                  ? "Scheduled"
                                  : "Closed"
                            }
                            tone={
                              item.status ===
                              "live"
                                ? "success"
                                : item.status ===
                                    "scheduled"
                                  ? "warning"
                                  : "neutral"
                            }
                          />
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={
                                `/offers-discounts/sale-events/${item.id}`
                              }
                              className="ls-focus-ring inline-flex min-h-10 items-center rounded-xl px-3 text-xs font-bold text-primary hover:bg-secondary"
                            >
                              Edit
                            </Link>

                            <SaleEventDeleteButton
                              id={
                                String(
                                  item.id
                                )
                              }
                              title={
                                item.title
                              }
                              action={
                                deleteSaleEventAction
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
