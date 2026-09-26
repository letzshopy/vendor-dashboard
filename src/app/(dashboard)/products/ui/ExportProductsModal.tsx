"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { actionFeedback } from "@/lib/actionFeedback";
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
  const [downloading, setDownloading] = useState(false);

  // ensure we only portal on the client
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

  async function download() {
    if (downloading) return;

    const q = new URLSearchParams();
    if (category) q.set("category", category);
    if (stock) q.set("stock", stock);
    if (ptype) q.set("ptype", ptype);
    q.set("columns", cols.join(","));

    const feedbackId = "products-export";
    setDownloading(true);

    actionFeedback.loading({
      id: feedbackId,
      title: "Preparing product export…",
      message: "Building your CSV file.",
    });

    try {
      const response = await fetch(
        `/api/export/products?${q.toString()}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Product export failed.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = "products.csv";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      actionFeedback.success({
        id: feedbackId,
        title: "Product export ready",
        message: "CSV download started.",
        durationMs: 2600,
      });

      onClose();
    } catch (error) {
      actionFeedback.error({
        id: feedbackId,
        title: "Export failed",
        message:
          error instanceof Error ? error.message : "Please try again.",
        durationMs: 4200,
      });
    } finally {
      setDownloading(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm md:items-center md:p-4">
      <div className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl ring-1 ring-slate-900/5 md:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Export products to CSV
            </h3>
            <p className="text-xs text-slate-500">
              Choose filters and columns, then download a compatible
              CSV.
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-xs text-slate-500 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="grid gap-5 px-5 py-4 text-xs md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <div className="mb-1 font-medium text-slate-800">
                Product category
              </div>
              <select
                className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground"
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
              <div className="mb-1 font-medium text-slate-800">
                Product type
              </div>
              <select
                className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground"
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
              <div className="mb-1 font-medium text-slate-800">Stock status</div>
              <select
                className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground"
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

          <div>
            <div className="mb-1 font-medium text-slate-800">
              Columns to export
            </div>
            <div className="h-48 overflow-auto rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs">
              {PRODUCT_CSV_COLUMNS.map((c) => (
                <label
                  key={c}
                  className="flex cursor-pointer items-center gap-2 py-1 text-slate-700"
                >
                  <input
                    type="checkbox"
                    className="h-3 w-3 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    checked={cols.includes(c)}
                    onChange={() => toggleCol(c)}
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              You can re-use the same CSV for updates using the Import tool.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <button
            onClick={onClose}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={download}
            disabled={downloading}
            className="ls-focus-ring inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? "Preparing…" : "Download CSV"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
