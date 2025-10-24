"use client";

import { useEffect, useMemo, useState } from "react";

/** TYPES */
type MenuItem = {
  id: string;
  type: "page" | "category" | "custom";
  title: string;
  url?: string;
  refId?: number;
  children?: MenuItem[];
};

type MenuKey = "primary" | "footer_discover" | "footer_info";

type MenuDef = {
  key: MenuKey;
  label: string;
  also: string[];
  mode: "location" | "menu_id";
};

const MENUS: MenuDef[] = [
  { key: "primary",         label: "Primary Menu",         also: ["Off-Canvas Menu"], mode: "location" },
  { key: "footer_discover", label: "Footer - Discover",    also: [],                  mode: "menu_id" },
  { key: "footer_info",     label: "Footer - Information", also: [],                  mode: "menu_id" },
];

const STORAGE_KEY = (k: MenuKey) => `ls_menu_${k}_v4`;
const uid = () => Math.random().toString(36).slice(2, 9);

/** ---------- immutable helpers ---------- */
type Path = number[];

function deepClone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }

function getSiblings(items: MenuItem[], parentPath: Path): MenuItem[] {
  let cur: any = items;
  for (const idx of parentPath) cur = cur[idx].children!;
  return cur;
}

function removeAtPath(items: MenuItem[], path: Path): [MenuItem[], MenuItem] {
  const next = deepClone(items);
  const parentPath = path.slice(0, -1);
  const idx = path[path.length - 1];
  const siblings = getSiblings(next, parentPath);
  const [removed] = siblings.splice(idx, 1);
  return [next, removed];
}

function insertAtPath(items: MenuItem[], parentPath: Path, index: number, node: MenuItem): MenuItem[] {
  const next = deepClone(items);
  const siblings = getSiblings(next, parentPath);
  siblings.splice(index, 0, node);
  return next;
}

