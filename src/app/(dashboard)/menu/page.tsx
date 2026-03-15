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
  {
    key: "primary",
    label: "Primary Menu",
    also: ["Off-Canvas Menu"],
    mode: "location",
  },
  {
    key: "footer_discover",
    label: "Footer - Discover",
    also: [],
    mode: "menu_id",
  },
  {
    key: "footer_info",
    label: "Footer - Information",
    also: [],
    mode: "menu_id",
  },
];

const STORAGE_KEY = (k: MenuKey) => `ls_menu_${k}_v4`;
const uid = () => Math.random().toString(36).slice(2, 9);

type Path = number[];

/** ---------- immutable helpers ---------- */

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function getSiblings(items: MenuItem[], parentPath: Path): MenuItem[] {
  if (parentPath.length === 0) return items;
  let cur: any = items;
  for (const idx of parentPath) {
    cur = cur[idx].children!;
  }
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

function insertAtPath(
  items: MenuItem[],
  parentPath: Path,
  index: number,
  node: MenuItem
): MenuItem[] {
  const next = deepClone(items);
  const siblings = getSiblings(next, parentPath);
  siblings.splice(index, 0, node);
  return next;
}

function swapAt(items: MenuItem[], parentPath: Path, i: number, j: number) {
  const next = deepClone(items);
  const siblings = getSiblings(next, parentPath);
  [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
  return next;
}

/** ---------- PAGE ---------- */

export default function MenuLayoutPage() {
  const [menuKey, setMenuKey] = useState<MenuKey>("primary");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [pages, setPages] = useState<{ id: number; name: string; url: string }[]>(
    []
  );
  const [custom, setCustom] = useState({ title: "", url: "" });
  const [syncing, setSyncing] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [menuMap, setMenuMap] = useState<Record<string, number>>({}); // WP menu name -> id

  const currentDef = useMemo(
    () => MENUS.find((m) => m.key === menuKey)!,
    [menuKey]
  );

  const pageUrlSet = useMemo(
    () => new Set(pages.map((p) => normalizeUrl(p.url))),
    [pages]
  );

  /** notifications */

  function notify(t: string) {
    setSuccess(null);
    setMsg(t);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setTimeout(() => {
      setMsg((cur) => (cur === t ? null : cur));
    }, 4000);
  }

  function ok(t: string) {
    setMsg(null);
    setSuccess(t);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setTimeout(() => {
      setSuccess((cur) => (cur === t ? null : cur));
    }, 4000);
  }

  /** helpers */

  function normalizeUrl(url: string) {
    try {
      const u = new URL(url, "http://fake");
      let p = u.pathname || "/";
      if (p.length > 1) p = p.replace(/\/+$/, "");
      return p === "" ? "/" : p;
    } catch {
      let p = url || "/";
      if (!p.startsWith("/")) {
        try {
          const u = new URL(p);
          p = u.pathname || "/";
        } catch {
          // ignore
        }
      }
      if (p.length > 1) p = p.replace(/\/+$/, "");
      return p === "" ? "/" : p;
    }
  }

  /** classify item by URL/title */
  function classifyType(url?: string, title?: string): MenuItem["type"] {
    const u = normalizeUrl(url || "");
    const t = (title || "").toLowerCase();

    if (/product-category|\/category\//.test(u)) return "category";

    const known = [
      "/",
      "/shop",
      "/about",
      "/contact",
      "/cart",
      "/my-account",
      "/privacy-policy",
      "/terms",
    ];

    if (pageUrlSet.has(u) || known.includes(u)) return "page";

    try {
      const path = new URL(u, "http://x").pathname;
      if (known.includes(path)) return "page";
    } catch {
      /* ignore */
    }

    if (
      ["home", "about", "contact", "cart", "account", "shop", "privacy", "terms"].some(
        (k) => t.includes(k)
      )
    ) {
      return "page";
    }

    return "custom";
  }

  function toLocalTree(nodes: any[]): MenuItem[] {
    return (nodes || []).map((n: any) => ({
      id: uid(),
      type: classifyType(n.url, n.title),
      title: n.title,
      url: n.url,
      children: n.children ? toLocalTree(n.children) : [],
    }));
  }

  function reclassifyTree(n: MenuItem): MenuItem {
    return {
      ...n,
      type: classifyType(n.url, n.title),
      children: n.children?.map(reclassifyTree) || [],
    };
  }

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  /** initial data (cats, pages, menu ids) */

  useEffect(() => {
    fetch("/api/taxonomies/categories")
      .then((r) => r.json())
      .then((d) =>
        setCats((d.items || []).map((x: any) => ({ id: x.id, name: x.name })))
      )
      .catch(() => {});

    fetch("/api/wp/pages")
      .then((r) => r.json())
      .then((d) => setPages(d.items || []))
      .catch(() => {});

    fetch("/api/menu/menus")
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, number> = {};
        for (const m of d.menus || []) map[m.name] = m.id;
        setMenuMap(map);
      })
      .catch(() => {});
  }, []);

  /** reclassify after pages arrive */
  useEffect(() => {
    if (items.length === 0) return;
    setItems((prev) => deepClone(prev).map(reclassifyTree));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageUrlSet.size]);

  /** load by location or menu_id */

  async function loadMenu(def: MenuDef) {
    let url = "";

    if (def.mode === "location") {
      url = `/api/menu/sync?location=${encodeURIComponent(def.key)}`;
    } else {
      const id = menuMap[def.label];
      if (!id) {
        setItems([]);
        notify(`Couldn't load “${def.label}” (menu ID not found in WordPress).`);
        return;
      }
      url = `/api/menu/sync?menu_id=${id}`;
    }

    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        const list = toLocalTree(data.items || []);
        setItems(list);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY(def.key), JSON.stringify(list));
        }
        notify(`Loaded “${def.label}” from WordPress.`);
      } else {
        const raw =
          typeof window !== "undefined"
            ? localStorage.getItem(STORAGE_KEY(def.key))
            : null;
        setItems(raw ? JSON.parse(raw) : []);
        notify(
          data?.error ||
            `Couldn't load “${def.label}”. Showing last saved copy from this dashboard.`
        );
      }
    } catch (e: any) {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY(def.key))
          : null;
      setItems(raw ? JSON.parse(raw) : []);
      notify(
        e?.message ||
          `Couldn't reach WordPress. Showing last saved copy from this dashboard.`
      );
    }
  }

  /** load when switching */

  useEffect(() => {
    const def = MENUS.find((m) => m.key === menuKey)!;
    loadMenu(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuKey, menuMap]);

  /** save & sync */

  async function saveAndSync() {
    const def = MENUS.find((m) => m.key === menuKey)!;

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY(menuKey), JSON.stringify(items));
    }

    const toWire = (arr: MenuItem[]): any[] =>
      arr.map((n) => ({
        title: n.title,
        url: n.url || "",
        children: n.children?.length ? toWire(n.children) : [],
      }));

    setSyncing(true);
    setMsg(null);
    setSuccess(null);

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
        if (!id) {
          notify(`Cannot save — missing WordPress menu ID for “${def.label}”.`);
          setSyncing(false);
          return;
        }
        body.menu_id = id;
      }

      const res = await fetch("/api/menu/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Sync failed");
      ok("Menu saved to WordPress.");
    } catch (e: any) {
      notify(e?.message || "Failed to save menu");
    } finally {
      setSyncing(false);
    }
  }

  /** adders */

  function addPageById(id: number) {
    const p = pages.find((x) => x.id === id);
    if (!p) return;
    setItems([
      ...items,
      { id: uid(), type: "page", title: p.name, url: p.url, children: [] },
    ]);
  }

  function addCategory(id: number) {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    const slug = slugify(c.name);
    setItems([
      ...items,
      {
        id: uid(),
        type: "category",
        title: c.name,
        refId: c.id,
        url: `/product-category/${slug}`,
        children: [],
      },
    ]);
  }

  function addCustom() {
    if (!custom.title || !custom.url) return;
    setItems([
      ...items,
      {
        id: uid(),
        type: "custom",
        title: custom.title,
        url: custom.url,
        children: [],
      },
    ]);
    setCustom({ title: "", url: "" });
  }

  /** reorder operations */

  function moveUp(path: Path) {
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    if (idx <= 0) return;
    setItems((prev) => swapAt(prev, parentPath, idx, idx - 1));
  }

  function moveDown(path: Path) {
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    const siblings = getSiblings(items, parentPath);
    if (idx >= siblings.length - 1) return;
    setItems((prev) => swapAt(prev, parentPath, idx, idx + 1));
  }

  function indent(path: Path) {
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    if (idx === 0) return; // can't indent first item
    const prevSiblingPath = [...parentPath, idx - 1];
    const [without, node] = removeAtPath(items, path);

    // walk to previous sibling
    let target: any = without;
    for (const i of prevSiblingPath) {
      target = target[i].children ?? (target[i].children = []);
    }
    const endIndex = (target as MenuItem[]).length;
    const inserted = insertAtPath(without, prevSiblingPath, endIndex, node);
    setItems(inserted);
  }

  function outdent(path: Path) {
    if (path.length === 1) return; // already top-level
    const parentPath = path.slice(0, -1);
    const grandPath = parentPath.slice(0, -1);
    const parentIndexInGrand = parentPath[parentPath.length - 1];

    const [without, node] = removeAtPath(items, path);
    const inserted = insertAtPath(without, grandPath, parentIndexInGrand + 1, node);
    setItems(inserted);
  }

  function removeNode(path: Path) {
    const [next] = removeAtPath(items, path);
    setItems(next);
  }

  /** row + tree */

  function Row({ item, path }: { item: MenuItem; path: Path }) {
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    const siblings = getSiblings(items, parentPath);

    const canUp = idx > 0;
    const canDown = idx < siblings.length - 1;
    const canIndent = idx > 0;
    const canOutdent = path.length > 1;

    const pill =
      "inline-flex items-center justify-center rounded-full border px-2 py-1 text-[11px] font-medium leading-none transition";
    const ghost =
      "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50";
    const danger =
      "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100";
    const disabled = "disabled:opacity-40 disabled:cursor-not-allowed";

    const typeBadge =
      "ml-2 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500";

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
        <div className="flex items-center gap-2">
          <span className="select-none text-slate-300">⋮⋮</span>
          <div className="font-medium text-slate-800">
            {item.title}
            <span className={typeBadge}>
              {item.type === "page"
                ? "Page"
                : item.type === "category"
                ? "Product category"
                : "Custom link"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            className={`${pill} ${ghost} ${disabled}`}
            title="Move up"
            onClick={() => moveUp(path)}
            disabled={!canUp}
          >
            ↑
          </button>
          <button
            className={`${pill} ${ghost} ${disabled}`}
            title="Move down"
            onClick={() => moveDown(path)}
            disabled={!canDown}
          >
            ↓
          </button>
          <button
            className={`${pill} ${ghost} ${disabled}`}
            title="Indent (make child of previous)"
            onClick={() => indent(path)}
            disabled={!canIndent}
          >
            → inside
          </button>
          <button
            className={`${pill} ${ghost} ${disabled}`}
            title="Outdent (lift one level up)"
            onClick={() => outdent(path)}
            disabled={!canOutdent}
          >
            ← out
          </button>
          <button
            className={`${pill} ${danger}`}
            title="Remove"
            onClick={() => removeNode(path)}
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  function Tree({
    nodes,
    parentPath = [] as Path,
    level = 0,
  }: {
    nodes: MenuItem[];
    parentPath?: Path;
    level?: number;
  }) {
    return (
      <ul className={`space-y-2 ${level ? "ml-6" : ""}`}>
        {nodes.map((n, idx) => {
          const path = [...parentPath, idx];
          return (
            <li key={n.id}>
              <Row item={n} path={path} />
              {n.children && n.children.length > 0 && (
                <Tree nodes={n.children} parentPath={path} level={level + 1} />
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  /** RENDER */

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      {/* Header: select menu */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-violet-50 via-sky-50 to-rose-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500">
            Select menu to edit
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {currentDef.label}
            {menuKey === "primary"
              ? " — also controls the off-canvas mobile menu."
              : " — footer menu for your store."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm"
            value={menuKey}
            onChange={(e) => setMenuKey(e.target.value as MenuKey)}
          >
            {MENUS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-violet-300 hover:bg-violet-50"
            onClick={() => loadMenu(currentDef)}
          >
            Reload from WordPress
          </button>
        </div>
      </div>

      {/* alerts */}
      {(success || msg) && (
        <div
          className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
            success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <span className="text-lg">{success ? "✅" : "⚠️"}</span>
          <span>{success || msg}</span>
        </div>
      )}

      {/* main grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* LEFT: add items */}
        <section className="rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Add menu items
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Quickly add pages, product categories, or custom links. Reorder on
            the right.
          </p>

          {/* Pages */}
          <div className="mb-4">
            <div className="mb-1 text-xs font-medium text-slate-700">Pages</div>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              defaultValue=""
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v) {
                  addPageById(v);
                  e.currentTarget.value = "";
                }
              }}
            >
              <option value="" disabled>
                Select a page…
              </option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Categories */}
          <div className="mb-4">
            <div className="mb-1 text-xs font-medium text-slate-700">
              Product categories
            </div>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              defaultValue=""
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v) {
                  addCategory(v);
                  e.currentTarget.value = "";
                }
              }}
            >
              <option value="" disabled>
                Select a category…
              </option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom links */}
          <div>
            <div className="mb-1 text-xs font-medium text-slate-700">
              Custom links
            </div>
            <div className="space-y-2">
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                placeholder="URL (https://…)"
                value={custom.url}
                onChange={(e) => setCustom({ ...custom, url: e.target.value })}
              />
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                placeholder="Link text"
                value={custom.title}
                onChange={(e) =>
                  setCustom({ ...custom, title: e.target.value })
                }
              />
              <button
                type="button"
                onClick={addCustom}
                className="mt-1 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                + Add to menu
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT: structure + settings */}
        <section className="space-y-6 md:col-span-2">
          {/* structure */}
          <div className="rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Menu structure
              </h2>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Use the arrow controls to reorder and nest items. This keeps the
              structure 100% in sync with WordPress.
            </p>

            {items.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                No items in this menu yet. Add pages, categories, or custom links
                on the left.
              </div>
            )}

            {items.length > 0 && (
              <ul className="space-y-2">
                {items.map((n, i) => (
                  <li key={n.id}>
                    <Row item={n} path={[i]} />
                    {n.children && n.children.length > 0 && (
                      <Tree nodes={n.children} parentPath={[i]} level={1} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* settings + save */}
          <div className="rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Menu settings
            </h2>
            <p className="mb-3 text-xs text-slate-500">Display location:</p>

            <div className="space-y-1 text-xs text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  readOnly
                  checked={menuKey === "primary"}
                />
                <span>
                  Primary Menu{" "}
                  {menuKey === "primary"
                    ? "(also controls off-canvas mobile menu)"
                    : ""}
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  readOnly
                  checked={menuKey === "footer_discover"}
                />
                <span>Footer – Discover</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  readOnly
                  checked={menuKey === "footer_info"}
                />
                <span>Footer – Information</span>
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-1">
              <button
                onClick={saveAndSync}
                disabled={syncing || items.length === 0}
                className="inline-flex w-fit items-center justify-center rounded-full bg-violet-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
              >
                {syncing ? "Saving…" : "Save"}
              </button>
              <p className="text-xs text-slate-500">
                Saving will update the corresponding WordPress menu and theme
                location.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
