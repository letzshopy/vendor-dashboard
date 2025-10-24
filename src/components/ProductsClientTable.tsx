"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
      <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 px-2 py-0.5 text-xs">
        In stock{typeof qty === "number" ? ` (${qty})` : ""}
      </span>
    );
  }
  if (status === "outofstock") {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs">
        Out of stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-xs">
      On backorder
    </span>
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
  // selection
  const [checked, setChecked] = useState<number[]>([]);
  const allIds = useMemo(() => products.map((p) => p.id), [products]);
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

    if (bulk === "instock" || bulk === "outofstock") {
      await Promise.all(
        checked.map((id) =>
          fetch(`/api/products/${id}/update`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stock_status: bulk === "instock" ? "instock" : "outofstock",
            }),
          })
        )
      );
      location.reload();
      return;
    }

    if (bulk === "bulk-clone") {
      if (checked.length !== 1) {
        alert("Bulk-clone works from a single selected product.");
        return;
      }
      const countStr = prompt("How many clones to create?", "2");
      const count = Number(countStr || 0);
      if (!count || count < 1) return;
      const id = checked[0];
      const r = await fetch(`/api/products/${id}/bulk-clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      if (r.ok) location.reload();
      else alert("Bulk clone failed.");
      return;
    }

    // NEW: open modals for extra inputs
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
            tags: names.map((name) => ({ name })), // create-by-name supported by Woo
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

  function fmtDate(d?: string) {
    if (!d) return "—";
    try {
      // Server/Client safe: YYYY-MM-DD in local UTC slice
      return new Date(d).toISOString().slice(0, 10);
    } catch {
      return "—";
    }
  }

  return (
    <div className="overflow-x-auto border rounded relative">
      {/* Header row: bulk actions + counts */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1.5 text-sm"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
          >
            <option value="">Bulk actions…</option>
            <option value="bulk-clone">Bulk-clone (single only)</option>
            <option value="trash">Move to Trash</option>
            <option value="delete">Delete permanently</option>
            <option value="instock">Set In stock</option>
            <option value="outofstock">Set Out of stock</option>
            {/* NEW */}
            <option value="set-cats">Set categories…</option>
            <option value="set-tags">Set tags…</option>
            <option value="set-price">Set price…</option>
          </select>
          <button
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-100"
            onClick={applyBulk}
          >
            Apply
          </button>
        </div>
        <div className="text-xs text-slate-600">{checked.length} selected</div>
      </div>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="p-3 w-10">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} />
            </th>
            <th className="p-3 w-16">Image</th>
            <th className="p-3">Title / Actions</th>
            <th className="p-3 w-36">SKU</th>
            <th className="p-3 w-28">Price</th>
            <th className="p-3 w-36">Stock</th>
            <th className="p-3 w-56">Categories</th>
            <th className="p-3 w-28">Type</th>
            <th className="p-3 w-28">Visibility</th>
            <th className="p-3 w-32">Created</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const img = p.images?.[0]?.src;
            const cats = (p.categories || []).map((c) => c.name).join(", ");
            return (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={checked.includes(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                </td>
                <td className="p-3">
                  {img ? (
                    <img
                      src={img}
                      alt={p.name}
                      className="h-10 w-10 object-cover rounded border"
                    />
                  ) : (
                    <div className="h-10 w-10 grid place-items-center border rounded text-xs text-slate-500">
                      —
                    </div>
                  )}
                </td>
                <td className="p-3 align-top">
                  <div className="font-medium">
                    <Link
                      href={`/products/${p.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {p.name || "(no title)"}
                    </Link>
                  </div>
                  <div className="mt-1 space-x-3 text-blue-600 text-xs">
                    <Link href={`/products/${p.id}/edit`} className="underline">
                      Edit
                    </Link>
                    <a
                      href="#"
                      className="underline"
                      onClick={async (e) => {
                        e.preventDefault();
                        const countStr = prompt("How many clones to create?", "1");
                        const count = Number(countStr || 0);
                        if (!count || count < 1) return;
                        const r = await fetch(`/api/products/${p.id}/bulk-clone`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ count }),
                        });
                        if (r.ok) location.reload();
                        else alert("Clone failed");
                      }}
                    >
                      Bulk-clone
                    </a>
                    <a
                      href="#"
                      className="underline"
                      onClick={async (e) => {
                        e.preventDefault();
                        await fetch(`/api/products/${p.id}/trash`, {
                          method: "DELETE",
                        });
                        location.reload();
                      }}
                    >
                      Trash
                    </a>
                    <a
                      href={p.permalink || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      View
                    </a>
                    <a
                      href="#"
                      className="underline"
                      onClick={async (e) => {
                        e.preventDefault();
                        const r = await fetch(`/api/products/${p.id}/duplicate`, {
                          method: "POST",
                        });
                        if (r.ok) location.reload();
                        else alert("Duplicate failed");
                      }}
                    >
                      Duplicate
                    </a>
                  </div>
                </td>
                <td className="p-3">{p.sku || "—"}</td>
                <td className="p-3">{p.price ? `₹${p.price}` : "—"}</td>
                <td className="p-3">
                  <StockBadge
                    status={p.stock_status}
                    qty={
                      typeof p.stock_quantity === "number"
                        ? p.stock_quantity
                        : undefined
                    }
                  />
                </td>
                <td className="p-3">{cats || "—"}</td>
                <td className="p-3 capitalize">{p.type || "—"}</td>
                <td className="p-3 capitalize">
                  {p.catalog_visibility || "visible"}
                </td>
                <td className="p-3">{fmtDate(p.date_created)}</td>
              </tr>
            );
          })}
          {products.length === 0 && (
            <tr>
              <td colSpan={10} className="p-6 text-center text-slate-500">
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ---------- Modals (fixed + centered) ---------- */}

      {/* Set Categories */}
      {showCats && (
        <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border shadow w-full max-w-[560px]">
            <div className="p-3 border-b font-medium">Set categories</div>
            <div className="max-h-[60vh] overflow-auto p-3">
              {flatCats.map((c) => {
                const isChecked = selectedCatIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 py-1 px-1 hover:bg-gray-50 rounded cursor-pointer"
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
                    <span>{c.name}</span>
                  </label>
                );
              })}
              {flatCats.length === 0 && (
                <div className="text-sm text-slate-500">No categories.</div>
              )}
            </div>
            <div className="p-3 border-t flex justify-end gap-2">
              <button
                className="px-3 py-1.5 border rounded text-sm"
                onClick={() => setShowCats(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 border rounded text-sm bg-blue-600 text-white"
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
        <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border shadow w-full max-w-[560px]">
            <div className="p-3 border-b font-medium">Set tags</div>
            <div className="p-3">
              <label className="block text-sm mb-1">Tags</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g. festive, saree, cotton"
                value={tagsCSV}
                onChange={(e) => setTagsCSV(e.target.value)}
              />
              <div className="text-xs text-slate-500 mt-2">
                Enter comma-separated tag names. Existing and new tags are
                supported.
              </div>
            </div>
            <div className="p-3 border-t flex justify-end gap-2">
              <button
                className="px-3 py-1.5 border rounded text-sm"
                onClick={() => setShowTags(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 border rounded text-sm bg-blue-600 text-white"
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
        <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border shadow w-full max-w-[560px]">
            <div className="p-3 border-b font-medium">Set price</div>
            <div className="p-3 space-y-3">
              <div className="flex gap-2 items-center">
                <select
                  className="border rounded px-3 py-2 text-sm"
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
                  className="border rounded px-3 py-2 text-sm w-40"
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
            <div className="p-3 border-t flex justify-end gap-2">
              <button
                className="px-3 py-1.5 border rounded text-sm"
                onClick={() => setShowPrice(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 border rounded text-sm bg-blue-600 text-white"
                onClick={doBulkSetPrice}
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
