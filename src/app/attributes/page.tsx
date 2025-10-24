"use client";

import { useEffect, useMemo, useState } from "react";

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
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Attributes</h1>
        <button
          onClick={load}
          className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Quick seed */}
      <QuickSeed onDone={load} />

      {/* New Attribute */}
      <NewAttribute onDone={load} />

      {/* List */}
      <section className="mt-6">
        <h2 className="text-lg font-medium mb-2">Existing attributes</h2>
        {loading && <div className="text-sm text-slate-600">Loading…</div>}
        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {err}
          </div>
        )}
        {!loading && attrs.length === 0 && <div>No attributes yet.</div>}

        <div className="space-y-3">
          {attrs.map((a) => (
            <AttrCard key={a.id} attr={a} onChanged={load} />
          ))}
        </div>
      </section>
    </main>
  );
}

function NewAttribute({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<"select" | "text">("select");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
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
          slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
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
    <section className="border rounded-lg p-4">
      <h2 className="text-lg font-medium mb-3">Create attribute</h2>
      <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Color"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Slug (optional)</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="color"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Type</label>
          <select
            className="w-full border rounded px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            <option value="select">Select</option>
            <option value="text">Text</option>
          </select>
        </div>
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create"}
          </button>
          {msg && <span className="ml-3 text-sm text-green-700">{msg}</span>}
          {err && <span className="ml-3 text-sm text-red-700">{err}</span>}
        </div>
      </form>
    </section>
  );
}

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
    if (open && terms == null) loadTerms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function addTerm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/attributes/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: attr.id,
          name,
          slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
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
      onChanged(); // attribute list may reflect term counts depending on theme/plugins
    } catch (e: any) {
      setErr(e?.message || "Create term failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
        <div>
          <div className="font-medium">{attr.name}</div>
          <div className="text-xs text-slate-500">
            slug: {attr.slug} • type: {attr.type} • order_by: {attr.order_by}
          </div>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded border px-3 py-1.5 text-sm hover:bg-white"
        >
          {open ? "Hide terms" : "Manage terms"}
        </button>
      </div>

      {open && (
        <div className="p-4">
          <form onSubmit={addTerm} className="grid sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm mb-1">New term name</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={attr.name === "Color" ? "Red" : "Large"}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Slug (optional)</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={attr.name === "Color" ? "red" : "large"}
              />
            </div>
            <div className="sm:col-span-1">
              <button
                type="submit"
                disabled={busy}
                className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? "Adding…" : "Add term"}
              </button>
            </div>
          </form>

          {err && (
            <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {err}
            </div>
          )}

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Terms</div>
            {terms == null && <div className="text-sm text-slate-600">Loading…</div>}
            {terms && terms.length === 0 && <div className="text-sm">No terms yet.</div>}
            {terms && terms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {terms.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center rounded border px-2 py-1 text-xs bg-white"
                  >
                    {t.name}
                    <span className="ml-2 text-slate-400">({t.slug})</span>
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

function QuickSeed({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      // Create Color & Size if missing
      const res = await fetch("/api/attributes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: "color-size" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Seed failed");
      setMsg("Ensured Color & Size attributes exist.");
      onDone();
    } catch (e: any) {
      setErr(e?.message || "Seed failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Quick setup</div>
          <div className="text-sm text-slate-600">
            One-click ensure <b>Color</b> and <b>Size</b> attributes exist.
          </div>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {busy ? "Working…" : "Create Color & Size"}
        </button>
      </div>
      {msg && <div className="mt-2 text-sm text-green-700">{msg}</div>}
      {err && <div className="mt-2 text-sm text-red-700">{err}</div>}
    </section>
  );
}
