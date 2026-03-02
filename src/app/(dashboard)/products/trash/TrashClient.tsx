// src/app/products/trash/TrashClient.tsx
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
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allChecked = selected.length > 0 && selected.length === rows.length;

  function toggleOne(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleAll() {
    setSelected((s) => (s.length === rows.length ? [] : allIds));
  }

  async function doRestore(ids: number[]) {
    if (!ids.length) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const r = await fetch("/api/products/bulk-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Restore failed");

      // Remove restored rows from list
      setRows((prev) => prev.filter((p) => !ids.includes(p.id)));
      setSelected((s) => s.filter((id) => !ids.includes(id)));
      setNotice(`Restored ${ids.length} item(s).`);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete(ids: number[]) {
    if (!ids.length) return;
    if (!confirm(`Permanently delete ${ids.length} item(s)? This cannot be undone.`)) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const r = await fetch("/api/products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Delete failed");

      setRows((prev) => prev.filter((p) => !ids.includes(p.id)));
      setSelected((s) => s.filter((id) => !ids.includes(id)));
      setNotice(`Deleted ${ids.length} item(s) permanently.`);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyBulk() {
    if (bulk === "restore") return doRestore(selected);
    if (bulk === "delete") return doDelete(selected);
  }

  return (
    <div className="space-y-3">
      {/* Notices */}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        {/* Bulk row */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            value={bulk}
            onChange={(e) => setBulk(e.target.value as any)}
          >
            <option value="">Bulk actions…</option>
            <option value="restore">Restore</option>
            <option value="delete">Delete permanently</option>
          </select>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={applyBulk}
            disabled={!bulk || !selected.length || busy}
          >
            {busy ? "Working…" : "Apply"}
          </button>
          <span className="ml-2 text-sm text-slate-600">
            {selected.length
              ? `${selected.length} selected`
              : rows.length
              ? `${rows.length} item${rows.length === 1 ? "" : "s"} in trash`
              : "Trash is empty"}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={allChecked}
                    onChange={toggleAll}
                  />
                </th>
                <th className="w-16 p-3">Image</th>
                <th className="p-3">Title / actions</th>
                <th className="w-32 p-3">SKU</th>
                <th className="w-48 p-3">Categories</th>
                <th className="w-24 p-3">Type</th>
                <th className="w-28 p-3">Visibility</th>
                <th className="w-40 p-3">Date created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-slate-500">
                    Trash is empty.
                  </td>
                </tr>
              )}

              {rows.map((p) => {
                const thumb = p.images?.[0]?.src;
                const cats =
                  p.categories?.map((c) => c.name).filter(Boolean).join(", ") || "—";

                return (
                  <tr key={p.id} className="border-t border-slate-100 align-top">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={selected.includes(p.id)}
                        onChange={() => toggleOne(p.id)}
                      />
                    </td>
                    <td className="p-3">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-10 w-10 rounded object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400">
                          —
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900">
                        {p.name || "(no title)"}
                      </div>
                      <div className="mt-1 space-x-3 text-xs">
                        <button
                          type="button"
                          className="font-medium text-blue-600 hover:underline disabled:opacity-50"
                          onClick={() => doRestore([p.id])}
                          disabled={busy}
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          className="font-medium text-rose-600 hover:underline disabled:opacity-50"
                          onClick={() => doDelete([p.id])}
                          disabled={busy}
                        >
                          Delete permanently
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-slate-700">{p.sku || "—"}</td>
                    <td className="p-3 text-slate-700">{cats}</td>
                    <td className="p-3">
                      {p.type ? (
                        <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700 ring-1 ring-slate-200">
                          {p.type}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">
                      {p.catalog_visibility ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                          {p.catalog_visibility}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-600">
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
      </div>
    </div>
  );
}
