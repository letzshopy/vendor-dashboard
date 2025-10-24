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

  // keep in sync on back/forward
  useEffect(() => {
    setStatus(sp.get("status") || "all");
    setDateFrom(sp.get("date_from") || "");
    setDateTo(sp.get("date_to") || "");
    setS(sp.get("s") || "");
  }, [sp]);

  // APPLY = only status + dates (like Products filters)
  const applyFilters = useCallback(() => {
    const qs = new URLSearchParams();
    if (status && status !== "all") qs.set("status", status);
    if (dateFrom) qs.set("date_from", dateFrom);
    if (dateTo) qs.set("date_to", dateTo);
    qs.set("page", "1");
    router.push(`/orders?${qs.toString()}`);
  }, [router, status, dateFrom, dateTo]);

  // SEARCH = only text search (like Products search)
  const applySearch = useCallback(() => {
    const qs = new URLSearchParams();
    if (s.trim()) qs.set("s", s.trim());
    qs.set("page", "1");
    router.push(`/orders?${qs.toString()}`);
  }, [router, s]);

  return (
    <div className="flex flex-col md:flex-row gap-3">
      {/* LEFT: Filter box */}
      <div className="flex-1 bg-white p-3 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select
            className="border rounded px-2 py-1"
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
            className="border rounded px-2 py-1"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.currentTarget.value)}
          />
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={dateTo}
            onChange={(e) => setDateTo(e.currentTarget.value)}
          />
          <div className="flex">
            <button type="button" onClick={applyFilters} className="border rounded px-3 py-1 w-full">
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Search box */}
      <div className="w-full md:w-[480px] bg-white p-3 rounded-lg shadow">
        <div className="flex gap-2">
          <input
            className="border rounded px-2 py-1 w-full"
            placeholder="Search # / name / email / phone / SKU / product"
            value={s}
            onChange={(e) => setS(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
          />
          <button type="button" className="border rounded px-3 py-1" onClick={applySearch}>
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
