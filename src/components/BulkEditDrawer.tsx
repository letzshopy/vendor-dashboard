"use client";

import { useEffect, useMemo, useState } from "react";

type Cat = { id: number; name: string; parent: number };
type Props = {
  open: boolean;
  onClose: () => void;
  ids: number[];                     // selected product ids
  onDone: () => void;                // refresh list after update
};

function indentCats(cats: Cat[]) {
  const byParent: Record<number, Cat[]> = {};
  cats.forEach((c) => {
    byParent[c.parent] ??= [];
    byParent[c.parent].push(c);
  });
  const out: (Cat & { depth: number })[] = [];
  function walk(parent: number, depth: number) {
    (byParent[parent] || []).sort((a,b)=>a.name.localeCompare(b.name)).forEach((c) => {
      out.push({ ...c, depth });
      walk(c.id, depth + 1);
    });
  }
  walk(0,0);
  return out;
}

export default function BulkEditDrawer({ open, onClose, ids, onDone }: Props) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // simple fields
  const [status, setStatus] = useState<"" | "draft" | "publish">("");
  const [visibility, setVisibility] = useState<"" | "visible" | "catalog" | "search" | "hidden">("");
  const [regular, setRegular] = useState("");
  const [sale, setSale] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [manage, setManage] = useState<"" | "on">("");
  const [qty, setQty] = useState<string>("");
  const [backorders, setBackorders] = useState<"" | "no" | "notify" | "yes">("");

  // categories
  const [cats, setCats] = useState<Cat[]>([]);
  const flatCats = useMemo(() => indentCats(cats), [cats]);
  const [catOp, setCatOp] = useState<"none"|"replace"|"add"|"remove">("none");
  const [catSelected, setCatSelected] = useState<number[]>([]);
  const [catQ, setCatQ] = useState("");
  const filteredCats = useMemo(() => {
    const q = catQ.toLowerCase();
    if (!q) return flatCats;
    return flatCats.filter(c => c.name.toLowerCase().includes(q));
  }, [flatCats, catQ]);

  // tags
  const [tagOp, setTagOp] = useState<"none"|"replace"|"append"|"remove">("none");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!open) return;
    setMsg(null); setErr(null);
    (async () => {
      const r = await fetch("/api/categories/list");
      const j = await r.json();
      if (r.ok) setCats(j.categories || []);
    })();
  }, [open]);

  function resetForm() {
    setStatus("");
    setVisibility("");
    setRegular("");
    setSale("");
    setFrom("");
    setTo("");
    setManage("");
    setQty("");
    setBackorders("");
    setCatOp("none");
    setCatSelected([]);
    setTagOp("none");
    setTags("");
  }

  async function apply() {
    try {
      setSaving(true); setMsg(null); setErr(null);

      const patch: any = {};
      if (status) patch.status = status;
      if (visibility) patch.catalog_visibility = visibility;
      if (regular !== "") patch.regular_price = regular;
      if (sale !== "") patch.sale_price = sale;
      if (from) patch.date_on_sale_from = from;
      if (to) patch.date_on_sale_to = to;
      if (manage) patch.manage_stock = manage === "on";
      if (qty !== "") patch.stock_quantity = Number(qty);
      if (backorders) patch.backorders = backorders;

      if (catOp !== "none" && catSelected.length > 0) {
        patch.categories = { ids: catSelected, op: catOp };
      }
      if (tagOp !== "none" && tags.trim()) {
        const names = tags.split(",").map(s => s.trim()).filter(Boolean);
        if (names.length) patch.tags = { names, op: tagOp };
      }

      const res = await fetch("/api/products/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, patch }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j?.error === "string" ? j.error : "Bulk update failed");

      setMsg("Updated.");
      onDone();
      resetForm();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      )}
      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-[380px] bg-white border-l z-50 transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <div className="font-semibold">Bulk Edit</div>
            <div className="text-xs text-slate-500">{ids.length} products selected</div>
          </div>
          <button className="text-sm px-2 py-1 rounded border" onClick={onClose}>Close</button>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto h-[calc(100%-56px)]">
          {/* Status / Visibility */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Status</label>
              <select className="w-full border rounded px-2 py-1.5 text-sm" value={status} onChange={e=>setStatus(e.target.value as any)}>
                <option value="">— no change —</option>
                <option value="draft">Draft</option>
                <option value="publish">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Visibility</label>
              <select className="w-full border rounded px-2 py-1.5 text-sm" value={visibility} onChange={e=>setVisibility(e.target.value as any)}>
                <option value="">— no change —</option>
                <option value="visible">Visible</option>
                <option value="catalog">Catalog only</option>
                <option value="search">Search only</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <div className="font-medium text-sm mb-2">Pricing</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Regular price</label>
                <input className="w-full border rounded px-2 py-1.5 text-sm" value={regular} onChange={e=>setRegular(e.target.value)} placeholder="leave blank = no change" />
              </div>
              <div>
                <label className="block text-sm mb-1">Sale price</label>
                <input className="w-full border rounded px-2 py-1.5 text-sm" value={sale} onChange={e=>setSale(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Sale from</label>
                <input type="date" className="w-full border rounded px-2 py-1.5 text-sm" value={from} onChange={e=>setFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Sale to</label>
                <input type="date" className="w-full border rounded px-2 py-1.5 text-sm" value={to} onChange={e=>setTo(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div>
            <div className="font-medium text-sm mb-2">Inventory</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">Manage stock</label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={manage} onChange={e=>setManage(e.target.value as any)}>
                  <option value="">— no change —</option>
                  <option value="on">Enable</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Qty</label>
                <input type="number" min={0} className="w-full border rounded px-2 py-1.5 text-sm" value={qty} onChange={e=>setQty(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Backorders</label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={backorders} onChange={e=>setBackorders(e.target.value as any)}>
                  <option value="">— no change —</option>
                  <option value="no">Do not allow</option>
                  <option value="notify">Allow, but notify</option>
                  <option value="yes">Allow</option>
                </select>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <div className="font-medium text-sm mb-2">Categories</div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <label className="text-sm col-span-1">Operation</label>
              <select className="border rounded px-2 py-1.5 text-sm col-span-2" value={catOp} onChange={e=>setCatOp(e.target.value as any)}>
                <option value="none">— no change —</option>
                <option value="replace">Replace with…</option>
                <option value="add">Add…</option>
                <option value="remove">Remove…</option>
              </select>
            </div>
            {catOp !== "none" && (
              <div className="border rounded">
                <div className="p-2 border-b">
                  <input className="w-full border rounded px-2 py-1 text-sm" placeholder="Search categories…" value={catQ} onChange={e=>setCatQ(e.target.value)} />
                </div>
                <div className="max-h-48 overflow-auto py-1">
                  {filteredCats.map(c => {
                    const checked = catSelected.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 px-3 py-1 text-sm hover:bg-gray-50 cursor-pointer" style={{ paddingLeft: 12 + c.depth * 14 }}>
                        <input type="checkbox" checked={checked} onChange={()=>{
                          setCatSelected(prev => checked ? prev.filter(x=>x!==c.id) : [...prev, c.id])
                        }}/>
                        <span>{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <div className="font-medium text-sm mb-2">Tags</div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <label className="text-sm col-span-1">Operation</label>
              <select className="border rounded px-2 py-1.5 text-sm col-span-2" value={tagOp} onChange={e=>setTagOp(e.target.value as any)}>
                <option value="none">— no change —</option>
                <option value="replace">Replace with…</option>
                <option value="append">Append…</option>
                <option value="remove">Remove…</option>
              </select>
            </div>
            {tagOp !== "none" && (
              <input className="w-full border rounded px-2 py-1.5 text-sm" placeholder="comma,separated,tags" value={tags} onChange={e=>setTags(e.target.value)} />
            )}
          </div>

          {msg && <div className="text-green-700 text-sm">{msg}</div>}
          {err && <div className="text-red-700 text-sm">{err}</div>}

          <div className="pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={apply}
              className="w-full rounded bg-blue-600 text-white py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Applying…" : "Apply changes"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
