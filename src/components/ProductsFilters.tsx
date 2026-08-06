"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  SlidersHorizontal,
  X,
} from "lucide-react";

type Category = {
  id: number;
  name: string;
  parent: number;
};

type Props = {
  categories: Category[];
  initialCategory: string;
  initialStock: string;
  initialType: string;
  rightSlot?: ReactNode;
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

  const activeFilterCount = [category, stock, ptype].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;

  function applyFilters() {
    const params = new URLSearchParams();

    if (category) params.set("category", category);
    if (stock) params.set("stock", stock);
    if (ptype) params.set("ptype", ptype);

    const queryString = params.toString();

    router.push(
      queryString
        ? `/products?${queryString}`
        : "/products"
    );
  }

  function clearFilters() {
    setCategory("");
    setStock("");
    setPtype("");
    setOpen(false);
    router.push("/products");
  }

  return (
    <section className="min-w-0 border-b border-[#E8EBF2] bg-white px-3 py-2.5 md:px-4">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className={[
              "inline-flex min-h-9 items-center gap-2 rounded-xl border px-3.5 text-sm font-bold transition active:scale-[0.98]",
              open || hasFilters
                ? "border-[#C9D0E8] bg-[#EEF1FA] text-[#2E3F7D]"
                : "border-slate-200 bg-white text-slate-700",
            ].join(" ")}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters

            {hasFilters ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#5366B7] px-1.5 text-[10px] text-white">
                {activeFilterCount}
              </span>
            ) : null}

            <ChevronDown
              className={[
                "h-4 w-4 transition-transform",
                open ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2 text-xs font-bold text-slate-500"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          ) : null}
        </div>

        {rightSlot ? (
          <div className="ml-auto min-w-0">
            {rightSlot}
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="-mx-3 mt-2.5 border-t border-[#E8EBF2] bg-[#F8F9FC] px-3 py-3 md:-mx-4 md:px-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="min-w-0">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Category
              </span>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#5366B7] focus:ring-2 focus:ring-[#E5E8F6]"
              >
                <option value="">All categories</option>

                {categories
                  .slice()
                  .sort((first, second) =>
                    first.name.localeCompare(second.name)
                  )
                  .map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Stock
              </span>

              <select
                value={stock}
                onChange={(event) => setStock(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#5366B7] focus:ring-2 focus:ring-[#E5E8F6]"
              >
                <option value="">All stock</option>
                <option value="instock">In stock</option>
                <option value="outofstock">Out of stock</option>
                <option value="onbackorder">On backorder</option>
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Product type
              </span>

              <select
                value={ptype}
                onChange={(event) => setPtype(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#5366B7] focus:ring-2 focus:ring-[#E5E8F6]"
              >
                <option value="">All types</option>
                <option value="simple">Simple</option>
                <option value="variable">Variable</option>
                <option value="grouped">Grouped</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#E85D4A] px-5 text-sm font-bold text-white"
            >
              Apply filters
            </button>

            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
