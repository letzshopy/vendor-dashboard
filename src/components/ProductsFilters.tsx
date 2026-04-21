"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

type Category = { id: number; name: string; parent: number };

type Props = {
  categories: Category[];
  initialCategory: string;
  initialStock: string;
  initialType: string;
  rightSlot?: React.ReactNode;
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setCategory(initialCategory || "");
  }, [initialCategory]);

  useEffect(() => {
    setStock(initialStock || "");
  }, [initialStock]);

  useEffect(() => {
    setPtype(initialType || "");
  }, [initialType]);

  useEffect(() => {
    if (initialCategory || initialStock || initialType) {
      setOpen(true);
    }
  }, [initialCategory, initialStock, initialType]);

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
    <section>
      <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setOpen((s) => !s)}
                className="inline-flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-violet-300 hover:bg-violet-50/40"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <SlidersHorizontal className="h-4 w-4" />
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">
                    Filters
                  </span>
                </span>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>

              {hasFilters && (
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  Filters active
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
  {rightSlot}
</div>
          </div>
        </div>

        {open && (
          <div className="border-t border-slate-100 px-4 pb-4 pt-4 md:px-5 md:pb-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
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

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Stock
                </label>
                <select
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                >
                  <option value="">All</option>
                  <option value="instock">In stock</option>
                  <option value="outofstock">Out of stock</option>
                  <option value="onbackorder">On backorder</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Type
                </label>
                <select
                  value={ptype}
                  onChange={(e) => setPtype(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                >
                  <option value="">All</option>
                  <option value="simple">Simple</option>
                  <option value="variable">Variable</option>
                  <option value="grouped">Grouped</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
              >
                Apply
              </button>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}