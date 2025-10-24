"use client";

import { useMemo, useState } from "react";

type P = {
  id: number;
  name: string;
  sku?: string;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  stock_status?: "instock" | "outofstock" | "onbackorder";
};

export default function InventoryClient({ initial }: { initial: P[] }) {
  const [rows, setRows] = useState<P[]>(initial);
  const [selected, setSelected] = useState<number[]>([]);
  const [action, setAction] = useState<
    "" | "instock" | "outofstock" | "add" | "sub"
  >("");
  const [qtyDelta, setQtyDelta] = useState<number>(1);
  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected = selected.length === rows.length && rows.length > 0;

  function toggleAll() {
    setSelected((cur) => (cur.length ? [] : [...allIds]));
  }
  function toggleOne(id: number) {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  async function apply() {
    if (!action || selected.length === 0) return;

    const toPatch: Array<{ id: number; body: any }> = [];

    for (const id of selected) {
      const r = rows.find((x) => x.id === id);
      if (!r) continue;

      if (action === "instock" || action === "outofstock") {
        toPatch.push({
          id,
          body: { stock_status: action },
        });
      } else if (action === "add" || action === "sub") {
        const cur = Number(r.stock_quantity || 0);
        const next = action === "add" ? cur + qtyDelta : cur - qtyDelta;
        toPatch.push({
          id,
          body: {
            manage_stock: true,
            stock_quantity: Math.max(0, next),
          },
        });
      }
    }

    // fire sequentially to keep it simple
    for (const p of toPatch) {
      await fetch(`/api/products/${p.id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p.body),
      });
    }

    // soft refresh UI with new values
    const updated = rows.map((r) => {
      if (!selected.includes(r.id)) return r;
      if (action === "instock" || action === "outofstock") {
        return { ...r, stock_status: action };
      }
      const cur = Number(r.stock_quantity || 0);
      const next =
        action === "add" ? cur + qtyDelta : Math.max(0, cur - qtyDelta);
      return { ...r, manage_stock: true, stock_quantity: next };
    });
    setRows(updated);
    setSelected([]);
    setAction("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          className="border rounded px-3 py-2 text-sm"
          value={action}
          onChange={(e) => setAction(e.target.value as any)}
        >
          <option value="">Bulk actions…</option>
          <option value="instock">Set to In stock</option>
          <option value="outofstock">Set to Out of stock</option>
          <option value="add">Increase quantity (+)</option>
          <option value="sub">Decrease quantity (-)</option>
        </select>

        {(action === "add" || action === "sub") && (
          <input
            type="number"
            min={1}
            className="w-24 border rounded px-2 py-2 text-sm"
            value={qtyDelta}
            onChange={(e) => setQtyDelta(Math.max(1, Number(e.target.value || 1)))}
          />
        )}

        <button
          className="rounded bg-blue-600 text-white px-3 py-2 text-sm disabled:opacity-50"
          disabled={!action || selected.length === 0}
          onClick={apply}
        >
          Apply
        </button>

        <div className="text-sm text-slate-600 ml-auto">
          {selected.length} selected
        </div>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
              <th className="p-2">Title</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Stock</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Manage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() => toggleOne(r.id)}
                  />
                </td>
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.sku || "—"}</td>
                <td className="p-2">
                  {r.stock_status === "instock" ? (
                    <span className="text-green-700">In stock</span>
                  ) : r.stock_status === "outofstock" ? (
                    <span className="text-gray-500">Out of stock</span>
                  ) : (
                    <span className="text-amber-700">On backorder</span>
                  )}
                </td>
                <td className="p-2">{r.stock_quantity ?? "—"}</td>
                <td className="p-2">{r.manage_stock ? "Yes" : "No"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-4 text-center text-slate-500" colSpan={6}>
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
