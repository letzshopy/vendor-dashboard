"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Category = { id: number; name: string; parent: number };

type Props = {
  categories: Category[];
  initialCategory: string;
  initialStock: string;
  initialType: string;
  rightSlot?: React.ReactNode; // Import/Export bar
};

export default function ProductsFilters({
  categories,
  initialCategory,
  initialStock,
  initialType,
  rightSlot,
}: Props) {
  const router = useRouter();

  const [category, setCategory] = useState(initialCategory || "");
  const [stock, setStock] = useState(initialStock || "");
  const [ptype, setPtype] = useState(initialType || "");

  useEffect(() => {
    setCategory(initialCategory || "");
  }, [initialCategory]);

  useEffect(() => {
    setStock(initialStock || "");
  }, [initialStock]);

  useEffect(() => {
    setPtype(initialType || "");
  }, [initialType]);

  const hasFilters = Boolean(category || stock || ptype);

  function applyFilters() {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (stock) params.set("stock", stock);
    if (ptype) params.set("ptype", ptype);
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products");
  }

  function clearFilters() {
    setCategory("");
    setStock("");
    setPtype("");
    router.push("/products");
  }

  return (
    <section className="mt-4">
      <div className="rounded-2xl border border-violet-100 bg-white/80 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm">
        {/* Header row: title + Import/Export + Apply */}
        <div className="flex flex-col gap-3 border-b border-violet-50 px-5 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-500">
              🔍
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Filters</h2>
              <p className="text-xs text-slate-500">
                Quickly slice your catalog by category, stock status and product type.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rightSlot && rightSlot}
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              Apply filters
            </button>
          </div>
        </div>

        {/* Body: three dropdowns + status line */}
        <div className="space-y-3 px-5 pb-4 pt-3">
          <div className="grid gap-3 md:grid-cols-3">
            {/* Category */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Filter by Categories
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-full border border-violet-100 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.06)] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
              >
                <option value="">All</option>
                {categories
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Stock */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Filter by Stock
              </label>
              <select
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full rounded-full border border-violet-100 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.06)] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
              >
                <option value="">All</option>
                <option value="instock">In stock</option>
                <option value="outofstock">Out of stock</option>
                <option value="onbackorder">On backorder</option>
              </select>
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Filter by Type
              </label>
              <select
                value={ptype}
                onChange={(e) => setPtype(e.target.value)}
                className="w-full rounded-full border border-violet-100 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.06)] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
              >
                <option value="">All</option>
                <option value="simple">Simple</option>
                <option value="variable">Variable</option>
                <option value="grouped">Grouped</option>
              </select>
            </div>
          </div>

          {/* Status line + Clear button */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {hasFilters
                ? "Filters active. Adjust or clear to see your full catalog."
                : "No filters applied. Showing your full catalog."}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-medium text-violet-600 hover:text-violet-700"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
