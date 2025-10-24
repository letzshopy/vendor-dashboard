"use client";

import { useMemo, useState } from "react";

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
  cats.forEach(c => { (byParent[c.parent] ??= []).push(c); });
  const out: (Cat & { depth: number })[] = [];
  function walk(parent: number, depth: number) {
    (byParent[parent] || [])
      .sort((a,b)=>a.name.localeCompare(b.name))
      .forEach(c => {
        out.push({ ...c, depth });
        walk(c.id, depth+1);
      });
  }
  walk(0,0);
  return out;
}

export default function CategoriesClient({ initial }: { initial: Cat[] }) {
  const [rows, setRows] = useState<Cat[]>(initial);
  const flat = useMemo(() => indentCats(rows), [rows]);

  // add form (ONLY name + description)
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  // search
  const [q, setQ] = useState("");

  // quick edit (can change slug + parent here)
  const [editId, setEditId] = useState<number|null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editParent, setEditParent] = useState<number>(0);
  const [editDesc, setEditDesc] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return flat;
    return flat.filter(c => c.name.toLowerCase().includes(s) || c.slug.toLowerCase().includes(s));
  }, [q, flat]);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/categories/create", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: desc.trim() || undefined,
        parent: 0,          // default root
        // slug omitted (WP will generate from name)
      }),
    });
    const j = await r.json();
    if (!r.ok) { alert(j?.error || "Create failed"); return; }
    setRows(prev => [...prev, j.category]);
    setName(""); setDesc("");
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
    setEditName(""); setEditSlug(""); setEditParent(0); setEditDesc("");
  }

  async function saveEdit() {
    if (!editId) return;
    const r = await fetch(`/api/categories/${editId}/update`, {
      method: "PUT",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        slug: editSlug.trim() || undefined,
        parent: editParent || 0,
        description: editDesc.trim() || undefined,
      }),
    });
    const j = await r.json();
    if (!r.ok) { alert(j?.error || "Update failed"); return; }
    setRows(prev => prev.map(x => x.id === editId ? j.category : x));
    cancelEdit();
  }

  async function remove(id: number) {
    if (!confirm("Delete this category? Products remain but lose this category.")) return;
    const r = await fetch(`/api/categories/${id}/delete`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) { alert(j?.error || "Delete failed"); return; }
    // remove and lift any children to root
    setRows(prev => prev.filter(x => x.id !== id).map(x => x.parent === id ? { ...x, parent: 0 } : x));
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Add new (Name + Description only) */}
      <section className="border rounded-lg p-4">
        <div className="font-medium mb-3">Add new category</div>
        <form onSubmit={createCategory} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={name}
              onChange={e=>setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Description (optional)</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              rows={3}
              value={desc}
              onChange={e=>setDesc(e.target.value)}
            />
          </div>
          <button className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">
            Add category
          </button>
        </form>
      </section>

      {/* List + Quick edit */}
      <section className="md:col-span-2 border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">All categories</div>
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
                <th className="p-2 w-40">Parent</th>
                <th className="p-2 w-24">Products</th>
                <th className="p-2 w-48">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                if (editId === c.id) {
                  return (
                    <tr key={c.id} className="border-t align-top">
                      <td className="p-2">
                        <input className="border rounded px-2 py-1 w-full" value={editName} onChange={e=>setEditName(e.target.value)} />
                        <div className="text-xs text-slate-500 mt-1">
                          <textarea
                            className="border rounded px-2 py-1 w-full mt-1"
                            rows={2}
                            value={editDesc}
                            onChange={e=>setEditDesc(e.target.value)}
                            placeholder="Description"
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <input className="border rounded px-2 py-1 w-full" value={editSlug} onChange={e=>setEditSlug(e.target.value)} />
                      </td>
                      <td className="p-2">
                        <select
                          className="border rounded px-2 py-1 w-full"
                          value={editParent}
                          onChange={e=>setEditParent(Number(e.target.value))}
                        >
                          <option value={0}>None</option>
                          {flat.filter(x=>x.id!==c.id).map(x=>(
                            <option key={x.id} value={x.id}>
                              {"".padStart(x.depth*2, " ")}{x.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">{c.count ?? 0}</td>
                      <td className="p-2 space-x-3">
                        <button className="text-blue-600 underline" onClick={saveEdit}>Save</button>
                        <button className="text-slate-600 underline" onClick={cancelEdit}>Cancel</button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={c.id} className="border-t align-top">
                    <td className="p-2">
                      {"".padStart(c.depth*2, " ")}{c.name}
                      <div className="text-xs text-slate-500 mt-1">
                        {c.description || "—"}
                      </div>
                    </td>
                    <td className="p-2">{c.slug}</td>
                    <td className="p-2">{c.parent ? rows.find(x=>x.id===c.parent)?.name || `#${c.parent}` : "—"}</td>
                    <td className="p-2">{c.count ?? 0}</td>
                    <td className="p-2 space-x-3">
                      <button className="text-blue-600 underline" onClick={()=>startEdit(c)}>Quick edit</button>
                      <button className="text-red-600 underline" onClick={()=>remove(c.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">No categories.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
