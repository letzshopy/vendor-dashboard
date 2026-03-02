"use client";

import React, { useMemo, useState } from "react";

type Tag = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
};

export default function TagsClient({ initial }: { initial: Tag[] }) {
  const [rows, setRows] = useState<Tag[]>(initial);

  // add form
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  // search
  const [q, setQ] = useState("");

  // quick edit
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (t) =>
        t.name.toLowerCase().includes(s) || t.slug.toLowerCase().includes(s)
    );
  }, [q, rows]);

  async function createTag(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/tags/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: desc.trim() || undefined,
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      alert(j?.error || "Create failed");
      return;
    }
    setRows((prev) => [...prev, j.tag]);
    setName("");
    setDesc("");
  }

  function startEdit(t: Tag) {
    setEditId(t.id);
    setEditName(t.name);
    setEditSlug(t.slug);
    setEditDesc(t.description || "");
  }

  function cancelEdit() {
    setEditId(null);
    setEditName("");
    setEditSlug("");
    setEditDesc("");
  }

  async function saveEdit() {
    if (!editId) return;
    const r = await fetch(`/api/tags/${editId}/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        slug: editSlug.trim() || undefined,
        description: editDesc.trim() || undefined,
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      alert(j?.error || "Update failed");
      return;
    }
    setRows((prev) => prev.map((x) => (x.id === editId ? j.tag : x)));
    cancelEdit();
  }

  async function remove(id: number) {
    if (!confirm("Delete this tag? Products remain but lose this tag.")) return;
    const r = await fetch(`/api/tags/${id}/delete`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) {
      alert(j?.error || "Delete failed");
      return;
    }
    setRows((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* LEFT – add tag */}
      <section className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          Add new tag
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Keep tag names short and descriptive. Slugs are generated
          automatically in WordPress.
        </p>

        <form onSubmit={createTag} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Name
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Description (optional)
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Shown in some themes and filters. You can leave this empty.
            </p>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
            type="submit"
          >
            Add tag
          </button>
        </form>
      </section>

      {/* RIGHT – list + quick edit */}
      <section className="md:col-span-2 rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              All tags
            </div>
            <p className="text-xs text-slate-500">
              Click “Quick edit” to adjust slug or description.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <input
              className="w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              placeholder="Search by name or slug…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-3 py-2">Name</th>
                <th className="w-40 px-3 py-2">Slug</th>
                <th className="px-3 py-2">Description</th>
                <th className="w-24 px-3 py-2 text-center">Products</th>
                <th className="w-40 px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                if (editId === t.id) {
                  return (
                    <tr key={t.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2">
                        <input
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                          rows={2}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-slate-600">
                        {t.count ?? 0}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          className="mr-3 text-xs font-semibold text-violet-600 hover:text-violet-700"
                          onClick={saveEdit}
                        >
                          Save
                        </button>
                        <button
                          className="text-xs text-slate-500 hover:text-slate-700"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={t.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 text-sm text-slate-800">
                      {t.name}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-600">
                      {t.slug}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {t.description || "—"}
                    </td>
                    <td className="px-3 py-2 text-center text-sm text-slate-600">
                      {t.count ?? 0}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="mr-3 text-xs font-semibold text-violet-600 hover:text-violet-700"
                        onClick={() => startEdit(t)}
                      >
                        Quick edit
                      </button>
                      <button
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                        onClick={() => remove(t.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-xs text-slate-500"
                  >
                    No tags match your search.
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
