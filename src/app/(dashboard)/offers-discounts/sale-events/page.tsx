import Link from "next/link";
import {
  CalendarRange,
  Home,
  Package,
  Plus,
  Tag,
} from "lucide-react";

import {
  ButtonLink,
} from "@/components/ui/button-link";
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
          title="Offer Sale"
          description="Create and schedule product offers or free-shipping campaigns."
          actions={
            <ButtonLink
              href="/offers-discounts/sale-events/new"
            >
              <Plus className="h-4 w-4" />
              New Offer
            </ButtonLink>
          }
        />
      </div>

      <div className="flex items-center justify-between gap-3 md:hidden">
        <div>
          <span className="text-[21px] font-extrabold tracking-tight text-heading">
            {events.length}
          </span>
          <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
            offers
          </span>
        </div>

        <ButtonLink
          href="/offers-discounts/sale-events/new"
        >
          <Plus className="h-4 w-4" />
          New Offer
        </ButtonLink>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 md:mt-5">
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          {live} live
        </span>

        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
          {scheduled} scheduled
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
          {closed} ended
        </span>
      </div>

      {events.length === 0 ? (
        <section className="mt-4 rounded-2xl border border-border bg-card">
          <EmptyState
            icon={CalendarRange}
            title="No offers yet"
            description="Create your first scheduled sale offer."
            action={
              <ButtonLink
                href="/offers-discounts/sale-events/new"
              >
                <Plus className="h-4 w-4" />
                New Offer
              </ButtonLink>
            }
          />
        </section>
      ) : (
        <>
          <div className="mt-4 grid gap-3 md:hidden">
            {events.map(
              (item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_5px_18px_rgba(38,51,95,0.05)]"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3 px-4 pt-4">
                    <div className="min-w-0">
                      <Link
                        href={`/offers-discounts/sale-events/${item.id}`}
                        className="block truncate text-[15px] font-extrabold text-heading"
                      >
                        {item.title}
                      </Link>

                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {formatSaleEventDate(
                            item.start_date
                          )}{" "}
                          –{" "}
                          {formatSaleEventDate(
                            item.end_date
                          )}
                        </span>
                      </div>
                    </div>

                    <StatusBadge
                      status={item.status}
                      label={
                        item.status ===
                        "live"
                          ? "Live"
                          : item.status ===
                              "scheduled"
                            ? "Scheduled"
                            : "Ended"
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

                  <div className="mt-4 grid grid-cols-3 border-y border-border bg-surface-soft">
                    <div className="min-w-0 px-3 py-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        Offer
                      </div>
                      <div className="mt-1 truncate text-xs font-extrabold text-heading">
                        {salePricingLabel(
                          item.pricing_type,
                          item.discount_value
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 border-l border-border px-3 py-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                        <Package className="h-3 w-3" />
                        Products
                      </div>
                      <div className="mt-1 text-xs font-extrabold text-heading">
                        {item.effective_product_count}
                      </div>
                    </div>

                    <div className="min-w-0 border-l border-border px-3 py-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                        <Home className="h-3 w-3" />
                        Homepage
                      </div>
                      <div className="mt-1 text-xs font-extrabold text-heading">
                        {item.homepage_visible
                          ? "Visible"
                          : "Hidden"}
                      </div>
                    </div>
                  </div>

                  {item.promotional_copy ? (
                    <p className="line-clamp-2 px-4 pt-3 text-xs leading-5 text-muted-foreground">
                      {item.promotional_copy}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-end gap-2 px-3 py-3">
                    <ButtonLink
                      href={`/offers-discounts/sale-events/${item.id}`}
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                    >
                      Edit
                    </ButtonLink>

                    <SaleEventDeleteButton
                      id={String(
                        item.id
                      )}
                      title={item.title}
                      action={
                        deleteSaleEventAction
                      }
                    />
                  </div>
                </article>
              )
            )}
          </div>

          <section className="mt-4 hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-soft text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">
                    Offer
                  </th>
                  <th className="px-3 py-3">
                    Dates
                  </th>
                  <th className="px-3 py-3">
                    Discount
                  </th>
                  <th className="px-3 py-3 text-right">
                    Products
                  </th>
                  <th className="px-3 py-3">
                    Homepage
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
                  (item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-muted/40"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/offers-discounts/sale-events/${item.id}`}
                          className="font-extrabold text-heading hover:text-primary"
                        >
                          {item.title}
                        </Link>

                        {item.promotional_copy ? (
                          <div className="mt-0.5 max-w-[24rem] truncate text-xs text-muted-foreground">
                            {item.promotional_copy}
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

                      <td className="px-3 py-3.5 font-semibold text-foreground">
                        {salePricingLabel(
                          item.pricing_type,
                          item.discount_value
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-right font-bold text-heading">
                        {item.effective_product_count}
                      </td>

                      <td className="px-3 py-3.5 text-foreground">
                        {item.homepage_visible
                          ? "Visible"
                          : "Hidden"}
                      </td>

                      <td className="px-3 py-3.5">
                        <StatusBadge
                          status={item.status}
                          label={
                            item.status ===
                            "live"
                              ? "Live"
                              : item.status ===
                                  "scheduled"
                                ? "Scheduled"
                                : "Ended"
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
                          <ButtonLink
                            href={`/offers-discounts/sale-events/${item.id}`}
                            variant="ghost"
                            size="sm"
                            className="text-primary"
                          >
                            Edit
                          </ButtonLink>

                          <SaleEventDeleteButton
                            id={String(
                              item.id
                            )}
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
          </section>
        </>
      )}
    </main>
  );
}
