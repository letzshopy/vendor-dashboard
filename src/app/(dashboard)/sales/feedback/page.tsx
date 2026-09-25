import Link from "next/link";
import {
  Image as ImageIcon,
  MessageSquareText,
  Plus,
} from "lucide-react";

import {
  buttonClassName,
} from "@/components/ui/button";
import {
  EmptyState,
} from "@/components/ui/empty-state";
import {
  PageHeader,
} from "@/components/ui/page-header";
import {
  fetchCustomerFeedbackList,
  feedbackStatusLabel,
  formatFeedbackDate,
} from "@/lib/customerFeedbackApi";

import FeedbackActionsClient from "./FeedbackActionsClient";

export const dynamic =
  "force-dynamic";

function toneClass(
  status: string
) {
  return status ===
    "hide"
    ? "bg-slate-100 text-slate-700"
    : "bg-emerald-50 text-emerald-700";
}

export default async function CustomerFeedbackPage() {
  const feedbacks =
    await fetchCustomerFeedbackList();

  const showingCount =
    feedbacks.filter(
      (item) =>
        item.status !==
        "hide"
    ).length;

  const hiddenCount =
    feedbacks.filter(
      (item) =>
        item.status ===
        "hide"
    ).length;

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
      <PageHeader
        className="hidden md:flex"
        eyebrow="Sales"
        icon={
          MessageSquareText
        }
        title="Customer Feedback"
        description="Manage customer messages and choose what appears on the storefront."
        actions={
          <Link
            href="/sales/feedback/new"
            className={buttonClassName({
              size: "md",
            })}
          >
            <Plus className="h-4 w-4" />
            Add Feedback
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-2 md:mt-5 md:max-w-xl md:gap-3">
        {[
          [
            "Total",
            feedbacks.length,
          ],
          [
            "Showing",
            showingCount,
          ],
          [
            "Hidden",
            hiddenCount,
          ],
        ].map(
          ([
            label,
            value,
          ]) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card px-3 py-2.5 md:rounded-2xl md:px-4 md:py-3"
            >
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {label}
              </div>
              <div className="mt-1 text-lg font-extrabold text-heading">
                {value}
              </div>
            </div>
          )
        )}
      </div>

      {feedbacks.length ===
      0 ? (
        <section className="mt-3 rounded-xl border border-border bg-card md:mt-4 md:rounded-2xl">
          <EmptyState
            icon={
              MessageSquareText
            }
            title="No customer feedback yet"
            description="Add a customer message when you want to feature feedback on the storefront."
            action={
              <Link
                href="/sales/feedback/new"
                className={buttonClassName({
                  size: "sm",
                })}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Feedback
              </Link>
            }
          />
        </section>
      ) : (
        <>
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card md:hidden">
            {feedbacks.map(
              (item) => (
                <article
                  key={
                    item.id
                  }
                  className="p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/sales/feedback/${item.id}`}
                        className="block truncate text-sm font-extrabold text-heading"
                      >
                        {item.customer_name ||
                          "Customer"}
                      </Link>

                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {item.order_number
                          ? `Order #${item.order_number}`
                          : item.customer_mobile ||
                            "No order linked"}
                      </div>
                    </div>

                    <span
                      className={`inline-flex min-h-6 shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass(
                        String(
                          item.status
                        )
                      )}`}
                    >
                      {feedbackStatusLabel(
                        String(
                          item.status
                        )
                      )}
                    </span>
                  </div>

                  <p className="mt-2.5 line-clamp-3 text-sm leading-5 text-foreground">
                    {item.customer_message ||
                      "—"}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-muted-foreground">
                      {formatFeedbackDate(
                        item.updated_at ||
                          item.created_at
                      )}
                    </span>

                    {item.image_url ? (
                      <a
                        href={
                          item.image_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-secondary px-2.5 text-[11px] font-bold text-secondary-foreground"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        Image
                      </a>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-border pt-2.5">
                    <Link
                      href={`/sales/feedback/${item.id}`}
                      className="ls-focus-ring inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      Edit
                    </Link>

                    <FeedbackActionsClient
                      id={
                        item.id
                      }
                      status={
                        String(
                          item.status
                        )
                      }
                    />
                  </div>
                </article>
              )
            )}
          </div>

          <section className="mt-4 hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
            <div className="overflow-x-auto">
              <table className="min-w-[920px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-soft text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">
                      Customer
                    </th>
                    <th className="px-4 py-3">
                      Order
                    </th>
                    <th className="px-4 py-3">
                      Message
                    </th>
                    <th className="px-4 py-3">
                      Image
                    </th>
                    <th className="px-4 py-3">
                      Status
                    </th>
                    <th className="px-4 py-3">
                      Updated
                    </th>
                    <th className="px-4 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {feedbacks.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                        className="border-b border-border last:border-b-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/sales/feedback/${item.id}`}
                            className="font-bold text-heading hover:text-primary"
                          >
                            {item.customer_name ||
                              "Customer"}
                          </Link>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {item.customer_mobile ||
                              "No mobile"}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-foreground">
                          {item.order_number
                            ? `#${item.order_number}`
                            : "—"}
                        </td>

                        <td className="max-w-[340px] px-4 py-3.5 text-foreground">
                          <p className="line-clamp-2">
                            {item.customer_message ||
                              "—"}
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          {item.image_url ? (
                            <a
                              href={
                                item.image_url
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-secondary px-2.5 text-[11px] font-bold text-secondary-foreground"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                              View
                            </a>
                          ) : (
                            <span className="text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass(
                              String(
                                item.status
                              )
                            )}`}
                          >
                            {feedbackStatusLabel(
                              String(
                                item.status
                              )
                            )}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground">
                          {formatFeedbackDate(
                            item.updated_at ||
                              item.created_at
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex justify-end gap-1">
                            <Link
                              href={`/sales/feedback/${item.id}`}
                              className="ls-focus-ring inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-xs font-semibold text-foreground hover:bg-muted"
                            >
                              Edit
                            </Link>

                            <FeedbackActionsClient
                              id={
                                item.id
                              }
                              status={
                                String(
                                  item.status
                                )
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
          </section>
        </>
      )}
    </main>
  );
}
