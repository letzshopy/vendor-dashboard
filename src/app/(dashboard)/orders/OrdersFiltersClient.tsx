"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/order-utils";

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
    <div className="flex flex-col gap-3 md:flex-row">
      {/* Filters */}
      <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Filters
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
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
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.currentTarget.value)}
          />

          <input
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            value={dateTo}
            onChange={(e) => setDateTo(e.currentTarget.value)}
          />

          <button
            type="button"
            onClick={applyFilters}
            className="rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Apply
          </button>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="w-full rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:w-[480px]">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Search
        </div>

        <div className="flex gap-2">
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            placeholder="Search # / name / email / phone / SKU / product"
            value={s}
            onChange={(e) => setS(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
          />

          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100"
            onClick={applySearch}
          >
            Search
          </button>

          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={clearSearch}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}