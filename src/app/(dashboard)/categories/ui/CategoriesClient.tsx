"use client";

import React, { FormEvent, useMemo, useState } from "react";
import {
  ChevronDown,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Tag,
} from "lucide-react";

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

function ActionMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-violet-300 hover:text-violet-700"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 min-w-[150px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            ✏️ <span>Quick edit</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-rose-600 transition hover:bg-rose-50"
          >
            🗑️ <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function CategoriesClient({ initial }: { initial: Cat[] }) {
  const [rows, setRows] = useState<Cat[]>(initial);
  const flat = useMemo(() => indentCats(rows), [rows]);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(true);

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editParent, setEditParent] = useState<number>(0);
  const [editDesc, setEditDesc] = useState("");

  const [working, setWorking] = useState(false);
  const [workingText, setWorkingText] = useState("Please wait...");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return flat;
    return flat.filter(
      (c) =>
        c.name.toLowerCase().includes(s) || c.slug.toLowerCase().includes(s)
    );
  }, [q, flat]);

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setWorking(true);
    setWorkingText("Creating category...");

    try {
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
      setAddOpen(false);
    } finally {
      setWorking(false);
    }
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

    setWorking(true);
    setWorkingText("Saving changes...");

    try {
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

      setRows((prev) => prev.map((x) => (x.id === editId ? j.category : x)));
      cancelEdit();
    } finally {
      setWorking(false);
    }
  }

  async function remove(id: number) {
    if (
      !confirm(
        "Delete this category? Products will remain but lose this category."
      )
    ) {
      return;
    }

    setWorking(true);
    setWorkingText("Deleting category...");

    try {
      const r = await fetch(`/api/categories/${id}/delete`, {
        method: "DELETE",
      });
      const j = await r.json();

      if (!r.ok) {
        alert(j?.error || "Delete failed");
        return;
      }

      setRows((prev) =>
        prev
          .filter((x) => x.id !== id)
          .map((x) => (x.parent === id ? { ...x, parent: 0 } : x))
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* Add new category */}
        <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <button
            type="button"
            onClick={() => setAddOpen((s) => !s)}
            className="flex w-full items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-[#faf7ff] via-white to-[#f4fbff] px-4 py-4 text-left md:px-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-50 text-violet-700 shadow-sm">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
                  Add new category
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Keep names short and clear. Parent can be changed later.
                </p>
              </div>
            </div>

            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                addOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {addOpen && (
            <div className="p-4 md:p-5">
              <form onSubmit={createCategory} className="space-y-4">
                <div>
                  <label className="mb-2 block text-[13px] font-semibold text-slate-700">
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Eg. Cotton Sarees"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-semibold text-slate-700">
                    Description <span className="text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    rows={4}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Shown on some themes under the category title."
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                >
                  Add category
                </button>
              </form>
            </div>
          )}
        </section>

        {/* Categories list */}
        <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4 md:px-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
                Category list
              </h2>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {filtered.length} items
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                placeholder="Search by name or slug…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* Mobile cards */}
          <div className="block md:hidden">
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                No categories found. Try a different search.
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {filtered.map((c) => {
                  const parentName = c.parent
                    ? rows.find((x) => x.id === c.parent)?.name || `#${c.parent}`
                    : "Root";

                  if (editId === c.id) {
                    return (
                      <div
                        key={c.id}
                        className="rounded-[20px] border border-violet-200 bg-violet-50/40 p-3 shadow-sm"
                      >
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">
                              Name
                            </label>
                            <input
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Category name"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">
                              Slug
                            </label>
                            <input
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                              value={editSlug}
                              onChange={(e) => setEditSlug(e.target.value)}
                              placeholder="slug-name"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">
                              Parent
                            </label>
                            <select
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                              value={editParent}
                              onChange={(e) => setEditParent(Number(e.target.value))}
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
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">
                              Description
                            </label>
                            <textarea
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                              rows={3}
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              placeholder="Description"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="inline-flex flex-1 items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={c.id}
                      className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                          <Tag className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">
                                {"— ".repeat(c.depth)}
                                {c.name}
                              </div>
                            </div>

                            <ActionMenu
                              onEdit={() => startEdit(c)}
                              onDelete={() => remove(c.id)}
                            />
                          </div>

                          <div className="mt-1 text-sm text-slate-600">
                            {c.slug}
                          </div>

                          <div className="mt-2 text-sm text-slate-600">
                            {parentName} • {c.count ?? 0} products
                          </div>

                          <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {c.description || "No description"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-b-[26px] md:block">
            <div className="overflow-x-auto">
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
                              onChange={(e) => setEditParent(Number(e.target.value))}
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
                      ? rows.find((x) => x.id === c.parent)?.name || `#${c.parent}`
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
          </div>
        </section>
      </div>

      {/* Action based loading overlay */}
      {working && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-white/45 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <div className="text-sm font-medium text-slate-600">
              {workingText}
            </div>
          </div>
        </div>
      )}
    </>
  );
}