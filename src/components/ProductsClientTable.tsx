"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Package2,
  Search,
  SlidersHorizontal,
} from "lucide-react";

/** ---------- Types ---------- */
type P = {
  id: number;
  name: string;
  sku?: string;
  type?: "simple" | "variable" | "grouped" | string;
  catalog_visibility?: "visible" | "catalog" | "search" | "hidden";
  price?: string;
  stock_status?: "instock" | "outofstock" | "onbackorder";
  manage_stock?: boolean;
  stock_quantity?: number | null;
  date_created?: string;
  images?: { id: number; src: string; name: string }[];
  categories?: { id: number; name: string }[];
  permalink?: string;
};

type Category = { id: number; name: string; parent: number };

/** ---------- Helpers ---------- */
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

function StockBadge({
  status,
  qty,
}: {
  status?: P["stock_status"];
  qty?: number | null;
}) {
  if (status === "instock") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
        ● In stock{typeof qty === "number" ? ` (${qty})` : ""}
      </span>
    );
  }
  if (status === "outofstock") {
    return (
      <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 whitespace-nowrap">
        ● Out of stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 whitespace-nowrap">
      ● On backorder
    </span>
  );
}

function ActionMenu({
  product,
  onBulkClone,
  onDuplicate,
  onTrash,
  onView,
}: {
  product: P;
  onBulkClone: (id: number) => void;
  onDuplicate: (id: number) => void;
  onTrash: (id: number) => void;
  onView: (url?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-violet-300 hover:text-violet-700"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 min-w-[170px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <Link
            href={`/products/${product.id}/edit`}
            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            ✏️ <span>Edit</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onBulkClone(product.id);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            📚 <span>Bulk-clone</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDuplicate(product.id);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            📄 <span>Duplicate</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onTrash(product.id);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            🗑️ <span>Trash</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onView(product.permalink);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            👁️ <span>View in store</span>
          </button>
        </div>
      )}
    </div>
  );
}

