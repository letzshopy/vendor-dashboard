"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckSquare, Download, FileSpreadsheet, X } from "lucide-react";
import type { ProductCsvColumn } from "@/types/import";
import { PRODUCT_CSV_COLUMNS } from "@/types/import";

type Category = { id: number; name: string; parent: number };

export default function ExportProductsModal({
  open,
  onClose,
  categories: categoriesProp = [],
  enableFetchFallback = false,
  fallbackApi = "/api/categories",
}: {
  open: boolean;
  onClose: () => void;
  categories?: Category[];
  enableFetchFallback?: boolean;
  fallbackApi?: string;
}) {
  const [categories, setCategories] = useState<Category[]>(categoriesProp || []);
  const [category, setCategory] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [ptype, setPtype] = useState<string>("");

  const [cols, setCols] = useState<ProductCsvColumn[]>([
    ...PRODUCT_CSV_COLUMNS,
  ]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setCategories(categoriesProp || []);
  }, [categoriesProp]);

  useEffect(() => {
    if (!enableFetchFallback) return;
    if (categoriesProp && categoriesProp.length) return;

    (async () => {
      try {
        const r = await fetch(fallbackApi);
        const j = await r.json();
        if (j?.ok && Array.isArray(j.items)) setCategories(j.items);
      } catch {
        // ignore
      }
    })();
  }, [enableFetchFallback, fallbackApi, categoriesProp]);

  if (!open || !mounted) return null;

  function toggleCol(c: ProductCsvColumn) {
    setCols((arr) =>
      arr.includes(c)
        ? (arr.filter((x) => x !== c) as ProductCsvColumn[])
        : [...arr, c]
    );
  }

  function download() {
    const q = new URLSearchParams();
    if (category) q.set("category", category);
    if (stock) q.set("stock", stock);
    if (ptype) q.set("ptype", ptype);
    q.set("columns", cols.join(","));
    window.location.href = `/api/export/products?${q.toString()}`;
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-4xl overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:rounded-[28px]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#faf7ff] via-white to-[#eef7ff] px-4 py-4 md:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f2ebff] text-[#7a4cf0]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Export products
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Choose filters and columns, then download a compatible CSV.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-5 px-4 py-4 md:grid-cols-2 md:px-5">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 text-sm font-semibold text-slate-900">
                Export filters
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-slate-500">
                    Product category
                  </label>
                  <select
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Export all categories</option>
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

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-slate-500">
                    Product type
                  </label>
                  <select
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    value={ptype}
                    onChange={(e) => setPtype(e.target.value)}
                  >
                    <option value="">All products</option>
                    <option value="simple">Simple</option>
                    <option value="variable">Variable</option>
                    <option value="grouped">Grouped</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-slate-500">
                    Stock status
                  </label>
                  <select
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  >
                    <option value="">Any stock</option>
                    <option value="instock">In stock</option>
                    <option value="outofstock">Out of stock</option>
                    <option value="onbackorder">On backorder</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CheckSquare className="h-4 w-4 text-violet-600" />
                Selected columns
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {cols.length} columns selected for export.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-900">
              Columns to export
            </div>
            <div className="mb-3 text-xs text-slate-500">
              You can re-use the same CSV for updates using the import tool.
            </div>

            <div className="max-h-[320px] overflow-auto rounded-2xl border border-slate-200 bg-white px-3 py-2">
              {PRODUCT_CSV_COLUMNS.map((c) => (
                <label
                  key={c}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    checked={cols.includes(c)}
                    onChange={() => toggleCol(c)}
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <button
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            onClick={download}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}