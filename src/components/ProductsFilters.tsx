"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

type Category = { id: number; name: string; parent: number };

export default function ProductsFilters({
  categories,
  initialCategory,
  initialStock,
  initialType,
}: {
  categories: Category[];
  initialCategory: string;
  initialStock: "" | "instock" | "outofstock" | "onbackorder";
  initialType: "" | "simple" | "variable" | "grouped";
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [category, setCategory] = useState(initialCategory || "");
  const [stock, setStock] = useState(initialStock || "");
  const [ptype, setPtype] = useState(initialType || "");

  // keep controls in sync with URL changes (client nav)
  useEffect(() => {
    setCategory(initialCategory || "");
    setStock(initialStock || "");
    setPtype(initialType || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory, initialStock, initialType]);

  function apply() {
    const q = new URLSearchParams(params.toString());
    if (category) q.set("category", category); else q.delete("category");
    if (stock) q.set("stock", stock); else q.delete("stock");
    if (ptype) q.set("ptype", ptype); else q.delete("ptype");
    router.push(`/products?${q.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      {/* Bulk actions box will sit in the table header, not here */}

      <div className="flex flex-col">
        <label className="text-xs text-slate-600 mb-1">Filter by Categories</label>
        <select
          className="border rounded px-3 py-2 text-sm min-w-[220px]"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All</option>
          {categories
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-slate-600 mb-1">Filter by Stock</label>
        <select
          className="border rounded px-3 py-2 text-sm"
          value={stock}
          onChange={(e) => setStock(e.target.value as any)}
        >
          <option value="">All</option>
          <option value="instock">In stock</option>
          <option value="outofstock">Out of stock</option>
          <option value="onbackorder">On backorder</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-slate-600 mb-1">Filter by Type</label>
        <select
          className="border rounded px-3 py-2 text-sm"
          value={ptype}
          onChange={(e) => setPtype(e.target.value as any)}
        >
          <option value="">All</option>
          <option value="simple">Simple</option>
          <option value="variable">Variable</option>
          <option value="grouped">Grouped</option>
        </select>
      </div>

      <button
        onClick={apply}
        className="h-[38px] px-4 rounded border text-sm hover:bg-gray-50"
      >
        Apply
      </button>
    </div>
  );
}
