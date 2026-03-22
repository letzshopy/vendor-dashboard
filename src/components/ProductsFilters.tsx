"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Filter,
  Layers3,
  PackageCheck,
  Shapes,
  Sparkles,
  X,
} from "lucide-react";

type Category = { id: number; name: string; parent: number };

type Props = {
  categories: Category[];
  initialCategory: string;
  initialStock: string;
  initialType: string;
  rightSlot?: React.ReactNode;
};

function indentCats(cats: Category[]) {
  const byParent: Record<number, Category[]> = {};
  cats.forEach((c) => {
    byParent[c.parent] ??= [];
    byParent[c.parent].push(c);
  });

  const out: (Category & { depth: number })[] = [];

  (function walk(parent: number, depth: number) {
    (byParent[parent] || [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((c) => {
        out.push({ ...c, depth });
        walk(c.id, depth + 1);
      });
  })(0, 0);

  return out;
}

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

  const flatCats = useMemo(() => indentCats(categories), [categories]);
  const hasFilters = Boolean(category || stock || ptype);

  function applyFilters() {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (stock) params.set("stock", stock);
    if (ptype) params.set("ptype", ptype);
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products");
    setOpen(false);
  }

  function clearFilters() {
    setCategory("");
    setStock("");
    setPtype("");
    router.push("/products");
    setOpen(false);
  }

  const selectedCategoryName =
    flatCats.find((c) => String(c.id) === category)?.name || "All categories";

  const selectedStockLabel =
    stock === "instock"
      ? "In stock"
      : stock === "outofstock"
      ? "Out of stock"
      : stock === "onbackorder"
      ? "On backorder"
      : "Any stock";

  const selectedTypeLabel =
    ptype === "simple"
      ? "Simple"
      : ptype === "variable"
      ? "Variable"
      : ptype === "grouped"
      ? "Grouped"
      : "All types";

  return (
    <section className="rounded-[28px] border border-slate-200/70 bg-white shadow-sm shadow-slate-200/60">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#faf7ff] via-white to-[#eef7ff] px-4 py-4 md:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f2ebff] text-[#7a4cf0]">
                <Filter className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">
                    Filters
                  </h2>
                  {hasFilters && (
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Narrow your catalog by category, stock status and product type.
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <SummaryPill
                icon={Layers3}
                label={selectedCategoryName}
                active={Boolean(category)}
              />
              <SummaryPill
                icon={PackageCheck}
                label={selectedStockLabel}
                active={Boolean(stock)}
              />
              <SummaryPill
                icon={Shapes}
                label={selectedTypeLabel}
                active={Boolean(ptype)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rightSlot}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:border-violet-300 hover:text-violet-700"
            >
              <Sparkles className="h-4 w-4" />
              {open ? "Hide filters" : "Open filters"}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="space-y-4 px-4 py-4 md:px-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-slate-500">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              >
                <option value="">All categories</option>
                {flatCats.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {"— ".repeat(c.depth)}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-slate-500">
                Stock
              </label>
              <select
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              >
                <option value="">Any stock</option>
                <option value="instock">In stock</option>
                <option value="outofstock">Out of stock</option>
                <option value="onbackorder">On backorder</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-slate-500">
                Product type
              </label>
              <select
                value={ptype}
                onChange={(e) => setPtype(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              >
                <option value="">All types</option>
                <option value="simple">Simple</option>
                <option value="variable">Variable</option>
                <option value="grouped">Grouped</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              {hasFilters
                ? "Filters are ready. Apply them to refresh the product list."
                : "No filters selected. Apply is optional until you choose something."}
            </p>

            <div className="flex flex-wrap gap-2">
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}

              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex h-10 items-center rounded-2xl bg-gradient-to-r from-[#8b5cff] to-[#ff79c7] px-4 text-sm font-semibold text-white shadow-sm hover:brightness-105"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryPill({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm",
        active
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-slate-200 bg-white text-slate-600",
      ].join(" ")}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="max-w-[180px] truncate">{label}</span>
    </span>
  );
}