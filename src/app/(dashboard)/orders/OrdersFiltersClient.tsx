"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/order-utils";
import { Search, SlidersHorizontal } from "lucide-react";

type Props = {
  initial: { status: string; date_from: string; date_to: string; s: string };
};

export default function OrdersFiltersClient({ initial }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const [status, setStatus] = useState(initial.status || "all");
  const [dateFrom, setDateFrom] = useState(initial.date_from || "");
  const [dateTo, setDateTo] = useState(initial.date_to || "");
  const [s, setS] = useState(initial.s || "");

  useEffect(() => {
    setStatus(sp.get("status") || "all");
    setDateFrom(sp.get("date_from") || "");
    setDateTo(sp.get("date_to") || "");
    setS(sp.get("s") || "");
  }, [sp]);

  const applyFilters = useCallback(() => {
    const qs = new URLSearchParams();
    if (status && status !== "all") qs.set("status", status);
    if (dateFrom) qs.set("date_from", dateFrom);
    if (dateTo) qs.set("date_to", dateTo);
    qs.set("page", "1");
    router.push(`/orders?${qs.toString()}`);
  }, [router, status, dateFrom, dateTo]);

  const clearFilters = useCallback(() => {
    setStatus("all");
    setDateFrom("");
    setDateTo("");

    const qs = new URLSearchParams();
    const searchValue = s.trim();
    if (searchValue) qs.set("s", searchValue);
    qs.set("page", "1");

    router.push(`/orders?${qs.toString()}`);
  }, [router, s]);

  const applySearch = useCallback(() => {
    const qs = new URLSearchParams();
    const searchValue = s.trim();
    if (searchValue) qs.set("s", searchValue);
    qs.set("page", "1");
    router.push(`/orders?${qs.toString()}`);
  }, [router, s]);

  const clearSearch = useCallback(() => {
    setS("");

    const qs = new URLSearchParams();
    if (status && status !== "all") qs.set("status", status);
    if (dateFrom) qs.set("date_from", dateFrom);
    if (dateTo) qs.set("date_to", dateTo);
    qs.set("page", "1");

    router.push(`/orders?${qs.toString()}`);
  }, [router, status, dateFrom, dateTo]);

  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_1.1fr]">
      <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-violet-600" />
            <h2 className="text-[16px] font-semibold text-slate-900">Filters</h2>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-4">
          <select
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
            value={status}
            onChange={(e) => setStatus(e.currentTarget.value)}
          >
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((st) => (
              <option key={st} value={st}>
                {STATUS_LABEL[st] || st}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.currentTarget.value)}
          />

          <input
            type="date"
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
            value={dateTo}
            onChange={(e) => setDateTo(e.currentTarget.value)}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Apply
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-violet-600" />
            <h2 className="text-[16px] font-semibold text-slate-900">Search</h2>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row">
          <input
            className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
            placeholder="Search # / name / email / phone / SKU / product"
            value={s}
            onChange={(e) => setS(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
          />

          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={applySearch}
            >
              Search
            </button>

            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={clearSearch}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}