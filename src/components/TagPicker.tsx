"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Tag = { id: number; name: string; slug: string };

export default function TagPicker({
  value,
  onChange,
  placeholder = "Add tags…",
  maxSuggestions = 12,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxSuggestions?: number;
}) {
  const [all, setAll] = useState<Tag[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/tags/list");
        const j = await r.json();
        if (r.ok && Array.isArray(j.tags)) setAll(j.tags);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const lower = value.map(v => v.toLowerCase());
  const suggestions = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = all
      .filter(t => !lower.includes(t.name.toLowerCase()))
      .filter(t => (s ? t.name.toLowerCase().includes(s) || t.slug.toLowerCase().includes(s) : true))
      .slice(0, maxSuggestions);
    // if query doesn't match any existing, allow "create"
    if (s && !base.some(t => t.name.toLowerCase() === s)) {
      return [{ id: -1, name: q.trim(), slug: q.trim() }] as Tag[];
    }
    return base;
  }, [all, q, lower, maxSuggestions]);

  function addTag(name: string) {
    const clean = name.trim();
    if (!clean) return;
    if (lower.includes(clean.toLowerCase())) return;
    onChange([...value, clean]);
    setQ("");
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function removeTag(name: string) {
    onChange(value.filter(v => v.toLowerCase() !== name.toLowerCase()));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (q.trim()) {
        e.preventDefault();
        addTag(q);
      }
    } else if (e.key === "Backspace" && !q && value.length > 0) {
      // quick remove last
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div ref={boxRef} className="w-full">
      {/* tokens */}
      <div className="flex flex-wrap gap-2 border rounded px-2 py-1.5">
        {value.map((t) => (
          <span
            key={t.toLowerCase()}
            className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5"
            title={t}
          >
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              className="ml-1 text-blue-700/70 hover:text-blue-900"
              onClick={() => removeTag(t)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[160px] outline-none text-sm py-0.5"
        />
      </div>

      {/* dropdown */}
      {open && (
        <div className="relative">
          <div className="absolute z-10 mt-1 w-full border rounded bg-white shadow">
            <div className="max-h-60 overflow-auto py-1">
              {suggestions.length === 0 && (
                <div className="px-3 py-2 text-sm text-slate-500">No matches.</div>
              )}
              {suggestions.map((sug) => (
                <button
                  type="button"
                  key={`${sug.id}-${sug.name}`}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                  onClick={() => addTag(sug.name)}
                >
                  {sug.id === -1 ? (
                    <span>
                      Create <b>{sug.name}</b>
                    </span>
                  ) : (
                    <span>
                      {sug.name} <span className="text-slate-500 text-xs">({sug.slug})</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
