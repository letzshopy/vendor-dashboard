"use client";

import { useMemo, useState } from "react";
import OrdersClient from "./OrdersClient";
import { ORDER_STATUSES, STATUS_LABEL, WCOrder } from "@/lib/order-utils";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

type Category = { id: number; name: string; parent: number };

const canon = (s?: string) =>
  (s || "").trim().toLowerCase().replace(/[^a-z-]/g, "");

function withinRange(date_gmt?: string, from?: string, to?: string) {
  if (!date_gmt) return true;
  const t = Date.parse(date_gmt + "Z");
  if (from) {
    const tFrom = Date.parse(from + "T00:00:00Z");
    if (t < tFrom) return false;
  }
  if (to) {
    const tTo = Date.parse(to + "T23:59:59Z");
    if (t > tTo) return false;
  }
  return true;
}

export default function OrdersLocalController({
  initial,
  categories = [],
}: {
  initial: WCOrder[];
  categories?: Category[];
}) {
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [s, setS] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filtersVersion, setFiltersVersion] = useState(0);
  const [searchVersion, setSearchVersion] = useState(0);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    let nonTrashTotal = 0;

    for (const o of initial) {
      const st = canon(o.status) || "pending";
      map[st] = (map[st] || 0) + 1;
      if (st !== "trash") nonTrashTotal++;
    }

    map["all"] = nonTrashTotal;
    return map;
  }, [initial]);

  const STATUS_TABS: { key: string; label: string }[] = [
    { key: "all", label: "All" },
    { key: "processing", label: STATUS_LABEL["processing"] || "Processing" },
    { key: "completed", label: STATUS_LABEL["completed"] || "Completed" },
    { key: "on-hold", label: STATUS_LABEL["on-hold"] || "On hold" },
    { key: "pending", label: STATUS_LABEL["pending"] || "Pending" },
    { key: "cancelled", label: STATUS_LABEL["cancelled"] || "Cancelled" },
    { key: "trash", label: "Trash" },
  ];

  const applied = useMemo(
    () => ({ status, from, to, v: filtersVersion }),
    [status, from, to, filtersVersion]
  );
  const query = useMemo(() => ({ s, v: searchVersion }), [s, searchVersion]);

  const filtered = useMemo(() => {
    let rows = initial;

    if (applied.status === "all") {
      rows = rows.filter((o) => canon(o.status) !== "trash");
    } else if (applied.status) {
      const want = canon(applied.status);
      if (want) rows = rows.filter((o) => canon(o.status) === want);
    }

    if (applied.from || applied.to) {
      rows = rows.filter((o) =>
        withinRange(o.date_created_gmt, applied.from, applied.to)
      );
    }

    if (query.s.trim()) {
      const q = query.s.trim().toLowerCase();
      rows = rows.filter((o) => {
        const idStr = String(o.id || "");
        const number = String(o.number || idStr).toLowerCase();
        const name = `${o.billing?.first_name || ""} ${
          o.billing?.last_name || ""
        }`.toLowerCase();
        const email = (o.billing?.email || "").toLowerCase();
        const phone = (o.billing?.phone || "").toLowerCase();

        if (
          idStr === q ||
          number.includes(q) ||
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q)
        ) {
          return true;
        }

        return (o.line_items || []).some(
          (li) =>
            (li.sku || "").toLowerCase().includes(q) ||
            (li.name || "").toLowerCase().includes(q)
        );
      });
    }

    return rows;
  }, [initial, applied, query]);

  const hasActiveFilters = Boolean(
    (status && status !== "all") || from || to || s.trim()
  );

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4">
          <h2 className="text-[16px] font-semibold text-slate-900">
            Status overview
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 p-4">
          {STATUS_TABS.map((tab) => {
            const active = status === tab.key;
            const count = statusCounts[tab.key] || 0;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatus(tab.key);
                  setFiltersVersion((v) => v + 1);
                }}
                className={`flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition ${
                  active
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-violet-300 hover:bg-violet-50/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <SlidersHorizontal className="h-4 w-4" />
              </span>

              <span className="text-sm font-semibold text-slate-800">
                Filters
              </span>

              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition ${
                  filtersOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {hasActiveFilters && (
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                Filters active
              </span>
            )}
          </div>
        </div>

        {filtersOpen && (
          <div className="border-t border-slate-100 px-4 pb-4 pt-4">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1.1fr]">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Status
                  </label>
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
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    From date
                  </label>
                  <input
                    type="date"
                    className="h-11 rounded-2xl border border-slate-200 px-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    value={from}
                    onChange={(e) => setFrom(e.currentTarget.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    To date
                  </label>
                  <input
                    type="date"
                    className="h-11 rounded-2xl border border-slate-200 px-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    value={to}
                    onChange={(e) => setTo(e.currentTarget.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Apply
                  </label>
                  <button
                    type="button"
                    className="h-11 w-full rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                    onClick={() => setFiltersVersion((v) => v + 1)}
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Search
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    placeholder="Search # / name / email / phone / SKU / product"
                    value={s}
                    onChange={(e) => setS(e.currentTarget.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setSearchVersion((v) => v + 1)
                    }
                  />
                  <button
                    type="button"
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    onClick={() => setSearchVersion((v) => v + 1)}
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <OrdersClient orders={filtered} categories={categories} />
    </div>
  );
}