function swapAt(items: MenuItem[], parentPath: Path, i: number, j: number): MenuItem[] {
  const next = deepClone(items);
  const siblings = getSiblings(next, parentPath);
  [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
  return next;
}

/** ---------- page ---------- */
export default function MenuLayoutPage() {
  const [menuKey, setMenuKey]   = useState<MenuKey>("primary");
  const [items, setItems]       = useState<MenuItem[]>([]);
  const [cats, setCats]         = useState<{ id: number; name: string }[]>([]);
  const [pages, setPages]       = useState<{ id: number; name: string; url: string }[]>([]);
  const [custom, setCustom]     = useState({ title: "", url: "" });
  const [syncing, setSyncing]   = useState(false);
  const [msg, setMsg]           = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);
  const [menuMap, setMenuMap]   = useState<Record<string, number>>({}); // name -> id

  const pageUrlSet = useMemo(() => new Set(pages.map(p => normalizeUrl(p.url))), [pages]);

  function notify(t: string) { setMsg(t); setTimeout(()=>setMsg(null), 3200); }
  function ok(t: string) { setSuccess(t); setTimeout(()=>setSuccess(null), 3200); }

  /** classify item by URL/title */
  function classifyType(url?: string, title?: string): MenuItem["type"] {
    const u = normalizeUrl(url || "");
    const t = (title || "").toLowerCase();
    if (/product-category|\/category\//.test(u)) return "category";
    const known = ["/", "/shop", "/about", "/contact", "/cart", "/my-account", "/privacy-policy", "/terms"];
    if (pageUrlSet.has(u) || known.includes(u)) return "page";
    try { const path = new URL(u, "http://x").pathname; if (known.includes(path)) return "page"; } catch {}
    if (["home","about","contact","cart","account","shop","privacy","terms"].some(k => t.includes(k))) return "page";
    return "custom";
  }

  function normalizeUrl(url: string) {
    try {
      const u = new URL(url, "http://fake");
      let p = u.pathname || "/";
      if (p.length > 1) p = p.replace(/\/+$/,"");
      return p === "" ? "/" : p;
    } catch {
      let p = url || "/";
      if (!p.startsWith("/")) {
        try { const u = new URL(p); p = u.pathname || "/"; } catch {}
      }
      if (p.length > 1) p = p.replace(/\/+$/,"");
      return p === "" ? "/" : p;
    }
  }

  /** WP → local tree */
  function toLocalTree(nodes: any[]): MenuItem[] {
    return (nodes || []).map((n: any) => ({
      id: uid(),
      type: classifyType(n.url, n.title),
      title: n.title,
      url: n.url,
      children: n.children ? toLocalTree(n.children) : [],
    }));
  }

  /** initial data (cats, pages, menu ids) */
  useEffect(() => {
    fetch("/api/taxonomies/categories")
      .then(r=>r.json())
      .then(d => setCats((d.items || []).map((x:any)=>({id:x.id, name:x.name}))))
      .catch(()=>{});
    fetch("/api/wp/pages")
      .then(r=>r.json())
      .then(d => setPages(d.items || []))
      .catch(()=>{});
    fetch("/api/menu/menus")
      .then(r=>r.json())
      .then(d => {
        const map: Record<string, number> = {};
        for (const m of d.menus || []) map[m.name] = m.id;
        setMenuMap(map);
      })
      .catch(()=>{});
  }, []);

  /** reclassify after pages arrive */
  useEffect(() => {
    if (items.length === 0) return;
    setItems(prev => deepClone(prev).map(reclassifyTree));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageUrlSet.size]);

  function reclassifyTree(n: MenuItem): MenuItem {
    return { ...n, type: classifyType(n.url, n.title), children: n.children?.map(reclassifyTree) || [] };
  }

  /** load by location or menu_id */
  async function loadMenu(def: MenuDef) {
    let url = "";
    if (def.mode === "location") {
      url = `/api/menu/sync?location=${encodeURIComponent(def.key)}`;
    } else {
      const id = menuMap[def.label];
      if (!id) { setItems([]); notify(`Couldn’t load “${def.label}”. (id not found)`); return; }
      url = `/api/menu/sync?menu_id=${id}`;
    }
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      const list = toLocalTree(data.items || []);
      setItems(list);
      localStorage.setItem(STORAGE_KEY(def.key), JSON.stringify(list));
      notify(`Loaded from WordPress: ${def.label}.`);
    } else {
      const raw = localStorage.getItem(STORAGE_KEY(def.key));
      setItems(raw ? JSON.parse(raw) : []);
      notify(data?.error || `Couldn’t load “${def.label}”. Showing last saved copy.`);
    }
  }

  /** load when switching */
  useEffect(() => {
    const def = MENUS.find(m => m.key === menuKey)!;
    loadMenu(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuKey, menuMap]);

  /** save & sync */
  async function saveAndSync() {
    const def = MENUS.find(m => m.key === menuKey)!;
    localStorage.setItem(STORAGE_KEY(menuKey), JSON.stringify(items));
    const toWire = (arr: MenuItem[]) => arr.map(n => ({
      title: n.title, url: n.url || "", children: n.children?.length ? toWire(n.children) : [],
    }));
    setSyncing(true); setMsg(null); setSuccess(null);
    try {
      const body: any = {
        items: toWire(items),
        location_label: def.label,
        also_location_labels: def.also,
      };
      if (def.mode === "location") {
        body.location = def.key;
      } else {
        const id = menuMap[def.label];
        if (!id) { notify(`Cannot sync — id missing for ${def.label}`); setSyncing(false); return; }
        body.menu_id = id;
      }

      const res = await fetch("/api/menu/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Sync failed");
      ok("✅ Menu updated on WordPress.");
    } catch (e:any) {
      notify(e?.message || "Failed to sync");
    } finally {
      setSyncing(false);
    }
  }

  /** adders */
  function addPageById(id: number) {
    const p = pages.find(x => x.id === id); if (!p) return;
    setItems([...items, { id: uid(), type:"page", title: p.name, url: p.url, children:[] }]);
  }
  function addCategory(id: number) {
    const c = cats.find(x=>x.id===id); if (!c) return;
    setItems([...items, { id: uid(), type:"category", title:c.name, refId:c.id, url:`/product-category/${slugify(c.name)}`, children:[] }]);
  }
  function addCustom() {
    if (!custom.title || !custom.url) return;
    setItems([...items, { id: uid(), type:"custom", title: custom.title, url: custom.url, children:[] }]);
    setCustom({ title:"", url:"" });
  }
  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

  /** operations */
  function moveUp(path: Path)  { const p = path.slice(0,-1), i = path.at(-1)!; if (i>0) setItems(swapAt(items,p,i,i-1)); }
  function moveDown(path: Path){ const p = path.slice(0,-1), i = path.at(-1)!; const s=getSiblings(items,p); if(i<s.length-1) setItems(swapAt(items,p,i,i+1)); }
  function indent(path: Path)  {
    const parentPath = path.slice(0,-1); const i = path.at(-1)!; if (i===0) return;
    const prevSiblingPath = [...parentPath, i-1];
    const [without, node] = removeAtPath(items, path);
    let target: any = deepClone(without); let cur: any = target;
    for (let k=0;k<prevSiblingPath.length;k++) cur = (k===0?cur:cur.children)[prevSiblingPath[k]];
    cur.children = cur.children || [];
    const endIndex = (cur.children as MenuItem[]).length;
    setItems(insertAtPath(target, [...prevSiblingPath], endIndex, node));
  }
  function outdent(path: Path) {
    if (path.length===1) return;
    const parentPath = path.slice(0,-1); const grandPath = parentPath.slice(0,-1);
    const parentIndexInGrand = parentPath.at(-1)!;
    const [without, node] = removeAtPath(items, path);
    setItems(insertAtPath(without, grandPath, parentIndexInGrand+1, node));
  }
  function removeNode(path: Path) { const [next] = removeAtPath(items, path); setItems(next); }

  /** row + tree */
  function Row({ item, path }: { item: MenuItem, path: Path }) {
    const p = path.slice(0, -1); const i = path.at(-1)!;
    const sibs = getSiblings(items, p);
    const canUp = i>0, canDown = i<sibs.length-1, canIndent = i>0, canOutdent = path.length>1;
    const btn = "text-xs font-bold border px-2 py-1 rounded leading-none";
    const dis = "disabled:opacity-40 disabled:cursor-not-allowed";
    const typeBadge = "text-xs text-slate-500 ml-2";
    return (
      <div className="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2">
        <div className="text-sm font-medium flex items-center">
          {item.title}
          <span className={typeBadge}>
            {item.type === "page" ? "(page)" : item.type === "category" ? "(product category)" : "(custom link)"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className={`${btn} ${dis}`} title="Up"     onClick={()=>moveUp(path)} disabled={!canUp}>↑</button>
          <button className={`${btn} ${dis}`} title="Down"   onClick={()=>moveDown(path)} disabled={!canDown}>↓</button>
          <button className={`${btn} ${dis}`} title="Right"  onClick={()=>indent(path)} disabled={!canIndent}>→</button>
          <button className={`${btn} ${dis}`} title="Left"   onClick={()=>outdent(path)} disabled={!canOutdent}>←</button>
          <button className={btn} title="Remove" onClick={()=>removeNode(path)}>Remove</button>
        </div>
      </div>
    );
  }

  function Tree({ nodes, parentPath=[] as Path, level=0 }:{nodes:MenuItem[], parentPath?:Path, level?:number}) {
    return (
      <ul className={`space-y-2 ${level ? "ml-6" : ""}`}>
        {nodes.map((n, idx)=> {
          const path = [...parentPath, idx];
          return (
            <li key={n.id}>
              <Row item={n} path={path}/>
              {n.children && n.children.length>0 && (
                <Tree nodes={n.children} parentPath={[...parentPath, idx]} level={level+1}/>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold mb-3">Menus</h1>

      {(success || msg) && (
        <div className={`mb-3 rounded px-3 py-2 text-sm ${success ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
          {success || msg}
        </div>
      )}

      <div className="border rounded-lg p-3 mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm">Select a menu to edit:&nbsp;</label>
        <select
          className="border rounded px-2 py-1.5 text-sm"
          value={menuKey}
          onChange={(e)=>setMenuKey(e.target.value as MenuKey)}
        >
          {MENUS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <button
          type="button"
          className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          onClick={()=>loadMenu(MENUS.find(m=>m.key===menuKey)!)}
        >
          Select
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT adders */}
        <div className="border rounded-lg p-4">
          <div className="font-medium mb-2">Add menu items</div>

          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Pages</div>
            <select
              className="border rounded px-2 py-1.5 text-sm w-full"
              defaultValue=""
              onChange={(e)=>{
                const v = Number(e.target.value);
                if (v) { addPageById(v); e.currentTarget.value=""; }
              }}
            >
              <option value="" disabled>Select a page…</option>
              {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Product Categories</div>
            <select
              className="border rounded px-2 py-1.5 text-sm w-full"
              defaultValue=""
              onChange={(e)=>{
                const v = Number(e.target.value);
                if (v) { addCategory(v); e.currentTarget.value=""; }
              }}
            >
              <option value="" disabled>Select a category…</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Custom Links</div>
            <div className="space-y-2">
              <input className="w-full border rounded px-3 py-2 text-sm"
                placeholder="URL (https://...)" value={custom.url}
                onChange={e=>setCustom({...custom, url:e.target.value})}/>
              <input className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Link Text" value={custom.title}
                onChange={e=>setCustom({...custom, title:e.target.value})}/>
              <button type="button" onClick={addCustom}
                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">Add to Menu</button>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="md:col-span-2 space-y-6">
          <div className="border rounded-lg p-4">
            <div className="font-medium mb-2">Menu structure</div>
            <div className="text-sm text-slate-600 mb-3">
              Use <b>↑ ↓ → ←</b> to reorder accurately (no drag). This mirrors WordPress behavior and preserves nesting exactly.
            </div>

            {items.length===0 && (
              <div className="text-sm text-slate-500">No items in this menu.</div>
            )}

            <ul className="space-y-2">
              {items.map((n, i)=> (
                <li key={n.id}>
                  <Row item={n} path={[i]} />
                  {n.children && n.children.length>0 && (
                    <Tree nodes={n.children} parentPath={[i]} level={1}/>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="border rounded-lg p-4">
            <div className="font-medium mb-2">Menu Settings</div>
            <div className="text-sm text-slate-600 mb-3">Display location:</div>
            <div className="text-sm">
              <label className="flex items-center gap-2 mb-1">
                <input type="checkbox" readOnly checked={menuKey==="primary"} />
                Primary Menu {menuKey==="primary" ? " (also assigns Off-Canvas)" : ""}
              </label>
              <label className="flex items-center gap-2 mb-1">
                <input type="checkbox" readOnly checked={menuKey==="footer_discover"} />
                Footer - Discover
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" readOnly checked={menuKey==="footer_info"} />
                Footer - Information
              </label>
            </div>

            <div className="mt-4">
              <button onClick={saveAndSync}
                disabled={syncing || items.length===0}
                className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
                {syncing ? "Syncing…" : "Save & Sync to WordPress"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
