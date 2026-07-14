"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";

import type { ImgItem } from "@/components/ProductImages";

type MediaItem = {
  id: number;
  url: string;
  title: string;
  filename: string;
  thumbnail: string;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function mediaItem(value: unknown): MediaItem | null {
  if (!isRecord(value)) return null;
  const id = Number(value.id);
  const url = typeof value.url === "string" ? value.url.trim() : "";

  if (!Number.isSafeInteger(id) || id <= 0 || !/^https?:\/\//i.test(url)) {
    return null;
  }

  return {
    id,
    url,
    title: typeof value.title === "string" ? value.title : "",
    filename: typeof value.filename === "string" ? value.filename : "",
    thumbnail:
      typeof value.thumbnail === "string" && value.thumbnail
        ? value.thumbnail
        : url,
  };
}

export default function MediaLibraryPicker({
  open,
  remaining,
  excludedIds,
  onClose,
  onSelect,
}: {
  open: boolean;
  remaining: number;
  excludedIds: number[];
  onClose: () => void;
  onSelect: (items: ImgItem[]) => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError(null);
    setSelected([]);

    void fetch("/api/media/list?type=image", { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok || !isRecord(payload)) {
          const message = isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : "Could not load Media Library.";
          throw new Error(message);
        }

        setItems(
          Array.isArray(payload.items)
            ? payload.items.flatMap((value) => {
                const item = mediaItem(value);
                return item ? [item] : [];
              })
            : [],
        );
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Could not load media.");
      })
      .finally(() => setLoading(false));
  }, [open]);

  const excluded = useMemo(() => new Set(excludedIds), [excludedIds]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return items.filter((item) => {
      if (excluded.has(item.id)) return false;
      if (!normalized) return true;
      return `${item.title} ${item.filename}`.toLowerCase().includes(normalized);
    });
  }, [excluded, items, query]);

  if (!open) return null;

  function toggle(id: number) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= remaining) return current;
      return [...current, id];
    });
  }

  function confirmSelection() {
    const selectedSet = new Set(selected);
    onSelect(
      items
        .filter((item) => selectedSet.has(item.id))
        .map((item) => ({ id: item.id, url: item.url })),
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[260] grid place-items-center bg-slate-950/60 p-3 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-4 md:px-6">
          <div>
            <h2 className="font-semibold text-slate-900">Choose from Media Library</h2>
            <p className="text-xs text-slate-500">Select up to {remaining} image{remaining === 1 ? "" : "s"}.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b p-4 md:px-6">
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search media..."
              className="min-w-0 flex-1 text-sm outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="grid place-items-center py-16 text-sm text-slate-500">
              <Loader2 className="mb-2 h-6 w-6 animate-spin" />
              Loading media...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-rose-600">{error}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filtered.map((item) => {
                const checked = selected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={`relative overflow-hidden rounded-2xl border bg-white text-left ${
                      checked ? "border-violet-600 ring-2 ring-violet-200" : "border-slate-200"
                    }`}
                  >
                    {/* WordPress Media Library thumbnail. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.thumbnail} alt="" className="aspect-square w-full object-cover" />
                    <span className="block truncate px-2 py-2 text-xs text-slate-700">
                      {item.title || item.filename || `Media #${item.id}`}
                    </span>
                    {checked && (
                      <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-violet-600 text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500">No media found.</div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-4 md:px-6">
          <span className="text-xs text-slate-500">{selected.length} selected</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-sm">Cancel</button>
            <button
              type="button"
              onClick={confirmSelection}
              disabled={selected.length === 0}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Use selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
