"use client";

import { useMemo, useState } from "react";

type Tag = { id: number; name: string; slug: string; description?: string; count?: number };

export default function TagsClient({ initial }: { initial: Tag[] }) {
  const [rows, setRows] = useState<Tag[]>(initial);

  // add form (Name + Description only; slug auto from WP)
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
    return rows.filter(t => t.name.toLowerCase().includes(s) || t.slug.toLowerCase().includes(s));
  }, [q, rows]);

  async function createTag(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/tags/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: desc.trim() || undefined }),
    });
    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Create failed");
    setRows(prev => [...prev, j.tag]);
    setName(""); setDesc("");
  }

  function startEdit(t: Tag) {
    setEditId(t.id);
    setEditName(t.name);
    setEditSlug(t.slug);
    setEditDesc(t.description || "");
  }
  function cancelEdit() {
    setEditId(null);
    setEditName(""); setEditSlug(""); setEditDesc("");
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
    if (!r.ok) return alert(j?.error || "Update failed");
    setRows(prev => prev.map(x => (x.id === editId ? j.tag : x)));
    cancelEdit();
  }

  async function remove(id: number) {
    if (!confirm("Delete this tag? Products remain but lose this tag.")) return;
    const r = await fetch(`/api/tags/${id}/delete`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Delete failed");
    setRows(prev => prev.filter(x => x.id !== id));
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Add new (Name + Description) */}
      <section className="border rounded-lg p-4">
        <div className="font-medium mb-3">Add new tag</div>
        <form onSubmit={createTag} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={name} onChange={e=>setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Description (optional)</label>
            <textarea className="w-full border rounded px-3 py-2 text-sm" rows={3} value={desc} onChange={e=>setDesc(e.target.value)} />
          </div>
          <button className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">Add tag</button>
        </form>
      </section>

      {/* List + Quick edit */}
      <section className="md:col-span-2 border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">All tags</div>
          <input
            className="border rounded px-3 py-2 text-sm"
            placeholder="Search by name or slug…"
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-2">Name</th>
                <th className="p-2 w-44">Slug</th>
                <th className="p-2">Description</th>
                <th className="p-2 w-24">Products</th>
                <th className="p-2 w-48">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                if (editId === t.id) {
                  return (
                    <tr key={t.id} className="border-t align-top">
                      <td className="p-2">
                        <input className="border rounded px-2 py-1 w-full" value={editName} onChange={e=>setEditName(e.target.value)} />
                      </td>
                      <td className="p-2">
                        <input className="border rounded px-2 py-1 w-full" value={editSlug} onChange={e=>setEditSlug(e.target.value)} />
                      </td>
                      <td className="p-2">
                        <textarea className="border rounded px-2 py-1 w-full" rows={2} value={editDesc} onChange={e=>setEditDesc(e.target.value)} />
                      </td>
                      <td className="p-2">{t.count ?? 0}</td>
                      <td className="p-2 space-x-3">
                        <button className="text-blue-600 underline" onClick={saveEdit}>Save</button>
                        <button className="text-slate-600 underline" onClick={cancelEdit}>Cancel</button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={t.id} className="border-t align-top">
                    <td className="p-2">{t.name}</td>
                    <td className="p-2">{t.slug}</td>
                    <td className="p-2">{t.description || "—"}</td>
                    <td className="p-2">{t.count ?? 0}</td>
                    <td className="p-2 space-x-3">
                      <button className="text-blue-600 underline" onClick={()=>startEdit(t)}>Quick edit</button>
                      <button className="text-red-600 underline" onClick={()=>remove(t.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">No tags.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
