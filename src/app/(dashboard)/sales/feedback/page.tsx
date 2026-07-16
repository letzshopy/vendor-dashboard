// src/app/(dashboard)/sales/feedback/page.tsx
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Image as ImageIcon,
  MessageSquareText,
  Plus,
  Trash2,
} from "lucide-react";
import {
  fetchCustomerFeedbackList,
  feedbackStatusClass,
  feedbackStatusLabel,
  formatFeedbackDate,
} from "@/lib/customerFeedbackApi";
import {
  deleteFeedbackAction,
  toggleFeedbackStatusAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function CustomerFeedbackPage() {
  const feedbacks = await fetchCustomerFeedbackList();

  const showingCount = feedbacks.filter((item) => item.status !== "hide").length;
  const hiddenCount = feedbacks.filter((item) => item.status === "hide").length;

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#f7f8ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
              <MessageSquareText className="h-3.5 w-3.5" />
              Sales
            </div>

            <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
              Customer Feedback
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Manage customer messages and choose which feedback should appear
              on your storefront.
            </p>
          </div>

          <Link
            href="/sales/feedback/new"
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Feedback
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 md:max-w-[620px]">
          <div className="min-w-0 rounded-[20px] bg-white/90 px-3 py-3 shadow-sm sm:px-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Total
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {feedbacks.length}
            </div>
          </div>

          <div className="min-w-0 rounded-[20px] bg-emerald-50 px-3 py-3 shadow-sm sm:px-4">
            <div className="text-[11px] uppercase tracking-wide text-emerald-700">
              Showing
            </div>
            <div className="mt-1 text-xl font-semibold text-emerald-800">
              {showingCount}
            </div>
          </div>

          <div className="min-w-0 rounded-[20px] bg-slate-100 px-3 py-3 shadow-sm sm:px-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Hidden
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-800">
              {hiddenCount}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {feedbacks.map((item) => (
          <article
            key={item.id}
            className="min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/sales/feedback/${item.id}`}
                  className="block break-words font-semibold text-slate-900 hover:text-indigo-700"
                >
                  {item.customer_name || "Customer"}
                </Link>
                <p className="mt-0.5 break-all text-[11px] text-slate-500">
                  {item.customer_mobile || "No mobile"}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${feedbackStatusClass(String(item.status))}`}
              >
                {feedbackStatusLabel(String(item.status))}
              </span>
            </div>

            <div className="mt-3 min-w-0 rounded-2xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Message
              </p>
              <p className="mt-1 break-words text-xs leading-5 text-slate-700">
                {item.customer_message || "—"}
              </p>
            </div>

            <dl className="mt-3 grid min-w-0 grid-cols-2 gap-3 text-xs">
              <div className="min-w-0 rounded-2xl bg-slate-50 p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Order
                </dt>
                <dd className="mt-1 break-words text-slate-700">
                  {item.order_number ? `#${item.order_number}` : "—"}
                </dd>
              </div>
              <div className="min-w-0 rounded-2xl bg-slate-50 p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Updated
                </dt>
                <dd className="mt-1 break-words text-slate-700">
                  {formatFeedbackDate(item.updated_at || item.created_at)}
                </dd>
              </div>
            </dl>

            {item.image_url ? (
              <a
                href={item.image_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-xl bg-indigo-50 px-3 text-xs font-semibold text-indigo-700"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                View feedback image
              </a>
            ) : null}

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Link
                href={`/sales/feedback/${item.id}`}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
              >
                Edit
              </Link>
              <form action={toggleFeedbackStatusAction} className="min-w-0">
                <input type="hidden" name="id" value={item.id} />
                <input
                  type="hidden"
                  name="status"
                  value={item.status === "hide" ? "show" : "hide"}
                />
                <button
                  type="submit"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                >
                  {item.status === "hide" ? (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Show
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      Hide
                    </>
                  )}
                </button>
              </form>
              <form action={deleteFeedbackAction} className="min-w-0">
                <input type="hidden" name="id" value={item.id} />
                <button
                  type="submit"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-xl border border-rose-100 bg-rose-50 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </form>
            </div>
          </article>
        ))}

        {feedbacks.length === 0 && (
          <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
            No customer feedback added yet.
          </div>
        )}
      </div>

      <div className="mt-4 hidden min-w-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm md:block">
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <table className="min-w-[980px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-semibold text-slate-500">
                  Customer
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500">
                  Order
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500">
                  Message
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500">
                  Image
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500">
                  Updated
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {feedbacks.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/sales/feedback/${item.id}`}
                      className="font-semibold text-slate-900 hover:text-indigo-700"
                    >
                      {item.customer_name || "Customer"}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {item.customer_mobile || "No mobile"}
                    </p>
                  </td>

                  <td className="px-4 py-3 align-top text-slate-700">
                    {item.order_number ? `#${item.order_number}` : "—"}
                  </td>

                  <td className="max-w-[320px] px-4 py-3 align-top text-slate-600">
                    <p className="line-clamp-2">{item.customer_message || "—"}</p>
                  </td>

                  <td className="px-4 py-3 align-top">
                    {item.image_url ? (
                      <a
                        href={item.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        View
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${feedbackStatusClass(
                        String(item.status)
                      )}`}
                    >
                      {feedbackStatusLabel(String(item.status))}
                    </span>
                  </td>

                  <td className="px-4 py-3 align-top text-slate-500">
                    {formatFeedbackDate(item.updated_at || item.created_at)}
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/sales/feedback/${item.id}`}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                      >
                        Edit
                      </Link>

                      <form action={toggleFeedbackStatusAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={item.status === "hide" ? "show" : "hide"}
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                        >
                          {item.status === "hide" ? (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              Show
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />
                              Hide
                            </>
                          )}
                        </button>
                      </form>

                      <form action={deleteFeedbackAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}

              {feedbacks.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No customer feedback added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}