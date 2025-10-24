// src/components/MediaClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  const res = await fetch(`/api/media/list?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    let msg = `Failed to load media (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore JSON parse errors */
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
    } catch {}
    throw new Error(msg);
  }
}

function humanMime(mime: string) {
  if (!mime) return "—";
  return mime.split("/")[0].replace(/^\w/, (c) => c.toUpperCase());
}

export default function MediaClient({ defaultView = "grid" as "grid" | "list" }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "image" | "video" | "doc">("all");
  const [view, setView] = useState<"grid" | "list">(defaultView);
  const [selected, setSelected] = useState<Set<number>>(new Set());

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
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const bulkDelete = async () => {
    if (!selectedCount) return;
    if (!confirm(`Delete ${selectedCount} file(s)? This can’t be undone.`)) return;
    try {
      await deleteMany(selectedArray);
      await load();
      setSelected(new Set());
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  };

  const bulkCopyUrls = async () => {
    const urls = items.filter(i => selected.has(i.id)).map(i => i.url).join("\n");
    await navigator.clipboard.writeText(urls);
    alert("Copied URLs to clipboard");
  };

  const onUploaded = async () => {
    await load();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2">
          <ImageUploader onUploaded={onUploaded}>
            <button className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border shadow-sm" type="button">
              Upload
            </button>
          </ImageUploader>

          <button className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border" onClick={load}>
            Refresh
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <input
            className="w-56 rounded-xl border px-3 py-2"
            placeholder="Search filename or title…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-xl border px-3 py-2"
            value={view}
            onChange={(e) => setView(e.target.value as any)}
            title="Toggle view"
          >
            <option value="grid">Grid</option>
            <option value="list">List</option>
          </select>
          <select
            className="rounded-xl border px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            title="Filter by type"
          >
            <option value="all">All types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="doc">Documents</option>
          </select>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selected.size === items.length && items.length > 0}
          onChange={toggleAll}
        />
        <span className="text-sm text-gray-600">
          {selectedCount ? `${selectedCount} selected` : "—"}
        </span>
        <button
          className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 border disabled:opacity-50"
          disabled={!selectedCount}
          onClick={bulkCopyUrls}
          title="Copy URLs"
        >
          Copy URLs
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 border text-red-600 disabled:opacity-50"
          disabled={!selectedCount}
          onClick={bulkDelete}
          title="Delete selected"
        >
          Delete
        </button>
      </div>

      {/* Error message */}
      {error ? (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-2">
          {error}
        </div>
      ) : null}

      {/* Body */}
      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {items.map((m) => (
            <div key={m.id} className="group rounded-xl border overflow-hidden">
              <div className="relative aspect-square bg-gray-50">
                <input
                  type="checkbox"
                  className="absolute top-2 left-2 z-10 h-4 w-4"
                  checked={selected.has(m.id)}
                  onChange={() => toggle(m.id)}
                />
                <Link href={`/media/${m.id}`} className="block h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.thumbnail || m.url}
                    alt={m.title || m.filename}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </Link>
              </div>
              <div className="px-3 py-2">
                <div className="text-sm font-medium truncate" title={m.title || m.filename}>
                  {m.title || "(untitled)"}
                </div>
                <div className="text-xs text-gray-500 truncate">{m.filename}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 w-10"></th>
                <th className="p-2 text-left">Preview</th>
                <th className="p-2 text-left">Title / Filename</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Size</th>
                <th className="p-2 text-left">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggle(m.id)}
                    />
                  </td>
                  <td className="p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.thumbnail || m.url}
                      alt={m.title || m.filename}
                      className="h-10 w-10 object-cover rounded"
                    />
                  </td>
                  <td className="p-2">
                    <Link href={`/media/${m.id}`} className="font-medium hover:underline">
                      {m.title || "(untitled)"}
                    </Link>
                    <div className="text-xs text-gray-500">{m.filename}</div>
                  </td>
                  <td className="p-2">{humanMime(m.mime)}</td>
                  <td className="p-2">{m.size_kb ? `${m.size_kb} KB` : "—"}</td>
                  <td className="p-2">{m.uploaded || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
