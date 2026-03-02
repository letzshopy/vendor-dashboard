"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

/** TYPES */
type Attr = {
  id: number;
  name: string;
  slug: string;
  type: "select" | "text";
  order_by: "menu_order" | "name" | "name_num" | "id";
  has_archives: boolean;
};

type Term = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  menu_order?: number;
};

/** MAIN PAGE */
export default function AttributesPage() {
  const [loading, setLoading] = useState(true);
  const [attrs, setAttrs] = useState<Attr[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/attributes/terms", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Load failed");
      setAttrs(data.attributes || []);
    } catch (e: any) {
      setErr(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      {/* Header */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-violet-50 via-sky-50 to-rose-50 px-5 py-4">
        <h1 className="text-xl font-semibold text-slate-900">Attributes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Define global product attributes like <b>Color</b> and <b>Size</b>.
          Use terms inside each attribute to power variations and filters.
        </p>
      </div>

      {/* Quick seed & new attribute */}
      <div className="mb-5 grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.4fr)]">
        <QuickSeed onDone={load} />

        <NewAttribute onDone={load} />
      </div>

      {/* Existing attributes list */}
      <section className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Existing attributes
            </h2>
            <p className="text-xs text-slate-500">
              Click <b>Manage terms</b> to add or view values inside each
              attribute.
            </p>
          </div>

          <button
            onClick={load}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {loading && (
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Loading attributes…
          </div>
        )}

        {err && (
          <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {err}
          </div>
        )}

        {!loading && attrs.length === 0 && !err && (
          <div className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            No attributes found yet. Use the <b>Create attribute</b> panel
            above to add one.
          </div>
        )}

        {!loading && attrs.length > 0 && (
          <div className="mt-3 space-y-4">
            {attrs.map((a) => (
              <AttrCard key={a.id} attr={a} onChanged={load} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/** QUICK SEED: ensure Color + Size */
function QuickSeed({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/attributes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: "color-size" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Quick setup failed");
      setMsg("Color & Size attributes are ready to use.");
      onDone();
    } catch (e: any) {
      setErr(e?.message || "Quick setup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Quick setup
          </div>
          <p className="mt-1 text-xs text-slate-600">
            One-click to ensure <b>Color</b> and <b>Size</b> attributes exist in
            WooCommerce. Safe to run even if they already exist.
          </p>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center rounded-full bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
        >
          {busy ? "Working…" : "Create Color & Size"}
        </button>
      </div>

      {msg && (
        <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {msg}
        </div>
      )}
      {err && (
        <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {err}
        </div>
      )}
    </section>
  );
}

/** CREATE ATTRIBUTE PANEL */
function NewAttribute({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<"select" | "text">("select");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetch("/api/attributes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug || name.toLowerCase().trim().replace(/\s+/g, "-"),
          type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Create failed");

      setMsg("Attribute created.");
      setName("");
      setSlug("");
      setType("select");
      onDone();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-slate-900">
        Create attribute
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Use attributes for variation options (e.g., size, color) or filters.
      </p>

      <form
        onSubmit={submit}
        className="grid items-end gap-3 sm:grid-cols-3"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Name
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Color"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Slug (optional)
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="color"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Type
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            value={type}
            onChange={(e) => setType(e.target.value as "select" | "text")}
          >
            <option value="select">Select</option>
            <option value="text">Text</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create attribute"}
          </button>
          {msg && (
            <span className="ml-3 text-xs font-medium text-emerald-600">
              {msg}
            </span>
          )}
          {err && (
            <span className="ml-3 text-xs font-medium text-rose-600">
              {err}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

/** ATTRIBUTE CARD + TERMS */
function AttrCard({ attr, onChanged }: { attr: Attr; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [terms, setTerms] = useState<Term[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  async function loadTerms() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/attributes/terms?id=${attr.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Load terms failed");
      setTerms(data.terms || []);
    } catch (e: any) {
      setErr(e?.message || "Load terms failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (open && terms === null) {
      loadTerms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function addTerm(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/attributes/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: attr.id,
          name,
          slug: slug || name.toLowerCase().trim().replace(/\s+/g, "-"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const raw = data?.error;
        const msg =
          typeof raw === "string"
            ? raw
            : raw?.message || JSON.stringify(raw) || "Create term failed";
        throw new Error(msg);
      }

      setName("");
      setSlug("");
      await loadTerms();
      onChanged(); // term counts may update elsewhere
    } catch (e: any) {
      setErr(e?.message || "Create term failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* header row */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {attr.name}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            slug: <span className="font-mono">{attr.slug}</span> · type:{" "}
            {attr.type} · order by: {attr.order_by}
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {open ? "Hide terms" : "Manage terms"}
        </button>
      </div>

      {/* body */}
      {open && (
        <div className="px-4 py-3">
          {/* add term form */}
          <form
            onSubmit={addTerm}
            className="grid items-end gap-3 pb-4 sm:grid-cols-3 border-b border-slate-100"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                New term name
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={attr.name === "Color" ? "Red" : "Large"}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Slug (optional)
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={attr.name === "Color" ? "red" : "large"}
              />
            </div>
            <div className="sm:col-span-1">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
              >
                {busy ? "Adding…" : "Add term"}
              </button>
            </div>
          </form>

          {/* errors */}
          {err && (
            <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {err}
            </div>
          )}

          {/* term list */}
          <div className="mt-3">
            <div className="mb-2 text-xs font-semibold text-slate-700">
              Terms
            </div>
            {terms === null && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Loading terms…
              </div>
            )}

            {terms && terms.length === 0 && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                No terms added yet.
              </div>
            )}

            {terms && terms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {terms.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                  >
                    {t.name}
                    <span className="ml-2 text-[11px] text-slate-400">
                      ({t.slug})
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
