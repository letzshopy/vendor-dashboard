// src/app/orders/OrdersLocalController.tsx
"use client";

import { useMemo, useState } from "react";
import OrdersClient from "./OrdersClient";
import { ORDER_STATUSES, STATUS_LABEL, WCOrder } from "@/lib/order-utils";

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

  const [filtersVersion, setFiltersVersion] = useState(0);
  const [searchVersion, setSearchVersion] = useState(0);

  // Status counts for tabs
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
    { key: "pending", label: STATUS_LABEL["pending"] || "Pending payment" },
    { key: "cancelled", label: STATUS_LABEL["cancelled"] || "Cancelled" },
    { key: "trash", label: "Trash" },
  ];

  const applied = useMemo(
    () => ({ status, from, to, v: filtersVersion }),
    [status, from, to, filtersVersion]
  );
  const query = useMemo(
    () => ({ s, v: searchVersion }),
    [s, searchVersion]
  );

  const filtered = useMemo(() => {
    let rows = initial;

    // Status tab / dropdown
    if (applied.status === "all") {
      rows = rows.filter((o) => canon(o.status) !== "trash");
    } else if (applied.status) {
      const want = canon(applied.status);
      if (want) rows = rows.filter((o) => canon(o.status) === want);
    }

    // Date range
    if (applied.from || applied.to) {
      rows = rows.filter((o) =>
        withinRange(o.date_created_gmt, applied.from, applied.to)
      );
    }

    // Search
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

  return (
    <div className="space-y-4">
      {/* Status tabs card */}
      <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Status overview
        </div>
        <div className="flex flex-wrap gap-2">
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
                className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    active
                      ? "bg-white/15 text-white"
                      : "bg-white text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3 md:flex-row">
        {/* LEFT: Filters */}
        <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filters
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
              value={status}
              onChange={(e) => setStatus(e.currentTarget.value)}
            >
              <option value="all">All statuses (except Trash)</option>
              {ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABEL[st] || st}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
              value={from}
              onChange={(e) => setFrom(e.currentTarget.value)}
            />
            <input
              type="date"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
              value={to}
              onChange={(e) => setTo(e.currentTarget.value)}
            />
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              onClick={() => setFiltersVersion((v) => v + 1)}
            >
              Apply
            </button>
          </div>
        </div>

        {/* RIGHT: Search */}
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
              onKeyDown={(e) =>
                e.key === "Enter" && setSearchVersion((v) => v + 1)
              }
            />
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100"
              onClick={() => setSearchVersion((v) => v + 1)}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions + table */}
      <OrdersClient orders={filtered} categories={categories} />
    </div>
  );
}
