// src/components/MediaClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import ImageUploader from "./ImageUploader";

type MediaItem = {
  id: number;
  url: string;
  title: string;
  filename: string;
  mime: string;
  size_kb?: number;
  uploaded?: string;
  width?: number;
  height?: number;
  attached_to?: string | null;
  thumbnail?: string;
};

async function fetchMedia(q = "", type = "all") {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type !== "all") params.set("type", type);

  const res = await fetch(`/api/media/list?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    let msg = `Failed to load media (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const data = await res.json();
  return data.items as MediaItem[];
}

async function deleteMany(ids: number[]) {
  const res = await fetch(`/api/media/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) {
    let msg = `Delete failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}

function humanMime(mime: string) {
  if (!mime) return "—";
  const [group] = mime.split("/");
  if (group === "image") return "Image";
  if (group === "video") return "Video";
  if (group === "audio") return "Audio";
  return group.charAt(0).toUpperCase() + group.slice(1);
}

type ViewMode = "grid" | "list";
type FilterType = "all" | "image" | "video" | "doc";

export default function MediaClient({
  defaultView = "grid",
}: {
  defaultView?: ViewMode;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [type, setType] = useState<FilterType>("all");
  const [view, setView] = useState<ViewMode>(defaultView ?? "grid");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // lightbox preview
  const [preview, setPreview] = useState<MediaItem | null>(null);

  // pagination
  const [perPage, setPerPage] = useState<number>(25);
  const [page, setPage] = useState<number>(1);

  // which media just got "copied"
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredItems = useMemo(() => items, [items]);

  useEffect(() => {
    setPage(1);
  }, [items.length, perPage]);

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, totalItems);

  const pageItems = useMemo(() => {
    if (totalItems === 0) return [];
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, startIndex, endIndex, totalItems]);

  const selectedArray = useMemo(() => Array.from(selected), [selected]);
  const selectedCount = selectedArray.length;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMedia(q, type);
      setItems(data);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load media");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type]);

  const toggle = (id: number) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (!items.length) return;
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const bulkDelete = async () => {
    if (!selectedCount) return;
    if (!confirm(`Delete ${selectedCount} file(s)? This can’t be undone.`))
      return;

    try {
      await deleteMany(selectedArray);
      await load();
      setSelected(new Set());
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  };

  const onUploaded = async () => {
    await load();
  };

  const openPreview = (m: MediaItem) => setPreview(m);
  const closePreview = () => setPreview(null);

  const fromLabel = totalItems === 0 ? 0 : startIndex + 1;
  const toLabel = endIndex;

  // per-item copy helper (no alert, just inline message)
  const copyUrl = async (id: number, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    } catch {
      // optional: handle copy failure quietly
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Top toolbar card */}
        <div className="flex flex-col gap-3 rounded-2xl border border-violet-100 bg-gradient-to-r from-white via-violet-50/60 to-sky-50/60 px-4 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.06)] md:flex-row md:items-center">
          {/* Upload + refresh */}
          <div className="flex items-center gap-2">
            <ImageUploader onUploaded={onUploaded}>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
              >
                Upload
              </button>
            </ImageUploader>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={load}
            >
              Refresh
            </button>
          </div>

          <div className="flex-1" />

          {/* Search + filters */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="w-56 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
              placeholder="Search filename or title…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <select
              className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
              value={view}
              onChange={(e) => setView(e.target.value as ViewMode)}
              title="View mode"
            >
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </select>

            <select
              className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
              value={type}
              onChange={(e) => setType(e.target.value as FilterType)}
              title="Filter by type"
            >
              <option value="all">All types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="doc">Documents</option>
            </select>

            {/* Rows per page selector (desktop) */}
            <div className="hidden items-center gap-1 text-[11px] text-slate-600 sm:flex">
              <span>Rows per page</span>
              <select
                className="h-8 rounded-full border border-slate-200 bg-white/80 px-2 text-xs text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
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

        {/* Bulk actions row */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={items.length > 0 && selected.size === items.length}
              onChange={toggleAll}
            />
            <span className="text-slate-600">
              {selectedCount
                ? `${selectedCount} selected of ${items.length}`
                : items.length
                ? `${items.length} file${items.length === 1 ? "" : "s"}`
                : "No files"}
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedCount}
              onClick={bulkDelete}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Main content */}
        {loading ? (
          <div className="text-sm text-slate-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No media files yet. Click{" "}
            <span className="font-semibold">Upload</span> to add your first
            image.
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {pageItems.map((m) => (
              <div
                key={m.id}
                className="group overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => openPreview(m)}
                  className="relative block aspect-square w-full bg-slate-50"
                >
                  <input
                    type="checkbox"
                    className="absolute left-2 top-2 z-10 h-4 w-4 rounded border-white bg-white/90 text-violet-600 shadow"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="absolute right-2 top-2 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                    {humanMime(m.mime)}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.thumbnail || m.url}
                    alt={m.title || m.filename}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
                <div className="px-3 py-2">
                  <div
                    className="truncate text-sm font-medium text-slate-900"
                    title={m.title || m.filename}
                  >
                    {m.title || "(untitled)"}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {m.filename}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    {m.size_kb ? `${m.size_kb} KB` : ""}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyUrl(m.id, m.url);
                        }}
                        className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 opacity-0 shadow-sm transition group-hover:opacity-100"
                      >
                        Copy URL
                      </button>
                      {copiedId === m.id && (
                        <span className="text-[11px] font-medium text-emerald-600">
                          Copied
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-xs font-medium text-slate-500">
                  <th className="w-10 p-2"></th>
                  <th className="w-16 p-2">Preview</th>
                  <th className="p-2">Title / filename</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Size</th>
                  <th className="p-2">Uploaded</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((m) => (
                  <tr
                    key={m.id}
                    className="border-t border-slate-100 hover:bg-violet-50/40"
                  >
                    <td className="p-2 align-middle">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={selected.has(m.id)}
                        onChange={() => toggle(m.id)}
                      />
                    </td>
                    <td className="p-2 align-middle">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.thumbnail || m.url}
                        alt={m.title || m.filename}
                        className="h-10 w-10 rounded object-cover"
                      />
                    </td>
                    <td className="p-2 align-top">
                      <div className="max-w-xs truncate font-medium text-slate-900">
                        {m.title || "(untitled)"}
                      </div>
                      <div className="max-w-xs truncate text-xs text-slate-500">
                        {m.filename}
                      </div>
                    </td>
                    <td className="p-2 align-middle">{humanMime(m.mime)}</td>
                    <td className="p-2 align-middle">
                      {m.size_kb ? `${m.size_kb} KB` : "—"}
                    </td>
                    <td className="p-2 align-middle">{m.uploaded || "—"}</td>
                    <td className="p-2 align-middle space-x-2">
                      <button
                        type="button"
                        className="text-xs font-medium text-violet-600 hover:underline"
                        onClick={() => openPreview(m)}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-slate-600 hover:underline"
                        onClick={() => copyUrl(m.id, m.url)}
                      >
                        Copy URL
                      </button>
                      {copiedId === m.id && (
                        <span className="ml-1 text-[11px] font-medium text-emerald-600">
                          Copied
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {items.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs text-slate-600 sm:flex-row">
            <div>
              Showing{" "}
                <span className="font-semibold">
                  {fromLabel}-{toLabel}
                </span>{" "}
              of <span className="font-semibold">{totalItems}</span> files
            </div>

            <div className="flex items-center gap-3">
              {/* Small rows-per-page selector for mobile */}
              <div className="flex items-center gap-1 text-[11px] text-slate-600 sm:hidden">
                <span>Rows</span>
                <select
                  className="h-7 rounded-full border border-slate-200 bg-white/80 px-2 text-[11px] text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span>
                  Page{" "}
                  <span className="font-semibold">{currentPage}</span> of{" "}
                  <span className="font-semibold">{totalPages}</span>
                </span>
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox preview */}
      {preview && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
          onClick={closePreview}
        >
          <div
            className="max-h-[90vh] w-[95%] max-w-3xl rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {preview.title || preview.filename || `Media #${preview.id}`}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {preview.filename}
                </div>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="flex max-h-[65vh] items-center justify-center overflow-auto rounded-xl bg-slate-50">
              {preview.mime.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={preview.title || preview.filename}
                  className="max-h-[60vh] w-auto object-contain"
                />
              ) : (
                <div className="p-6 text-sm text-slate-500">
                  Preview not available for this file type.
                </div>
              )}
            </div>

            <div className="mt-3 grid gap-2 text-[11px] text-slate-600 md:grid-cols-2">
              <div>
                <span className="font-semibold">ID:</span> {preview.id}
              </div>
              <div className="break-all md:text-right">
                <span className="font-semibold">Type:</span> {preview.mime}
              </div>
              {preview.width && preview.height && (
                <div>
                  <span className="font-semibold">Dimensions:</span>{" "}
                  {preview.width} × {preview.height}px
                </div>
              )}
              <div className="col-span-full break-all">
                <span className="font-semibold">URL:</span> {preview.url}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
