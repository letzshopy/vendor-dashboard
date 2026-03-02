"use client";

import { useMemo, useState } from "react";

type P = {
  id: number;
  name: string;
  sku?: string;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  stock_status?: "instock" | "outofstock" | "onbackorder";
};

type StockFilter = "all" | "instock" | "outofstock" | "onbackorder";
type ManageFilter = "all" | "yes" | "no";

export default function InventoryClient({ initial }: { initial: P[] }) {
  const [rows] = useState<P[]>(initial);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [manageFilter, setManageFilter] = useState<ManageFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // summary numbers
  const stats = useMemo(() => {
    const total = rows.length;
    const inStock = rows.filter((p) => p.stock_status === "instock").length;
    const outStock = rows.filter((p) => p.stock_status === "outofstock").length;
    const lowStock = rows.filter((p) => {
      if (!p.manage_stock) return false;
      const q = p.stock_quantity ?? 0;
      return q > 0 && q <= 3;
    }).length;
    return { total, inStock, outStock, lowStock };
  }, [rows]);

  // filtered view
  const filtered = useMemo(() => {
    return rows.filter((p) => {
      if (stockFilter !== "all" && p.stock_status !== stockFilter) return false;
      if (manageFilter === "yes" && !p.manage_stock) return false;
      if (manageFilter === "no" && p.manage_stock) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q)
      );
    });
  }, [rows, stockFilter, manageFilter, search]);

  const allVisibleIds = filtered.map((p) => p.id);
  const allVisibleSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.includes(id));

  function toggleRow(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        // unselect visible
        return prev.filter((id) => !allVisibleIds.includes(id));
      }
      // add visible
      const set = new Set(prev);
      allVisibleIds.forEach((id) => set.add(id));
      return Array.from(set);
    });
  }

  function stockBadge(p: P) {
    const status = p.stock_status;
    const qty =
      typeof p.stock_quantity === "number" ? p.stock_quantity : undefined;

    let label = "Unknown";
    let bg = "bg-slate-50";
    let text = "text-slate-700";
    let ring = "ring-slate-100";

    if (status === "instock") {
      label = "In stock";
      bg = "bg-emerald-50";
      text = "text-emerald-700";
      ring = "ring-emerald-100";
    } else if (status === "outofstock") {
      label = "Out of stock";
      bg = "bg-rose-50";
      text = "text-rose-700";
      ring = "ring-rose-100";
    } else if (status === "onbackorder") {
      label = "On backorder";
      bg = "bg-amber-50";
      text = "text-amber-700";
      ring = "ring-amber-100";
    }

    return (
      <div className="flex flex-col gap-1">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${bg} ${text} ring-1 ${ring}`}
        >
          {label}
        </span>
        {typeof qty === "number" && (
          <span className="text-xs font-medium text-slate-700">
            Qty:{" "}
            <span
              className={
                status === "outofstock"
                  ? "text-rose-600"
                  : p.manage_stock && qty > 0 && qty <= 3
                  ? "text-amber-600"
                  : "text-emerald-700"
              }
            >
              {qty}
            </span>
          </span>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {/* Filters / summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
          <div>
            <div className="font-semibold text-slate-900">
              {stats.total} products
            </div>
            <div className="text-[11px] text-slate-500">
              {stats.inStock} in stock · {stats.outStock} out of stock ·{" "}
              {stats.lowStock} low-stock
            </div>
          </div>
          {selectedIds.length > 0 && (
            <div className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-medium text-violet-700">
              {selectedIds.length} selected
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            className="w-32 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          >
            <option value="all">All stock</option>
            <option value="instock">In stock</option>
            <option value="outofstock">Out of stock</option>
            <option value="onbackorder">On backorder</option>
          </select>

          <select
            className="w-32 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            value={manageFilter}
            onChange={(e) => setManageFilter(e.target.value as ManageFilter)}
          >
            <option value="all">All types</option>
            <option value="yes">Managed only</option>
            <option value="no">Not managed</option>
          </select>

          <div className="relative">
            <input
              className="w-48 rounded-full border border-slate-200 bg-white px-3 py-1.5 pl-3 text-xs text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 sm:text-sm"
              placeholder="Search by title or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs text-slate-800 sm:text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th className="px-3 py-2">Title</th>
                <th className="w-32 px-3 py-2">SKU</th>
                <th className="w-40 px-3 py-2">Stock</th>
                <th className="w-28 px-3 py-2">Manage stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr
                  key={p.id}
                  className={`border-t border-slate-100 ${
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                  }`}
                >
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleRow(p.id)}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="max-w-xs text-sm font-medium text-slate-900">
                      {p.name}
                    </div>
                    {p.sku && (
                      <div className="mt-0.5 text-[11px] font-mono text-slate-500">
                        SKU: {p.sku}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="text-sm font-mono text-slate-800">
                      {p.sku || <span className="text-slate-400">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">{stockBadge(p)}</td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                        p.manage_stock
                          ? "bg-slate-900 text-slate-50"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.manage_stock ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    No products match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
