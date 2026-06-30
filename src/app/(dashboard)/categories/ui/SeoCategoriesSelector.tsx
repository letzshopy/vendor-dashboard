"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Save, Search, Sparkles, X } from "lucide-react";

type Cat = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description?: string;
  count?: number;
};

type Props = {
  categories: Cat[];
};

const MIN_CATEGORIES = 3;
const MAX_CATEGORIES = 6;

export default function SeoCategoriesSelector({ categories }: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const cleanCategories = useMemo(() => {
    return categories
      .filter((cat) => cat.id > 0 && cat.name && cat.slug !== "uncategorized")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const selectedCategories = useMemo(() => {
    return selectedIds
      .map((id) => cleanCategories.find((cat) => cat.id === id))
      .filter(Boolean) as Cat[];
  }, [selectedIds, cleanCategories]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return [];

    return cleanCategories
      .filter((cat) => !selectedIds.includes(cat.id))
      .filter((cat) => cat.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, cleanCategories, selectedIds]);

  const seoPreview = selectedCategories
    .slice(0, 3)
    .map((cat) => cat.name)
    .join(" | ");

  const footerPreview = selectedCategories.map((cat) => cat.name).join(" | ");

  useEffect(() => {
    let alive = true;

    async function loadSaved() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/categories/seo", {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || "Unable to load saved SEO categories");
        }

        if (!alive) return;

        const ids = Array.isArray(data?.selectedIds)
          ? data.selectedIds
              .map((id: unknown) => Number(id))
              .filter((id: number) => Number.isInteger(id) && id > 0)
              .slice(0, MAX_CATEGORIES)
          : [];

        setSelectedIds(ids);
      } catch (err: any) {
        if (alive) {
          setError(err?.message || "Unable to load saved SEO categories");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    loadSaved();

    return () => {
      alive = false;
    };
  }, []);

  function addCategory(cat: Cat) {
    setMessage("");
    setError("");

    if (selectedIds.includes(cat.id)) return;

    if (selectedIds.length >= MAX_CATEGORIES) {
      setError(`Only ${MAX_CATEGORIES} categories can be selected.`);
      return;
    }

    setSelectedIds((prev) => [...prev, cat.id].slice(0, MAX_CATEGORIES));
    setQuery("");
  }

  function removeCategory(id: number) {
    setMessage("");
    setError("");
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  }

  async function saveCategories() {
    setMessage("");
    setError("");

    if (selectedIds.length < MIN_CATEGORIES) {
      setError(`Select at least ${MIN_CATEGORIES} product categories.`);
      return;
    }

    if (selectedIds.length > MAX_CATEGORIES) {
      setError(`Select maximum ${MAX_CATEGORIES} product categories only.`);
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/categories/seo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedIds.slice(0, MAX_CATEGORIES),
        }),
      });

      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Unable to save SEO categories");
      }

      const ids = Array.isArray(data?.selectedIds)
        ? data.selectedIds
            .map((id: unknown) => Number(id))
            .filter((id: number) => Number.isInteger(id) && id > 0)
            .slice(0, MAX_CATEGORIES)
        : selectedIds.slice(0, MAX_CATEGORIES);

      setSelectedIds(ids);
      setMessage("SEO and footer categories saved successfully.");
    } catch (err: any) {
      setError(err?.message || "Unable to save SEO categories");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-violet-100 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)] md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            Homepage SEO & Footer
          </div>

          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            Select 3 to 6 best product categories of your store for highlighting in website
          </h2>

          
        </div>

        <button
          type="button"
          onClick={saveCategories}
          disabled={saving || loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Categories
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex flex-wrap gap-2">
          {selectedCategories.length > 0 ? (
            selectedCategories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm"
              >
                <Check className="h-3.5 w-3.5 text-violet-600" />
                {cat.name}
                <button
                  type="button"
                  onClick={() => removeCategory(cat.id)}
                  className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={`Remove ${cat.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No categories selected yet. Select minimum 3 and maximum 6
              categories.
            </p>
          )}
        </div>

        <div className="relative mt-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setMessage("");
                setError("");
              }}
              disabled={loading || selectedIds.length >= MAX_CATEGORIES}
              placeholder={
                selectedIds.length >= MAX_CATEGORIES
                  ? `Maximum ${MAX_CATEGORIES} categories selected`
                  : "Start typing existing product category name..."
              }
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
            />
          </div>

          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              {suggestions.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addCategory(cat);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-violet-50"
                >
                  <span className="font-medium text-slate-800">{cat.name}</span>
                  <span className="text-xs text-slate-400">
                    {cat.count || 0} products
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1 text-xs text-slate-500">
          <p>
            Selected {selectedIds.length}/{MAX_CATEGORIES}. Minimum{" "}
            {MIN_CATEGORIES} required.
          </p>
        </div>

        {loading && (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading saved categories...
          </p>
        )}

        {message && (
          <p className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}