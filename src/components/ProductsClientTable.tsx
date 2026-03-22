// src/components/ProductsClientTable.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

/** Simple inline SVG icons */
const Icon = {
  edit: (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 13.5 14 3.5l2.5 2.5L6.5 16H4v-2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  clone: (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="5"
        width="9"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <rect
        x="8"
        y="8"
        width="7"
        height="7"
        rx="1.3"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  ),
  duplicate: (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="6"
        width="9"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <rect
        x="8"
        y="4"
        width="7"
        height="10"
        rx="1.3"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  ),
  trash: (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 6.5h10M8.5 6.5v7M11.5 6.5v7M7 6.5h6l-.5 8H7.5L7 6.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M8 4.5h4l.5 1.5H7.5l.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  ),
  view: (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 10s2.5-4 7-4 7 4 7 4-2.5 4-7 4-7-4-7-4Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle
        cx="10"
        cy="10"
        r="2.2"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  ),
};

/** ---------- Component ---------- */
export default function ProductsClientTable({
  products,
  categories = [],
}: {
  products: P[];
  categories?: Category[];
}) {
  // ---------- Search (title / SKU) ----------
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

  // ---------- Pagination ----------
  const [perPage, setPerPage] = useState<number>(25);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    // reset to first page when filter or page-size changes
    setPage(1);
  }, [query, perPage, products.length]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  // clamp page in case total pages shrinks
  const currentPage = Math.min(page, totalPages);

  const pageProducts = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, currentPage, perPage]);

  const fromIndex = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const toIndex = Math.min(currentPage * perPage, totalItems);

  // selection
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

  // bulk actions
  const [bulk, setBulk] = useState("");
  const [showCats, setShowCats] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showPrice, setShowPrice] = useState(false);

  // stock modal state
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockMode, setStockMode] = useState<"instock" | "outofstock">(
    "instock"
  );
  const [stockQty, setStockQty] = useState<string>("");

  // modal states
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

    // stock actions → open modal near top
    if (bulk === "instock" || bulk === "outofstock") {
      setStockMode(bulk === "instock" ? "instock" : "outofstock");
      setStockQty("");
      setShowStockModal(true);
      return;
    }

    // modals for extra inputs
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
            categories: selectedCatIds.map((cid) => ({ id: cid })), // replace
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
            tags: names.map((name) => ({ name })), // create-by-name
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

        // fetch current price for adjustments
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

  // bulk stock handler
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

  // per-row helpers
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
    <div className="mt-4 overflow-x-auto rounded-2xl border border-violet-100 bg-white/80 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      {/* Header row: bulk actions + search + counts */}
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-white to-violet-50/50 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
          >
            <option value="">Bulk actions…</option>
            {/* Bulk-clone (single only) removed here */}
            <option value="trash">Move to Trash</option>
            <option value="delete">Delete permanently</option>
            <option value="instock">Set In stock…</option>
            <option value="outofstock">Set Out of stock…</option>
            <option value="set-cats">Set categories…</option>
            <option value="set-tags">Set tags…</option>
            <option value="set-price">Set price…</option>
          </select>
          <button
            className="inline-flex h-9 items-center rounded-full bg-violet-500 px-4 text-xs font-medium text-white shadow-sm hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-300"
            onClick={applyBulk}
          >
            Apply
          </button>
          <span className="hidden text-xs text-slate-500 md:inline-block">
            {checked.length} selected
          </span>
        </div>

        {/* Search + per page */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden items-center gap-1 text-xs text-slate-600 sm:flex">
            <span>Rows per page</span>
            <select
              className="h-8 rounded-full border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="relative w-full max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              🔍
            </span>
            <input
              className="w-full rounded-full border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              placeholder="Search by title or SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="text-xs text-slate-500 md:hidden">
            {checked.length} selected
          </span>
        </div>
      </div>

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

                {/* Image */}
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

                {/* Title + icon actions */}
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
                      {/* Edit */}
                      <Link
                        href={`/products/${p.id}/edit`}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-sm hover:border-violet-400 hover:text-violet-600"
                        title="Edit"
                      >
                        {Icon.edit}
                      </Link>

                      {/* Bulk-clone (per row) */}
                      <button
                        type="button"
                        onClick={() => rowBulkClone(p.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-sm hover:border-violet-400 hover:text-violet-600"
                        title="Bulk-clone"
                      >
                        {Icon.clone}
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => rowDuplicate(p.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-sm hover:border-violet-400 hover:text-violet-600"
                        title="Duplicate"
                      >
                        {Icon.duplicate}
                      </button>

                      {/* Trash */}
                      <button
                        type="button"
                        onClick={() => rowTrash(p.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-sm hover:border-rose-300 hover:text-rose-600"
                        title="Move to Trash"
                      >
                        {Icon.trash}
                      </button>

                      {/* View */}
                      <button
                        type="button"
                        onClick={() => rowView(p.permalink)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-sm hover:border-violet-400 hover:text-violet-600"
                        title="View product in store"
                      >
                        {Icon.view}
                      </button>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 align-top text-sm text-slate-700 whitespace-nowrap">
                  {p.sku || "—"}
                </td>
                <td className="px-4 py-4 align-top text-sm text-slate-700 whitespace-nowrap">
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
              <td colSpan={10} className="px-6 py-10 text-center text-slate-500">
                {query.trim()
                  ? "No products match your search."
                  : "No products found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Footer: pagination */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:flex-row">
          <div>
            Showing{" "}
            <span className="font-semibold">
              {fromIndex}-{toIndex}
            </span>{" "}
            of <span className="font-semibold">{totalItems}</span> products
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="text-xs">
              Page <span className="font-semibold">{currentPage}</span> of{" "}
              <span className="font-semibold">{totalPages}</span>
            </span>
            <button
              className="rounded-full border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ---------- Modals (fixed + near top) ---------- */}

      {/* Set Categories */}
      {showCats && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 px-4 pt-24">
          <div className="w-full max-w-[560px] rounded-lg border bg-white shadow-lg">
            <div className="border-b px-4 py-2.5 text-sm font-medium">
              Set categories
            </div>
            <div className="max-h-[60vh] overflow-auto px-4 py-3">
              {flatCats.map((c) => {
                const isChecked = selectedCatIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50"
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
            <div className="flex justify-end gap-2 border-t px-4 py-2.5">
              <button
                className="rounded-md border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setShowCats(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
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
          <div className="w-full max-w-[560px] rounded-lg border bg-white shadow-lg">
            <div className="border-b px-4 py-2.5 text-sm font-medium">
              Set tags
            </div>
            <div className="px-4 py-3">
              <label className="mb-1 block text-sm text-slate-700">
                Tags (comma separated)
              </label>
              <input
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                placeholder="e.g. festive, saree, cotton"
                value={tagsCSV}
                onChange={(e) => setTagsCSV(e.target.value)}
              />
              <div className="mt-2 text-xs text-slate-500">
                Enter comma-separated tag names. Existing and new tags are
                supported.
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-2.5">
              <button
                className="rounded-md border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setShowTags(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
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
          <div className="w-full max-w-[560px] rounded-lg border bg-white shadow-lg">
            <div className="border-b px-4 py-2.5 text-sm font-medium">
              Set price
            </div>
            <div className="space-y-3 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
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
                  className="w-32 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  placeholder="Value"
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                />
              </div>
              <div className="text-xs text-slate-500">
                Operates on the regular price. Percent adjustments use current
                price as the base.
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-2.5">
              <button
                className="rounded-md border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setShowPrice(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
                onClick={doBulkSetPrice}
              >
                Apply to {checked.length} products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Stock (In stock / Out of stock) */}
      {showStockModal && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/30 px-4 pt-24">
          <div className="w-full max-w-[460px] rounded-lg border bg-white shadow-lg">
            <div className="border-b px-4 py-2.5 text-sm font-medium">
              {stockMode === "instock"
                ? "Set stock quantity"
                : "Set products Out of stock"}
            </div>

            <div className="px-4 py-3 space-y-3">
              {stockMode === "instock" ? (
                <>
                  <p className="text-xs text-slate-600">
                    Enter the stock quantity that should be applied to{" "}
                    <span className="font-semibold">{checked.length}</span>{" "}
                    selected products. Their status will be set to{" "}
                    <span className="font-semibold">In stock</span> when
                    quantity &gt; 0, otherwise{" "}
                    <span className="font-semibold">Out of stock</span>.
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-700">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-32 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                      value={stockQty}
                      onChange={(e) => setStockQty(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-600">
                  This will mark{" "}
                  <span className="font-semibold">{checked.length}</span>{" "}
                  selected products as{" "}
                  <span className="font-semibold">Out of stock</span> and set
                  their stock quantity to <span className="font-semibold">0</span>.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t px-4 py-2.5">
              <button
                className="rounded-md border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setShowStockModal(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
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
