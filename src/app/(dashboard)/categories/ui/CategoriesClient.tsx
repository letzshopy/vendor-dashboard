"use client";

import React, { FormEvent, useMemo, useState } from "react";

type Cat = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description?: string;
  count?: number;
};

function indentCats(cats: Cat[]) {
  const byParent: Record<number, Cat[]> = {};
  cats.forEach((c) => {
    if (!byParent[c.parent]) byParent[c.parent] = [];
    byParent[c.parent].push(c);
  });

  const out: (Cat & { depth: number })[] = [];

  function walk(parent: number, depth: number) {
    (byParent[parent] || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((c) => {
        out.push({ ...c, depth });
        walk(c.id, depth + 1);
      });
  }

  walk(0, 0);
  return out;
}

export default function CategoriesClient({ initial }: { initial: Cat[] }) {
  const [rows, setRows] = useState<Cat[]>(initial);
  const flat = useMemo(() => indentCats(rows), [rows]);

  // Add form
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  // Search
  const [q, setQ] = useState("");

  // Quick edit
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editParent, setEditParent] = useState<number>(0);
  const [editDesc, setEditDesc] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return flat;
    return flat.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.slug.toLowerCase().includes(s)
    );
  }, [q, flat]);

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const r = await fetch("/api/categories/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trimmed,
        description: desc.trim() || undefined,
        parent: 0,
      }),
    });

    const j = await r.json();
    if (!r.ok) {
      alert(j?.error || "Create failed");
      return;
    }

    setRows((prev) => [...prev, j.category]);
    setName("");
    setDesc("");
  }

  function startEdit(c: Cat) {
    setEditId(c.id);
    setEditName(c.name);
    setEditSlug(c.slug);
    setEditParent(c.parent);
    setEditDesc(c.description || "");
  }

  function cancelEdit() {
    setEditId(null);
    setEditName("");
    setEditSlug("");
    setEditParent(0);
    setEditDesc("");
  }

  async function saveEdit() {
    if (!editId) return;

    const r = await fetch(`/api/categories/${editId}/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        slug: editSlug.trim() || undefined,
        parent: editParent || 0,
        description: editDesc.trim() || undefined,
      }),
    });

    const j = await r.json();
    if (!r.ok) {
      alert(j?.error || "Update failed");
      return;
    }

    setRows((prev) =>
      prev.map((x) => (x.id === editId ? j.category : x))
    );
    cancelEdit();
  }

  async function remove(id: number) {
    if (
      !confirm(
        "Delete this category? Products will remain but lose this category."
      )
    )
      return;

    const r = await fetch(`/api/categories/${id}/delete`, {
      method: "DELETE",
    });
    const j = await r.json();
    if (!r.ok) {
      alert(j?.error || "Delete failed");
      return;
    }

    // Remove and lift children to root
    setRows((prev) =>
      prev
        .filter((x) => x.id !== id)
        .map((x) => (x.parent === id ? { ...x, parent: 0 } : x))
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
      {/* Add new category card */}
      <section className="rounded-2xl border border-violet-50 bg-white/80 p-5 shadow-sm shadow-violet-100/40 backdrop-blur">
        <h2 className="text-sm font-semibold text-slate-900">
          Add new category
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Keep names short and clear. You can assign parent later from the list.
        </p>

        <form onSubmit={createCategory} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Name<span className="text-rose-500">*</span>
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Eg. Cotton Sarees"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Shown on some themes under the category title."
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-300 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            + Add category
          </button>
        </form>
      </section>

      {/* List + quick edit card */}
      <section className="rounded-2xl border border-violet-50 bg-white/80 p-5 shadow-sm shadow-violet-100/40 backdrop-blur">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              All categories
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Drag & drop is not enabled yet, but you can change parent using{" "}
              <span className="font-medium">Quick edit</span>.
            </p>
          </div>

          <div className="relative w-full max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              🔍
            </span>
            <input
              className="w-full rounded-full border border-slate-200 bg-slate-50 px-8 py-2 text-xs text-slate-800 shadow-sm focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
              placeholder="Search by name or slug…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2 w-40">Slug</th>
                <th className="px-3 py-2 w-40">Parent</th>
                <th className="px-3 py-2 w-20 text-center">Products</th>
                <th className="px-3 py-2 w-36 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                if (editId === c.id) {
                  // Quick edit row
                  return (
                    <tr
                      key={c.id}
                      className="border-t border-slate-100 bg-violet-50/40 align-top"
                    >
                      <td className="px-3 py-3">
                        <input
                          className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Category name"
                        />
                        <textarea
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          rows={2}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Description"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                          placeholder="slug-name"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          value={editParent}
                          onChange={(e) =>
                            setEditParent(Number(e.target.value))
                          }
                        >
                          <option value={0}>None</option>
                          {flat
                            .filter((x) => x.id !== c.id)
                            .map((x) => (
                              <option key={x.id} value={x.id}>
                                {"— ".repeat(x.depth)}
                                {x.name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-slate-600">
                        {c.count ?? 0}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="rounded-full bg-violet-600 px-3 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-violet-700"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const parentName = c.parent
                  ? rows.find((x) => x.id === c.parent)?.name ||
                    `#${c.parent}`
                  : "—";

                return (
                  <tr
                    key={c.id}
                    className="border-t border-slate-100 align-top hover:bg-slate-50/60"
                  >
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-slate-900">
                          {"— ".repeat(c.depth)}
                          {c.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {c.description || "No description"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-700">
                      {c.slug}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-700">
                      {parentName}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {c.count ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-3 text-[11px]">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="text-violet-600 hover:text-violet-800"
                        >
                          Quick edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(c.id)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-xs text-slate-500"
                  >
                    No categories found. Try a different search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
