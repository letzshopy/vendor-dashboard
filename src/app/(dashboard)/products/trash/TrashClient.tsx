"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

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

function typeBadge(type?: string) {
  if (!type) return null;
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium capitalize text-slate-700">
      {type}
    </span>
  );
}

function visibilityBadge(v?: string) {
  if (!v) return null;
  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium capitalize text-amber-700 ring-1 ring-amber-100">
      {v}
    </span>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

function ItemMeta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/70 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-800">{value}</div>
    </div>
  );
}

export default function TrashClient({ initial }: { initial: P[] }) {
  const [rows, setRows] = useState<P[]>(initial);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulk, setBulk] = useState<"" | "restore" | "delete">("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const name = (r.name || "").toLowerCase();
      const sku = (r.sku || "").toLowerCase();
      const cats = (r.categories || [])
        .map((c) => c.name.toLowerCase())
        .join(" ");
      return name.includes(q) || sku.includes(q) || cats.includes(q);
    });
  }, [rows, query]);

  const allIds = useMemo(() => filteredRows.map((r) => r.id), [filteredRows]);
  const allChecked =
    filteredRows.length > 0 &&
    selected.length > 0 &&
    allIds.every((id) => selected.includes(id));

  function toggleOne(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleAll() {
    setSelected((s) => {
      const currentlyAllSelected =
        filteredRows.length > 0 && allIds.every((id) => s.includes(id));

      if (currentlyAllSelected) {
        return s.filter((id) => !allIds.includes(id));
      }

      return Array.from(new Set([...s, ...allIds]));
    });
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

      setRows((prev) => prev.filter((p) => !ids.includes(p.id)));
      setSelected((s) => s.filter((id) => !ids.includes(id)));
      setNotice(`Restored ${ids.length} item(s).`);
    } catch (e: any) {
      setError(e?.message || "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete(ids: number[]) {
    if (!ids.length) return;
    if (!confirm(`Permanently delete ${ids.length} item(s)? This cannot be undone.`)) {
      return;
    }

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
    <div className="space-y-4">
      {notice && (
        <div className="flex items-start gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#fff7f7] via-white to-[#f4fbff] px-4 py-4 md:px-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
                Trash contents
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Search, review, restore or permanently delete products.
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {rows.length} item{rows.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, SKU or category..."
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <select
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                value={bulk}
                onChange={(e) => setBulk(e.target.value as "" | "restore" | "delete")}
              >
                <option value="">Bulk actions…</option>
                <option value="restore">Restore</option>
                <option value="delete">Delete permanently</option>
              </select>

              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={applyBulk}
                disabled={!bulk || !selected.length || busy}
              >
                {busy ? "Working..." : "Apply"}
              </button>
            </div>

            <div className="text-sm text-slate-600">
              {selected.length
                ? `${selected.length} selected`
                : filteredRows.length
                ? `${filteredRows.length} shown`
                : "Trash is empty"}
            </div>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="p-6">
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
              <EyeOff className="h-10 w-10 text-slate-300" />
              <div className="mt-3 text-sm font-semibold text-slate-700">
                {rows.length === 0 ? "Trash is empty" : "No matching products"}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {rows.length === 0
                  ? "Deleted products will appear here."
                  : "Try a different search term."}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="block md:hidden">
              <div className="space-y-3 p-3">
                {filteredRows.map((p) => {
                  const thumb = p.images?.[0]?.src;
                  const cats =
                    p.categories?.map((c) => c.name).filter(Boolean).join(", ") || "—";

                  return (
                    <div
                      key={p.id}
                      className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-2">
                          <input
                            type="checkbox"
                            aria-label={`Select ${p.name}`}
                            className="h-4 w-4 rounded border-slate-300"
                            checked={selected.includes(p.id)}
                            onChange={() => toggleOne(p.id)}
                          />
                        </div>

                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-[10px] text-slate-400">
                            —
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">
                            {p.name || "(no title)"}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {typeBadge(p.type)}
                            {visibilityBadge(p.catalog_visibility)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2">
                        <ItemMeta label="SKU" value={p.sku || "—"} />
                        <ItemMeta label="Categories" value={cats} />
                        <ItemMeta label="Date created" value={formatDate(p.date_created)} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                          onClick={() => doRestore([p.id])}
                          disabled={busy}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                          Restore
                        </button>

                        <button
                          type="button"
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                          onClick={() => doDelete([p.id])}
                          disabled={busy}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
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
                    {filteredRows.map((p) => {
                      const thumb = p.images?.[0]?.src;
                      const cats =
                        p.categories?.map((c) => c.name).filter(Boolean).join(", ") ||
                        "—";

                      return (
                        <tr
                          key={p.id}
                          className="border-t border-slate-100 align-top hover:bg-slate-50/60"
                        >
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
                              <img
                                src={thumb}
                                alt=""
                                className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200"
                              />
                            ) : (
                              <div className="grid h-11 w-11 place-items-center rounded-xl border border-dashed border-slate-300 text-[10px] text-slate-400">
                                —
                              </div>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="font-medium text-slate-900">
                              {p.name || "(no title)"}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs">
                              <button
                                type="button"
                                className="font-medium text-violet-600 hover:underline disabled:opacity-50"
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
                          <td className="p-3">{typeBadge(p.type) || "—"}</td>
                          <td className="p-3">
                            {visibilityBadge(p.catalog_visibility) || "—"}
                          </td>
                          <td className="p-3 text-xs text-slate-600">
                            {formatDate(p.date_created)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Sticky mobile bulk action bar */}
      {selected.length > 0 && (
        <div className="sticky bottom-3 z-40 -mx-1 md:hidden">
          <div className="rounded-[26px] border border-slate-200/90 bg-white/92 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="mb-2 text-center text-xs font-semibold text-slate-600">
              {selected.length} item{selected.length === 1 ? "" : "s"} selected
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                onClick={() => doRestore(selected)}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Restore
              </button>

              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:opacity-50"
                onClick={() => doDelete(selected)}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}