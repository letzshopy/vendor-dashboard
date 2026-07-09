// src/app/(dashboard)/sale-events/page.tsx
import Link from "next/link";
import {
  CalendarRange,
  Gift,
  Plus,
  Trash2,
} from "lucide-react";
import {
  fetchSaleEvents,
  formatSaleEventDate,
  saleEventStatusClass,
  saleEventStatusLabel,
  salePricingLabel,
} from "@/lib/saleEventsApi";
import { deleteSaleEventAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SaleEventsPage() {
  const events = await fetchSaleEvents();
  const live = events.filter((item) => item.status === "live").length;
  const scheduled = events.filter((item) => item.status === "scheduled").length;
  const closed = events.filter((item) => item.status === "closed").length;

  return (
    <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#faf6ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
              <Gift className="h-3.5 w-3.5" />
              Catalog
            </div>

            <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
              Sale Events
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Group products into scheduled sale campaigns with percentage, fixed amount, manual price, or free shipping offers.
            </p>
          </div>

          <Link
            href="/sale-events/new"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#8b5cff] to-[#ff7ac3] px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 md:px-5"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 md:max-w-[760px] md:gap-3">
          {[
            ["Total", events.length, "bg-white/90 text-slate-900"],
            ["Live", live, "bg-emerald-50 text-emerald-800"],
            ["Scheduled", scheduled, "bg-amber-50 text-amber-800"],
            ["Closed", closed, "bg-slate-100 text-slate-700"],
          ].map(([label, count, cls]) => (
            <div key={String(label)} className={`rounded-[18px] px-3 py-3 shadow-sm md:px-4 ${cls}`}>
              <div className="text-[10px] uppercase tracking-wide opacity-70 md:text-[11px]">
                {label}
              </div>
              <div className="mt-1 text-lg font-semibold md:text-xl">{count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-semibold text-slate-500">Event</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Period</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Products</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Offer Type</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Homepage</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody>
              {events.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/sale-events/${item.id}`}
                      className="font-semibold text-slate-900 hover:text-indigo-700"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-slate-400">{item.slug}</p>
                    {item.promotional_copy ? (
                      <p
                        title={item.promotional_copy}
                        className="mt-1 max-w-[360px] line-clamp-2 text-[11px] leading-4 text-slate-500"
                      >
                        {item.promotional_copy}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-4 py-3 align-top text-slate-600">
                    <div className="inline-flex items-center gap-1.5">
                      <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        {formatSaleEventDate(item.start_date)} – {formatSaleEventDate(item.end_date)}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top font-semibold text-slate-700">
                    {item.effective_product_count}
                  </td>

                  <td className="px-4 py-3 align-top text-slate-600">
                    {salePricingLabel(item.pricing_type, item.discount_value)}
                  </td>


                  <td className="px-4 py-3 align-top">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${saleEventStatusClass(item.status)}`}>
                      {saleEventStatusLabel(item.status)}
                    </span>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      item.homepage_visible
                        ? "border-violet-200 bg-violet-50 text-violet-700"
                        : "border-slate-200 bg-slate-100 text-slate-500"
                    }`}>
                      {item.homepage_visible ? "Visible" : "Hidden"}
                    </span>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/sale-events/${item.id}`}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                      >
                        Edit
                      </Link>

                      <form action={deleteSaleEventAction}>
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

              {events.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                    No Sale Events created yet.
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