/** ---------- Component ---------- */
export default function ProductsClientTable({
  products,
  categories = [],
}: {
  products: P[];
  categories?: Category[];
}) {
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  }, [products, query]);

  const [perPage, setPerPage] = useState<number>(25);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    setPage(1);
  }, [query, perPage, products.length]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const currentPage = Math.min(page, totalPages);

  const pageProducts = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, currentPage, perPage]);

  const fromIndex = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const toIndex = Math.min(currentPage * perPage, totalItems);

  const [checked, setChecked] = useState<number[]>([]);
  const allIds = useMemo(
    () => filteredProducts.map((p) => p.id),
    [filteredProducts]
  );
  const allChecked = checked.length > 0 && checked.length === allIds.length;

  function toggleAll() {
    setChecked((prev) => (prev.length === allIds.length ? [] : allIds));
  }
  function toggle(id: number) {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const [bulk, setBulk] = useState("");
  const [showCats, setShowCats] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [showStockModal, setShowStockModal] = useState(false);
  const [stockMode, setStockMode] = useState<"instock" | "outofstock">(
    "instock"
  );
  const [stockQty, setStockQty] = useState<string>("");

  const flatCats = useMemo(() => indentCats(categories), [categories]);
  const [selectedCatIds, setSelectedCatIds] = useState<number[]>([]);
  const [tagsCSV, setTagsCSV] = useState("");
  const [priceMode, setPriceMode] = useState<
    "set" | "incpct" | "decpct" | "incval" | "decval"
  >("set");
  const [priceValue, setPriceValue] = useState<string>("");

  async function applyBulk() {
    if (!bulk || checked.length === 0) return;

    if (bulk === "trash") {
      await Promise.all(
        checked.map((id) =>
          fetch(`/api/products/${id}/trash`, { method: "DELETE" })
        )
      );
      location.reload();
      return;
    }

    if (bulk === "delete") {
      if (!confirm("Permanently delete selected products?")) return;
      await Promise.all(
        checked.map((id) =>
          fetch(`/api/products/${id}/delete`, { method: "DELETE" })
        )
      );
      location.reload();
      return;
    }

    if (bulk === "instock" || bulk === "outofstock") {
      setStockMode(bulk === "instock" ? "instock" : "outofstock");
      setStockQty("");
      setShowStockModal(true);
      return;
    }

    if (bulk === "set-cats") {
      setShowCats(true);
      return;
    }
    if (bulk === "set-tags") {
      setShowTags(true);
      return;
    }
    if (bulk === "set-price") {
      setShowPrice(true);
      return;
    }
  }

  async function doBulkSetCategories() {
    if (selectedCatIds.length === 0) return;
    await Promise.all(
      checked.map((id) =>
        fetch(`/api/products/${id}/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categories: selectedCatIds.map((cid) => ({ id: cid })),
          }),
        })
      )
    );
    location.reload();
  }

  async function doBulkSetTags() {
    const names = tagsCSV
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;

    await Promise.all(
      checked.map((id) =>
        fetch(`/api/products/${id}/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tags: names.map((name) => ({ name })),
          }),
        })
      )
    );
    location.reload();
  }

  async function doBulkSetPrice() {
    if (!priceValue) return;
    const val = Number(priceValue);
    if (Number.isNaN(val)) return;

    await Promise.all(
      checked.map(async (id) => {
        if (priceMode === "set") {
          return fetch(`/api/products/${id}/update`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ regular_price: String(val) }),
          });
        }

        const r = await fetch(`/api/products/${id}`);
        const pj = await r.json();
        const cur = Number(pj?.regular_price || 0) || 0;
        let next = cur;

        switch (priceMode) {
          case "incpct":
            next = cur * (1 + val / 100);
            break;
          case "decpct":
            next = cur * (1 - val / 100);
            break;
          case "incval":
            next = cur + val;
            break;
          case "decval":
            next = Math.max(0, cur - val);
            break;
        }

        return fetch(`/api/products/${id}/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regular_price: String(Math.round(next)) }),
        });
      })
    );
    location.reload();
  }

  async function doBulkSetStock() {
    if (stockMode === "instock") {
      const qtyNum = Number(stockQty);
      if (!Number.isFinite(qtyNum) || qtyNum < 0) {
        alert("Please enter a valid stock quantity (0 or more).");
        return;
      }

      await Promise.all(
        checked.map((id) =>
          fetch(`/api/products/${id}/update`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              manage_stock: true,
              stock_quantity: qtyNum,
              stock_status: qtyNum > 0 ? "instock" : "outofstock",
            }),
          })
        )
      );
    } else {
      await Promise.all(
        checked.map((id) =>
          fetch(`/api/products/${id}/update`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              manage_stock: true,
              stock_quantity: 0,
              stock_status: "outofstock",
            }),
          })
        )
      );
    }

    setShowStockModal(false);
    location.reload();
  }

  async function rowBulkClone(id: number) {
    const countStr = prompt("How many clones to create?", "1");
    const count = Number(countStr || 0);
    if (!count || count < 1) return;
    const r = await fetch(`/api/products/${id}/bulk-clone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    });
    if (r.ok) location.reload();
    else alert("Clone failed");
  }

  async function rowTrash(id: number) {
    await fetch(`/api/products/${id}/trash`, { method: "DELETE" });
    location.reload();
  }

  async function rowDuplicate(id: number) {
    const r = await fetch(`/api/products/${id}/duplicate`, { method: "POST" });
    if (r.ok) location.reload();
    else alert("Duplicate failed");
  }

  function rowView(url?: string) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function fmtDate(d?: string) {
    if (!d) return "—";
    try {
      return new Date(d).toISOString().slice(0, 10);
    } catch {
      return "—";
    }
  }

  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4 md:px-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
            Product list
          </h2>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {totalItems} items
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              placeholder="Search by title or SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
            >
              <option value="">Bulk actions…</option>
              <option value="trash">Move to Trash</option>
              <option value="delete">Delete permanently</option>
              <option value="instock">Set In stock…</option>
              <option value="outofstock">Set Out of stock…</option>
              <option value="set-cats">Set categories…</option>
              <option value="set-tags">Set tags…</option>
              <option value="set-price">Set price…</option>
            </select>

            <button
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
              onClick={applyBulk}
            >
              Apply
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
              {checked.length} selected
            </span>

            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
              <span>Rows</span>
              <select
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="block md:hidden">
        {pageProducts.length > 0 ? (
          <div className="space-y-2 p-3">
            {pageProducts.map((p) => {
              const img = p.images?.[0]?.src;
              const cats = (p.categories || []).map((c) => c.name).join(", ");

              return (
                <div
                  key={p.id}
                  className="rounded-[20px] border border-slate-200 bg-white px-3 py-3 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-2">
                      <input
                        type="checkbox"
                        checked={checked.includes(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                    </div>

                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        className="h-14 w-14 shrink-0 rounded-2xl border border-slate-100 object-cover"
                      />
                    ) : (
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                        No image
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/products/${p.id}`}
                            className="block truncate text-sm font-semibold text-slate-900"
                            title={p.name}
                          >
                            {p.name || "(no title)"}
                          </Link>

                          <div className="mt-1 text-base font-semibold text-slate-900">
                            {p.price ? `₹${p.price}` : "—"}
                          </div>
                        </div>

                        <ActionMenu
                          product={p}
                          onBulkClone={rowBulkClone}
                          onDuplicate={rowDuplicate}
                          onTrash={rowTrash}
                          onView={rowView}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-3">
  <div className="text-base font-semibold text-slate-900">
    {p.price ? `₹${p.price}` : "—"}
  </div>

  <StockBadge
    status={p.stock_status}
    qty={
      typeof p.stock_quantity === "number"
        ? p.stock_quantity
        : undefined
    }
  />
</div>

<div className="mt-2 line-clamp-1 text-sm text-slate-600">
  {(p.sku || "—") + " - " + (cats || "—") + " - " + (p.catalog_visibility || "visible")}
</div>                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package2 className="h-6 w-6" />
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-700">
              {query.trim() ? "No products match your search." : "No products found."}
            </div>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-violet-50/60 text-left text-xs font-medium uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              <th className="px-4 py-3 w-20">Image</th>
              <th className="px-4 py-3">Title / Actions</th>
              <th className="px-4 py-3 whitespace-nowrap">SKU</th>
              <th className="px-4 py-3 whitespace-nowrap">Price</th>
              <th className="px-4 py-3 whitespace-nowrap">Stock</th>
              <th className="px-4 py-3">Categories</th>
              <th className="px-4 py-3 whitespace-nowrap">Type</th>
              <th className="px-4 py-3 whitespace-nowrap">Visibility</th>
              <th className="px-4 py-3 whitespace-nowrap">Created</th>
            </tr>
          </thead>
          <tbody>
            {pageProducts.map((p) => {
              const img = p.images?.[0]?.src;
              const cats = (p.categories || []).map((c) => c.name).join(", ");

              return (
                <tr
                  key={p.id}
                  className="border-t border-slate-100 bg-white/70 hover:bg-violet-50/40"
                >
                  <td className="px-4 py-4 align-top">
                    <input
                      type="checkbox"
                      checked={checked.includes(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                  </td>

                  <td className="px-4 py-4 align-top">
                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        className="h-14 w-14 rounded-xl border border-slate-100 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="grid h-14 w-14 place-items-center rounded-xl border border-dashed border-slate-200 text-[10px] text-slate-400">
                        No image
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/products/${p.id}`}
                        className="max-w-xs truncate text-sm font-semibold text-slate-800 hover:text-violet-600"
                        title={p.name}
                      >
                        {p.name || "(no title)"}
                      </Link>

                      <div className="flex flex-wrap gap-1.5 text-slate-500">
                        <Link
                          href={`/products/${p.id}/edit`}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-sm hover:border-violet-400 hover:text-violet-600"
                          title="Edit"
                        >
                          ✏️
                        </Link>

                        <button
                          type="button"
                          onClick={() => rowBulkClone(p.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-sm hover:border-violet-400 hover:text-violet-600"
                          title="Bulk-clone"
                        >
                          📚
                        </button>

                        <button
                          type="button"
                          onClick={() => rowDuplicate(p.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-sm hover:border-violet-400 hover:text-violet-600"
                          title="Duplicate"
                        >
                          📄
                        </button>

                        <button
                          type="button"
                          onClick={() => rowTrash(p.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-sm hover:border-rose-300 hover:text-rose-600"
                          title="Move to Trash"
                        >
                          🗑️
                        </button>

                        <button
                          type="button"
                          onClick={() => rowView(p.permalink)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-sm hover:border-violet-400 hover:text-violet-600"
                          title="View product in store"
                        >
                          👁️
                        </button>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700 whitespace-nowrap">
                    {p.sku || "—"}
                  </td>
                  <td className="px-4 py-4 align-top text-sm font-medium text-slate-800 whitespace-nowrap">
                    {p.price ? `₹${p.price}` : "—"}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <StockBadge
                      status={p.stock_status}
                      qty={
                        typeof p.stock_quantity === "number"
                          ? p.stock_quantity
                          : undefined
                      }
                    />
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {cats || "—"}
                  </td>
                  <td className="px-4 py-4 align-top text-sm capitalize text-slate-700 whitespace-nowrap">
                    {p.type || "—"}
                  </td>
                  <td className="px-4 py-4 align-top text-sm capitalize text-slate-700 whitespace-nowrap">
                    {p.catalog_visibility || "visible"}
                  </td>
                  <td className="px-4 py-4 align-top text-xs text-slate-500 whitespace-nowrap">
                    {fmtDate(p.date_created)}
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                  {query.trim()
                    ? "No products match your search."
                    : "No products found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredProducts.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-4 text-xs text-slate-600 md:flex-row md:items-center md:justify-between md:px-5">
          <div>
            Showing{" "}
            <span className="font-semibold">
              {fromIndex}-{toIndex}
            </span>{" "}
            of <span className="font-semibold">{totalItems}</span> products
          </div>

          <div className="flex items-center justify-between gap-2 md:justify-end">
            <button
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>

            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
              Page {currentPage} of {totalPages}
            </span>

            <button
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Set Categories */}
      {showCats && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 px-4 pt-24">
          <div className="w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b px-4 py-3 text-sm font-semibold text-slate-800">
              Set categories
            </div>
            <div className="max-h-[60vh] overflow-auto px-4 py-3">
              {flatCats.map((c) => {
                const isChecked = selectedCatIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-slate-50"
                    style={{ paddingLeft: 8 + c.depth * 14 }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        setSelectedCatIds((arr) =>
                          isChecked
                            ? arr.filter((x) => x !== c.id)
                            : [...arr, c.id]
                        )
                      }
                    />
                    <span className="text-sm text-slate-700">{c.name}</span>
                  </label>
                );
              })}
              {flatCats.length === 0 && (
                <div className="text-sm text-slate-500">No categories.</div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button
                className="rounded-xl border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setShowCats(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
                onClick={doBulkSetCategories}
              >
                Apply to {checked.length} products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Tags */}
      {showTags && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 px-4 pt-24">
          <div className="w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b px-4 py-3 text-sm font-semibold text-slate-800">
              Set tags
            </div>
            <div className="px-4 py-3">
              <label className="mb-1 block text-sm text-slate-700">
                Tags (comma separated)
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                placeholder="e.g. festive, saree, cotton"
                value={tagsCSV}
                onChange={(e) => setTagsCSV(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button
                className="rounded-xl border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setShowTags(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
                onClick={doBulkSetTags}
              >
                Apply to {checked.length} products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Price */}
      {showPrice && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 px-4 pt-24">
          <div className="w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b px-4 py-3 text-sm font-semibold text-slate-800">
              Set price
            </div>
            <div className="space-y-3 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  value={priceMode}
                  onChange={(e) =>
                    setPriceMode(e.target.value as typeof priceMode)
                  }
                >
                  <option value="set">Set to amount</option>
                  <option value="incpct">Increase by %</option>
                  <option value="decpct">Decrease by %</option>
                  <option value="incval">Increase by amount</option>
                  <option value="decval">Decrease by amount</option>
                </select>
                <input
                  className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  placeholder="Value"
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button
                className="rounded-xl border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setShowPrice(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
                onClick={doBulkSetPrice}
              >
                Apply to {checked.length} products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Stock */}
      {showStockModal && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/30 px-4 pt-24">
          <div className="w-full max-w-[460px] rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b px-4 py-3 text-sm font-semibold text-slate-800">
              {stockMode === "instock"
                ? "Set stock quantity"
                : "Set products Out of stock"}
            </div>

            <div className="space-y-3 px-4 py-3">
              {stockMode === "instock" ? (
                <>
                  <p className="text-xs text-slate-600">
                    Enter the stock quantity for{" "}
                    <span className="font-semibold">{checked.length}</span> selected
                    products.
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-700">Quantity</label>
                    <input
                      type="number"
                      min={0}
                      className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                      value={stockQty}
                      onChange={(e) => setStockQty(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-600">
                  This will mark{" "}
                  <span className="font-semibold">{checked.length}</span> selected
                  products as out of stock and set quantity to 0.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button
                className="rounded-xl border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setShowStockModal(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
                onClick={doBulkSetStock}
              >
                Apply to {checked.length} products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}