"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Layers,
  MoreVertical,
  Package2,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";

/** ---------- Types ---------- */
type P = {
  id: number;
  name: string;
  sku?: string;
  type?: "simple" | "variable" | "grouped" | string;
  catalog_visibility?: "visible" | "catalog" | "search" | "hidden";
  price?: string;
  regular_price?: string;
  dashboard_price?: string;
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

function formatDashboardPrice(product: P): string {
  const value = (
    product.dashboard_price ||
    product.regular_price ||
    product.price ||
    ""
  ).trim();

  if (!value) {
    return "-";
  }

  const [minimum, maximum] =
    value.split("-", 2);

  if (minimum && maximum) {
    return `\u20B9${minimum}\u2013\u20B9${maximum}`;
  }

  return `\u20B9${value}`;
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

  const itemClass =
    "flex min-h-10 w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition";

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        aria-label={`Open actions for ${product.name}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#5366B7] hover:bg-[#EEF1FA] hover:text-[#2E3F7D]"
      >
        <MoreVertical
          className="h-4 w-4"
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-[80] w-[220px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(38,51,95,0.2)]">
          <Link
            href={`/products/${product.id}/edit`}
            className={`${itemClass} text-slate-700 hover:bg-slate-50`}
            onClick={() => setOpen(false)}
          >
            <Pencil
              className="h-4 w-4 shrink-0 text-[#5366B7]"
              aria-hidden="true"
            />
            <span>Edit</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onBulkClone(product.id);
            }}
            className={`${itemClass} text-slate-700 hover:bg-slate-50`}
          >
            <Layers
              className="h-4 w-4 shrink-0 text-[#5366B7]"
              aria-hidden="true"
            />
            <span>Bulk clone</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDuplicate(product.id);
            }}
            className={`${itemClass} text-slate-700 hover:bg-slate-50`}
          >
            <Copy
              className="h-4 w-4 shrink-0 text-[#5366B7]"
              aria-hidden="true"
            />
            <span>Duplicate</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onTrash(product.id);
            }}
            className={`${itemClass} text-rose-600 hover:bg-rose-50`}
          >
            <Trash2
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>Trash</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onView(product.permalink);
            }}
            className={`${itemClass} text-slate-700 hover:bg-slate-50`}
          >
            <Eye
              className="h-4 w-4 shrink-0 text-[#5366B7]"
              aria-hidden="true"
            />
            <span>View in store</span>
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

  const [showStockModal, setShowStockModal] = useState(false);
  const [stockMode, setStockMode] = useState<"instock" | "outofstock">(
    "instock"
  );
  const [stockQty, setStockQty] = useState<string>("");

  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneProductId, setCloneProductId] = useState<number | null>(null);
  const [cloneCount, setCloneCount] = useState("1");
  const [cloneBusy, setCloneBusy] = useState(false);
  const cloneBusyRef = useRef(false);

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

  function rowBulkClone(id: number) {
    setCloneProductId(id);
    setCloneCount("1");
    setShowCloneModal(true);
  }

  async function confirmBulkClone() {
    const count = Number(cloneCount || 0);
    if (!cloneProductId || !count || count < 1) return;
    if (cloneBusyRef.current) return;

    cloneBusyRef.current = true;
    setCloneBusy(true);

    try {
      const r = await fetch(`/api/products/${cloneProductId}/bulk-clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });

      if (!r.ok) {
        alert("Clone failed");
        return;
      }

      setShowCloneModal(false);
      setCloneProductId(null);
      setCloneCount("1");
      location.reload();
    } catch {
      alert("Clone failed");
    } finally {
      cloneBusyRef.current = false;
      setCloneBusy(false);
    }
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
    <div className="w-full min-w-0 bg-white">
      <div className="border-b border-[#E8EBF2] px-3 py-3 md:grid md:grid-cols-[minmax(180px,auto)_minmax(320px,1fr)] md:items-center md:gap-x-4 md:gap-y-2 md:px-4 md:py-2.5">
        <div className="flex items-start justify-between gap-3 md:min-w-0">
          <div>
            <h2 className="text-[17px] font-bold text-[#26335F]">
              All products
            </h2>

            <p className="mt-0.5 hidden text-xs text-slate-500 lg:block">
              Search and manage your catalogue.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 md:hidden">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
              />
              Select all
            </label>

            <span className="inline-flex rounded-full bg-[#EEF1FA] px-3 py-1 text-xs font-bold text-[#2E3F7D]">
              {totalItems} items
            </span>
          </div>
        </div>

        <div className="mt-2 flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-[#F8F9FC] px-3 md:mt-0">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product title or SKU"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />

          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="shrink-0 text-xs font-bold text-[#5366B7]"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div
          className={[
            "min-w-0 flex-col gap-2 md:col-span-2 md:mt-0 md:flex xl:flex-row xl:items-center xl:justify-between",
            checked.length > 0
              ? "mt-2 flex"
              : "hidden",
          ].join(" ")}
        >
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center">
            <select
              value={bulk}
              onChange={(event) => setBulk(event.target.value)}
              className="h-9 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#5366B7]"
            >
              <option value="">Bulk actions</option>
              <option value="trash">Move to Trash</option>
              <option value="delete">Delete permanently</option>
              <option value="instock">Set In stock</option>
              <option value="outofstock">Set Out of stock</option>
              <option value="set-cats">Set categories</option>
              <option value="set-tags">Set tags</option>
              <option value="set-price">Set price</option>
            </select>

            <button
              type="button"
              onClick={applyBulk}
              disabled={!bulk || checked.length === 0}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-[#5366B7] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Apply
            </button>

            <span className="col-span-2 text-xs font-semibold text-slate-500 sm:col-span-1">
              {checked.length} selected
            </span>
          </div>

          <div className="hidden items-center justify-between gap-3 md:flex xl:justify-end">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              Rows

              <select
                value={perPage}
                onChange={(event) => setPerPage(Number(event.target.value))}
                className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        {pageProducts.length > 0 ? (
          <div className="divide-y divide-[#E8EBF2] sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0 sm:p-3">
            {pageProducts.map((product) => {
              const image = product.images?.[0]?.src;
              const categoryNames = (product.categories || [])
                .map((category) => category.name)
                .join(", ");

              return (
                <article
                  key={product.id}
                  className="min-w-0 bg-white px-3 py-4 sm:rounded-2xl sm:border sm:border-[#E5E9F2] sm:p-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked.includes(product.id)}
                      onChange={() => toggle(product.id)}
                      className="mt-2 shrink-0"
                    />

                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="h-16 w-16 shrink-0 rounded-xl border border-slate-100 object-cover"
                      />
                    ) : (
                      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                        No image
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-start gap-2">
                        <Link
                          href={`/products/${product.id}`}
                          title={product.name}
                          className="min-w-0 flex-1 line-clamp-2 text-sm font-extrabold leading-5 text-[#26335F]"
                        >
                          {product.name || "(no title)"}
                        </Link>

                        <ActionMenu
                          product={product}
                          onBulkClone={rowBulkClone}
                          onDuplicate={rowDuplicate}
                          onTrash={rowTrash}
                          onView={rowView}
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-base font-extrabold text-[#26335F]">
                          {formatDashboardPrice(product)}
                        </span>

                        <StockBadge
                          status={product.stock_status}
                          qty={
                            typeof product.stock_quantity === "number"
                              ? product.stock_quantity
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#EEF0F5] pt-3 text-xs">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400">
                        SKU
                      </div>
                      <div className="mt-0.5 truncate font-semibold text-slate-700">
                        {product.sku || "-"}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400">
                        Type
                      </div>
                      <div className="mt-0.5 truncate font-semibold capitalize text-slate-700">
                        {product.type || "-"}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400">
                        Category
                      </div>
                      <div className="mt-0.5 truncate font-semibold text-slate-700">
                        {categoryNames || "-"}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400">
                        Visibility
                      </div>
                      <div className="mt-0.5 truncate font-semibold capitalize text-slate-700">
                        {product.catalog_visibility || "visible"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[#EEF0F5] pt-3">
                    <span className="text-[11px] text-slate-400">
                      Added {fmtDate(product.date_created)}
                    </span>

                    <Link
                      href={`/products/${product.id}/edit`}
                      className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#EEF1FA] px-3 text-xs font-bold text-[#2E3F7D]"
                    >
                      Edit product
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF1FA] text-[#5366B7]">
              <Package2 className="h-6 w-6" />
            </div>

            <div className="mt-4 text-sm font-bold text-[#26335F]">
              {query.trim()
                ? "No products match your search."
                : "No products found."}
            </div>
          </div>
        )}
      </div>

      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1120px] text-sm">
          <thead>
            <tr className="border-b border-[#E5E9F2] bg-[#F7F8FC] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Categories</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Created</th>
              <th className="sticky right-0 z-20 w-[132px] min-w-[132px] border-l border-[#E5E9F2] bg-[#F7F8FC] px-4 py-3 text-right shadow-[-8px_0_16px_rgba(38,51,95,0.04)]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {pageProducts.map((product) => {
              const image = product.images?.[0]?.src;
              const categoryNames = (product.categories || [])
                .map((category) => category.name)
                .join(", ");

              return (
                <tr
                  key={product.id}
                  className="group border-b border-[#EEF0F5] align-middle transition hover:bg-[#FAFBFD]"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked.includes(product.id)}
                      onChange={() => toggle(product.id)}
                    />
                  </td>

                  <td className="min-w-[280px] px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {image ? (
                        <img
                          src={image}
                          alt={product.name}
                          className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 object-cover"
                        />
                      ) : (
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[9px] text-slate-400">
                          No image
                        </div>
                      )}

                      <div className="min-w-0">
                        <Link
                          href={`/products/${product.id}`}
                          title={product.name}
                          className="block max-w-[300px] truncate font-bold text-[#26335F] hover:text-[#5366B7]"
                        >
                          {product.name || "(no title)"}
                        </Link>

                        <div className="mt-1 truncate text-xs text-slate-400">
                          SKU: {product.sku || "-"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 font-bold text-[#26335F]">
                    {formatDashboardPrice(product)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <StockBadge
                      status={product.stock_status}
                      qty={
                        typeof product.stock_quantity === "number"
                          ? product.stock_quantity
                          : undefined
                      }
                    />
                  </td>

                  <td
                    className="max-w-[220px] truncate px-4 py-3 text-slate-600"
                    title={categoryNames}
                  >
                    {categoryNames || "-"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 capitalize text-slate-600">
                    {product.type || "-"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 capitalize text-slate-600">
                    {product.catalog_visibility || "visible"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {fmtDate(product.date_created)}
                  </td>

                  <td className="sticky right-0 z-10 w-[132px] min-w-[132px] border-l border-[#EEF0F5] bg-white px-4 py-3 shadow-[-8px_0_16px_rgba(38,51,95,0.035)] focus-within:z-[70] group-hover:bg-[#FAFBFD]">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/products/${product.id}/edit`}
                        className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#EEF1FA] px-3 text-xs font-bold text-[#2E3F7D]"
                      >
                        Edit
                      </Link>

                      <ActionMenu
                        product={product}
                        onBulkClone={rowBulkClone}
                        onDuplicate={rowDuplicate}
                        onTrash={rowTrash}
                        onView={rowView}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {pageProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-14 text-center text-sm text-slate-500"
                >
                  {query.trim()
                    ? "No products match your search."
                    : "No products found."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-[#E8EBF2] bg-[#FAFBFD] px-3 py-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between md:px-4">
          <div>
            Showing{" "}
            <span className="font-bold text-[#26335F]">
              {fromIndex}-{toIndex}
            </span>{" "}
            of{" "}
            <span className="font-bold text-[#26335F]">
              {totalItems}
            </span>{" "}
            products
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
              className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-600 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>

            <span className="shrink-0 rounded-xl bg-[#EEF1FA] px-3 py-2 font-bold text-[#2E3F7D]">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-600 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
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
                className="rounded-xl bg-[#E85D4A] px-3 py-2 text-sm font-bold text-white hover:bg-[#D94F3D]"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-[#5366B7] focus:outline-none focus:ring-2 focus:ring-[#E5E8F6]"
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
                className="rounded-xl bg-[#E85D4A] px-3 py-2 text-sm font-bold text-white hover:bg-[#D94F3D]"
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
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#5366B7] focus:outline-none focus:ring-2 focus:ring-[#E5E8F6]"
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
                  className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#5366B7] focus:outline-none focus:ring-2 focus:ring-[#E5E8F6]"
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
                className="rounded-xl bg-[#E85D4A] px-3 py-2 text-sm font-bold text-white hover:bg-[#D94F3D]"
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
                      className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#5366B7] focus:outline-none focus:ring-2 focus:ring-[#E5E8F6]"
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
                className="rounded-xl bg-[#E85D4A] px-3 py-2 text-sm font-bold text-white hover:bg-[#D94F3D]"
                onClick={doBulkSetStock}
              >
                Apply to {checked.length} products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/30 px-4 pt-24">
          <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b px-4 py-3 text-sm font-semibold text-slate-800">
              Bulk clone product
            </div>

            <div className="space-y-3 px-4 py-4">
              <p className="text-sm text-slate-600">
                Enter how many clones you want to create.
              </p>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Number of clones
                </label>
                <input
                  type="number"
                  min={1}
                  value={cloneCount}
                  disabled={cloneBusy}
                  onChange={(e) => setCloneCount(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 shadow-sm focus:border-[#5366B7] focus:outline-none focus:ring-2 focus:ring-[#E5E8F6] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button
                type="button"
                disabled={cloneBusy}
                className="rounded-xl border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  setShowCloneModal(false);
                  setCloneProductId(null);
                  setCloneCount("1");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={cloneBusy}
                className="rounded-xl bg-[#E85D4A] px-4 py-2 text-sm font-bold text-white hover:bg-[#D94F3D] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={confirmBulkClone}
              >
                {cloneBusy ? "Creating…" : "Create clones"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}