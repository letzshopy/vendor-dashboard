"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Pencil,
  Copy,
  Trash2,
  Eye,
  Search,
} from "lucide-react";

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
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
    );
  }, [products, query]);

  function StockBadge(p: P) {
    if (p.stock_status === "instock")
      return (
        <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
          In stock ({p.stock_quantity ?? 0})
        </span>
      );

    if (p.stock_status === "outofstock")
      return (
        <span className="text-[11px] bg-rose-100 text-rose-600 px-2 py-1 rounded-full">
          Out of stock
        </span>
      );

    return (
      <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
        Backorder
      </span>
    );
  }

  return (
    <div className="mt-4">
      {/* 🔍 Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
        <input
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-full border border-slate-200 pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
        />
      </div>

      {/* 🧠 Product List */}
      <div className="space-y-3">
        {filtered.map((p, index) => {
          const img = p.images?.[0]?.src;

          return (
            <div
              key={p.id}
              className="group relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition"
            >
              <div className="flex gap-3">
                {/* IMAGE = SERIAL */}
                <div className="relative">
                  {img ? (
                    <img
                      src={img}
                      className="h-20 w-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                      No Image
                    </div>
                  )}

                  {/* Serial number */}
                  <div className="absolute -top-2 -left-2 bg-violet-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow">
                    #{index + 1}
                  </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${p.id}`}
                    className="font-semibold text-slate-800 truncate block"
                  >
                    {p.name}
                  </Link>

                  <div className="text-xs text-slate-500 mt-1">
                    {p.sku || "—"} • {p.type}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="font-semibold text-violet-600">
                      ₹{p.price || "—"}
                    </div>

                    <StockBadge {...p} />
                  </div>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(p.categories || []).slice(0, 3).map((c, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ACTION BAR */}
              <div className="flex gap-2 mt-3 opacity-70 group-hover:opacity-100 transition">
                <Link
                  href={`/products/${p.id}/edit`}
                  className="action-btn"
                >
                  <Pencil size={14} />
                </Link>

                <button className="action-btn">
                  <Copy size={14} />
                </button>

                <button className="action-btn text-rose-500">
                  <Trash2 size={14} />
                </button>

                <button
                  onClick={() => window.open(p.permalink)}
                  className="action-btn"
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            No products found
          </div>
        )}
      </div>

      {/* STYLE */}
      <style jsx>{`
        .action-btn {
          height: 32px;
          width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: white;
          transition: 0.2s;
        }

        .action-btn:hover {
          border-color: #8b5cf6;
          color: #7c3aed;
        }
      `}</style>
    </div>
  );
}