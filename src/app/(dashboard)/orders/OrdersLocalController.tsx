"use client";

import { useMemo, useRef, useState } from "react";
import OrdersClient from "./OrdersClient";
import { STATUS_LABEL, WCOrder } from "@/lib/order-utils";
import { ChevronRight, SlidersHorizontal } from "lucide-react";

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
  storeName = "Your Store",
}: {
  initial: WCOrder[];
  categories?: Category[];
  storeName?: string;
}) {
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [s, setS] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const statusRailRef = useRef<HTMLDivElement | null>(null);

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

  const hasDateFilters = Boolean(from || to);

  return (
    <div className="space-y-4">
      <section
        aria-label="Order status"
        className="relative -mx-3 md:mx-0"
      >
        <div
          ref={statusRailRef}
          className="flex gap-2 overflow-x-auto px-3 pb-1 pr-14 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:px-0 md:pr-0"
        >
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
                className={[
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition",
                  active
                    ? "bg-[#5366B7] text-white shadow-[0_5px_14px_rgba(83,102,183,0.22)]"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                <span>{tab.label}</span>

                <span
                  className={[
                    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    active
                      ? "bg-white/18 text-white"
                      : "bg-slate-100 text-slate-500",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-14 items-center justify-end bg-gradient-to-l from-white via-white/95 to-transparent pr-2 md:hidden">
          <button
            type="button"
            aria-label="Scroll order statuses"
            onClick={() =>
              statusRailRef.current?.scrollBy({
                left: 180,
                behavior: "smooth",
              })
            }
            className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[#5366B7] shadow-md"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="search"
            className="h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#8C98D0] focus:ring-2 focus:ring-[#E6E9F8]"
            placeholder="Search order, customer, phone, SKU..."
            value={s}
            onChange={(e) => setS(e.currentTarget.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && setSearchVersion((v) => v + 1)
            }
          />

          <button
            type="button"
            aria-label="Filter orders"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
            className={[
              "relative inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border px-3.5 text-sm font-semibold shadow-sm transition",
              filtersOpen || hasDateFilters
                ? "border-[#AAB4E1] bg-[#EEF1FF] text-[#405296]"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            <SlidersHorizontal className="h-4.5 w-4.5" />
            <span className="hidden sm:inline">Filters</span>

            {hasDateFilters ? (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#5366B7]" />
            ) : null}
          </button>
        </div>

        {filtersOpen ? (
          <>
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
              className="fixed inset-0 z-[80] bg-slate-950/35 backdrop-blur-[1px] md:hidden"
            />

            <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-[90] max-h-[70dvh] overflow-y-auto rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.28)] md:static md:z-auto md:max-h-none md:rounded-2xl md:border md:p-4 md:shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[15px] font-bold text-slate-900">
                    Filter orders
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Narrow orders by date
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Done
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0 space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    From
                  </label>

                  <input
                    type="date"
                    className="h-11 w-full min-w-0 rounded-2xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-[#8C98D0] focus:ring-2 focus:ring-[#E6E9F8]"
                    value={from}
                    onChange={(e) => setFrom(e.currentTarget.value)}
                  />
                </div>

                <div className="min-w-0 space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    To
                  </label>

                  <input
                    type="date"
                    className="h-11 w-full min-w-0 rounded-2xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-[#8C98D0] focus:ring-2 focus:ring-[#E6E9F8]"
                    value={to}
                    onChange={(e) => setTo(e.currentTarget.value)}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    setFiltersVersion((v) => v + 1);
                  }}
                  className="h-11 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Clear dates
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFiltersVersion((v) => v + 1);
                    setFiltersOpen(false);
                  }}
                  className="h-11 rounded-2xl bg-[#5366B7] text-sm font-semibold text-white shadow-sm hover:bg-[#4558A8]"
                >
                  Apply
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
      <OrdersClient
        orders={filtered}
        categories={categories}
        storeName={storeName}
      />
    </div>
  );
}