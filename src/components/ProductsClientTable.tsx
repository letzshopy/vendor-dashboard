"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, Copy, Trash2, Eye, Search } from "lucide-react";

type P = {
  id: number;
  name: string;
  sku?: string;
  price?: string;
  stock_status?: "instock" | "outofstock" | "onbackorder";
  stock_quantity?: number | null;
  images?: { src: string }[];
  categories?: { name: string }[];
  type?: string;
  permalink?: string;
};

export default function ProductsClientTable({
  products,
}: {
  products: P[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    );
  }, [products, query]);

  function StockBadge({ product }: { product: P }) {
    if (product.stock_status === "instock") {
      return (
        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-700">
          In stock ({product.stock_quantity ?? 0})
        </span>
      );
    }

    if (product.stock_status === "outofstock") {
      return (
        <span className="inline-flex rounded-full bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-600">
          Out of stock
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">
        Backorder
      </span>
    );
  }

  return (
    <section className="rounded-[28px] border border-slate-200/70 bg-white shadow-sm shadow-slate-200/60">
      <div className="border-b border-slate-100 px-4 py-4 md:px-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search by product title or SKU"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
      </div>

      <div className="space-y-3 p-4 md:p-5">
        {filtered.map((p, index) => {
          const img = p.images?.[0]?.src;

          return (
            <div
              key={p.id}
              className="group rounded-[24px] border border-slate-200 bg-gradient-to-r from-white to-slate-50/70 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex gap-3">
                <div className="relative shrink-0">
                  {img ? (
                    <img
                      src={img}
                      alt={p.name}
                      className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-[11px] text-slate-400 ring-1 ring-slate-200">
                      No image
                    </div>
                  )}

                  <div className="absolute -left-2 -top-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                    #{index + 1}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${p.id}`}
                        className="block truncate text-[15px] font-semibold text-slate-900 hover:text-violet-700"
                      >
                        {p.name}
                      </Link>

                      <div className="mt-1 text-xs text-slate-500">
                        {p.sku || "—"} • {p.type || "simple"}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-base font-semibold text-violet-700">
                        ₹{p.price || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <StockBadge product={p} />
                  </div>

                  {(p.categories || []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(p.categories || []).slice(0, 4).map((c, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/products/${p.id}/edit`} className="action-btn">
                      <Pencil size={14} />
                    </Link>

                    <button type="button" className="action-btn">
                      <Copy size={14} />
                    </button>

                    <button type="button" className="action-btn text-rose-500 hover:border-rose-300 hover:text-rose-600">
                      <Trash2 size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => p.permalink && window.open(p.permalink, "_blank")}
                      className="action-btn"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No products found.
          </div>
        )}
      </div>

      <style jsx>{`
        .action-btn {
          height: 34px;
          width: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: white;
          color: #475569;
          transition: 0.2s;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
        }

        .action-btn:hover {
          border-color: #8b5cf6;
          color: #7c3aed;
        }
      `}</style>
    </section>
  );
}