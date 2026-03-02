"use client";

import { useEffect, useState } from "react";

type Category = { id: number; name: string; parent: number };

export default function OrdersExportButton({
  categories: categoriesProp = [],
}: {
  categories?: Category[];
}) {
  const [open, setOpen] = useState(false);

  // filters
  const [status, setStatus] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<
    | "all"
    | "today"
    | "yesterday"
    | "this_week"
    | "this_month"
    | "last_month"
    | "custom"
  >("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [cat, setCat] = useState<string>("");

  // categories list (server-prop or fallback fetch)
  const [categories, setCategories] = useState<Category[]>(categoriesProp || []);
  useEffect(() => setCategories(categoriesProp || []), [categoriesProp]);

  useEffect(() => {
    if (!open) return;
    if (categoriesProp && categoriesProp.length) return;
    (async () => {
      try {
        const r = await fetch("/api/categories", { cache: "no-store" });
        const j = await r.json().catch(() => null);
        if (j?.ok && Array.isArray(j.items)) setCategories(j.items);
      } catch {
        // ignore
      }
    })();
  }, [open, categoriesProp]);

  // disable custom inputs unless preset == custom
  const customEnabled = datePreset === "custom";
  useEffect(() => {
    if (!customEnabled) {
      setFrom("");
      setTo("");
    }
  }, [customEnabled]);

  function buildQuery() {
    const q = new URLSearchParams();
    if (status && status !== "all") q.set("status", status);
    if (cat) q.set("category", cat);

    if (datePreset === "custom") {
      if (from) q.set("from", from);
      if (to) q.set("to", to);
    } else if (datePreset !== "all") {
      q.set("preset", datePreset);
    }

    return q.toString();
  }

  async function download() {
    const qs = buildQuery();
    const url = `/api/export/orders${qs ? `?${qs}` : ""}`;
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <>
      {/* Trigger button in bulk bar */}
      <button
        type="button"
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
        onClick={() => setOpen(true)}
      >
        Export
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[740px] max-w-[95vw] rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Export Orders
                </h3>
                <p className="text-xs text-slate-500">
                  Download filtered orders as a CSV for reports or accounting.
                </p>
              </div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
              {/* LEFT */}
              <div className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Order filters
                </div>

                <label className="block text-xs">
                  <div className="mb-1 text-slate-700">Order status</div>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    value={status}
                    onChange={(e) => setStatus(e.currentTarget.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On hold</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending payment</option>
                  </select>
                </label>

                <label className="block text-xs">
                  <div className="mb-1 text-slate-700">Date filter</div>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    value={datePreset}
                    onChange={(e) =>
                      setDatePreset(
                        e.currentTarget.value as typeof datePreset
                      )
                    }
                  >
                    <option value="all">All</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this_week">This week</option>
                    <option value="this_month">This month</option>
                    <option value="last_month">Last month</option>
                    <option value="custom">Custom range</option>
                  </select>
                </label>
              </div>

              {/* RIGHT */}
              <div className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Product & dates
                </div>

                <label className="block text-xs">
                  <div className="mb-1 text-slate-700">Product category</div>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    value={cat}
                    onChange={(e) => setCat(e.currentTarget.value)}
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  <div className="text-[11px] font-medium text-slate-600">
                    Custom range
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      value={from}
                      onChange={(e) => setFrom(e.currentTarget.value)}
                      disabled={!customEnabled}
                    />
                    <input
                      type="date"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      value={to}
                      onChange={(e) => setTo(e.currentTarget.value)}
                      disabled={!customEnabled}
                    />
                  </div>
                  {!customEnabled && (
                    <div className="text-[11px] text-slate-500">
                      Switch date filter to{" "}
                      <span className="font-semibold">Custom range</span> to use
                      these dates.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 border-t px-4 py-3">
              <button
                type="button"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={download}
              >
                Download CSV
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
