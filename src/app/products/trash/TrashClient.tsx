"use client";

import { useMemo, useState } from "react";

type P = {
  id: number;
  name: string;
  sku?: string;
  date_created?: string;
  images?: { id: number; src: string; name?: string }[];
  categories?: { id: number; name: string }[];
  type?: "simple" | "variable" | "grouped";
  catalog_visibility?: "visible" | "catalog" | "search" | "hidden";
};

export default function TrashClient({ initial }: { initial: P[] }) {
  const [rows, setRows] = useState<P[]>(initial);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulk, setBulk] = useState<"" | "restore" | "delete">("");
  const [busy, setBusy] = useState(false);
  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allChecked = selected.length > 0 && selected.length === rows.length;

  function toggleOne(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function toggleAll() {
    setSelected((s) => (s.length === rows.length ? [] : allIds));
  }

  async function doRestore(ids: number[]) {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      // Use your existing endpoints; if you created alias routes, they’ll work too.
      const r = await fetch("/api/products/bulk-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "Restore failed");
      }
      // Remove restored rows from the list
      setRows((prev) => prev.filter((p) => !ids.includes(p.id)));
      setSelected((s) => s.filter((id) => !ids.includes(id)));
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doDelete(ids: number[]) {
    if (ids.length === 0) return;
    if (!confirm(`Permanently delete ${ids.length} item(s)? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const r = await fetch("/api/products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "Delete failed");
      }
      setRows((prev) => prev.filter((p) => !ids.includes(p.id)));
      setSelected((s) => s.filter((id) => !ids.includes(id)));
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function applyBulk() {
    if (bulk === "restore") return doRestore(selected);
    if (bulk === "delete") return doDelete(selected);
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <select
          className="border rounded px-3 py-2 text-sm"
          value={bulk}
          onChange={(e) => setBulk(e.target.value as any)}
        >
          <option value="">Bulk actions…</option>
          <option value="restore">Restore</option>
          <option value="delete">Delete permanently</option>
        </select>
        <button
          className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          onClick={applyBulk}
          disabled={!bulk || selected.length === 0 || busy}
        >
          Apply
        </button>
        <div className="text-sm text-slate-600 ml-2">
          {selected.length} selected
        </div>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allChecked}
                  onChange={toggleAll}
                />
              </th>
              <th className="p-3">Image</th>
              <th className="p-3">Title / Actions</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Categories</th>
              <th className="p-3">Type</th>
              <th className="p-3">Visibility</th>
              <th className="p-3">Date created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  Trash is empty.
                </td>
              </tr>
            )}
            {rows.map((p) => {
              const thumb = p.images?.[0]?.src;
              const cats =
                p.categories?.map((c) => c.name).filter(Boolean).join(", ") || "—";
              return (
                <tr key={p.id} className="border-t align-top">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() => toggleOne(p.id)}
                    />
                  </td>
                  <td className="p-3">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        src={thumb}
                        className="h-10 w-10 rounded object-cover border"
                      />
                    ) : (
                      <div className="h-10 w-10 grid place-items-center border rounded text-xs text-slate-500">
                        —
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{p.name || "(no title)"}</div>
                    <div className="text-xs mt-1 space-x-3">
                      <button
                        className="text-blue-600 underline"
                        onClick={() => doRestore([p.id])}
                        disabled={busy}
                      >
                        Restore
                      </button>
                      <button
                        className="text-red-600 underline"
                        onClick={() => doDelete([p.id])}
                        disabled={busy}
                      >
                        Delete permanently
                      </button>
                    </div>
                  </td>
                  <td className="p-3">{p.sku || "—"}</td>
                  <td className="p-3">{cats}</td>
                  <td className="p-3">{p.type || "—"}</td>
                  <td className="p-3">{p.catalog_visibility || "—"}</td>
                  <td className="p-3">
                    {p.date_created
                      ? new Date(p.date_created).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
