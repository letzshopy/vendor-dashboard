"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Link2,
  Loader2,
  MenuSquare,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
} from "lucide-react";

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
  wpName: string;
  also: string[];
  loadMode: "menu_id" | "location";
  saveMode: "menu_id" | "location";
};

const MENUS: MenuDef[] = [
  {
    key: "primary",
    label: "Primary Menu",
    wpName: "Main Menu",
    also: ["Off-Canvas Menu"],
    loadMode: "menu_id",
    saveMode: "location",
  },
  {
    key: "footer_discover",
    label: "Footer - Discover",
    wpName: "Footer Menu",
    also: [],
    loadMode: "menu_id",
    saveMode: "menu_id",
  },
  {
    key: "footer_info",
    label: "Footer - Information",
    wpName: "Top Menu",
    also: [],
    loadMode: "menu_id",
    saveMode: "menu_id",
  },
];

const STORAGE_KEY = (k: MenuKey) => `ls_menu_${k}_v7`;
const uid = () => Math.random().toString(36).slice(2, 9);

/** ---------- helpers ---------- */

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function findNodeById(items: MenuItem[], id: string): MenuItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findNodeById(item.children || [], id);
    if (found) return found;
  }
  return null;
}

function removeNodeById(
  items: MenuItem[],
  id: string
): { next: MenuItem[]; removed: MenuItem | null } {
  const next = deepClone(items);

  function walk(list: MenuItem[]): MenuItem | null {
    const idx = list.findIndex((x) => x.id === id);
    if (idx >= 0) {
      const [removed] = list.splice(idx, 1);
      return removed;
    }

    for (const item of list) {
      const removed = walk(item.children || []);
      if (removed) return removed;
    }

    return null;
  }

  const removed = walk(next);
  return { next, removed };
}

function insertNodeUnderParent(
  items: MenuItem[],
  parentId: string | null,
  node: MenuItem
) {
  const next = deepClone(items);

  if (!parentId) {
    next.push(node);
    return next;
  }

  function walk(list: MenuItem[]): boolean {
    for (const item of list) {
      if (item.id === parentId) {
        item.children = item.children || [];
        item.children.push(node);
        return true;
      }
      if (walk(item.children || [])) return true;
    }
    return false;
  }

  walk(next);
  return next;
}

function moveNode(items: MenuItem[], nodeId: string, newParentId: string | null) {
  const { next, removed } = removeNodeById(items, nodeId);
  if (!removed) return items;
  return insertNodeUnderParent(next, newParentId, removed);
}

function reorderWithinParent(
  items: MenuItem[],
  parentId: string | null,
  nodeId: string,
  direction: "up" | "down"
) {
  const next = deepClone(items);

  function getList(list: MenuItem[]): MenuItem[] | null {
    if (parentId === null) return list;

    for (const item of list) {
      if (item.id === parentId) return item.children || [];
      const found = getList(item.children || []);
      if (found) return found;
    }

    return null;
  }

  const siblings = getList(next);
  if (!siblings) return items;

  const idx = siblings.findIndex((x) => x.id === nodeId);
  if (idx === -1) return items;

  if (direction === "up" && idx > 0) {
    [siblings[idx - 1], siblings[idx]] = [siblings[idx], siblings[idx - 1]];
  }

  if (direction === "down" && idx < siblings.length - 1) {
    [siblings[idx + 1], siblings[idx]] = [siblings[idx], siblings[idx + 1]];
  }

  return next;
}

type MoveTarget = {
  id: string | null;
  label: string;
  depth: number;
};

function flattenMoveTargets(
  items: MenuItem[],
  excludeId?: string,
  depth = 0,
  out: MoveTarget[] = [{ id: null, label: "Main Menu", depth: 0 }]
): MoveTarget[] {
  for (const item of items) {
    if (item.id === excludeId) continue;
    out.push({ id: item.id, label: item.title, depth });
    flattenMoveTargets(item.children || [], excludeId, depth + 1, out);
  }
  return out;
}

/** ---------- page ---------- */

export default function MenuLayoutPage() {
  const [menuKey, setMenuKey] = useState<MenuKey>("primary");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [pages, setPages] = useState<{ id: number; name: string; url: string }[]>(
    []
  );
  const [custom, setCustom] = useState({ title: "", url: "" });

  const [syncing, setSyncing] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);

  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [menuMap, setMenuMap] = useState<Record<string, number>>({});

  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");

  const currentDef = useMemo(
    () => MENUS.find((m) => m.key === menuKey)!,
    [menuKey]
  );

  const pageUrlSet = useMemo(
    () => new Set(pages.map((p) => normalizeUrl(p.url))),
    [pages]
  );

  function notify(t: string) {
    setSuccess(null);
    setMsg(t);
    setTimeout(() => {
      setMsg((cur) => (cur === t ? null : cur));
    }, 3500);
  }

  function ok(t: string) {
    setMsg(null);
    setSuccess(t);
    setTimeout(() => {
      setSuccess((cur) => (cur === t ? null : cur));
    }, 3500);
  }

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

  function classifyType(
  url?: string,
  title?: string,
  refId?: number,
  sourceType?: string
): MenuItem["type"] {
  const u = normalizeUrl(url || "");
  const s = (sourceType || "").toLowerCase();

  // 1) Trust explicit source type first
  if (s.includes("category") || s.includes("product_cat")) return "category";
  if (s.includes("page")) return "page";
  if (s.includes("custom")) return "custom";

  // 2) Category URL patterns
  if (/\/product-category\/|product_cat|\/category\//i.test(u)) {
    return "category";
  }

  // 3) If it matches a known WP page URL exactly, mark as page
  if (pageUrlSet.has(u)) return "page";

  // 4) If it came with refId but not matching page URL, don't force page
  //    Let unknown linked items remain custom unless clearly category
  return "custom";
}

  function toLocalTree(nodes: any[]): MenuItem[] {
  return (nodes || []).map((n: any) => ({
    id: uid(),
    type: classifyType(n.url, n.title, n.refId, n.type),
    title: n.title,
    url: n.url,
    refId: n.refId,
    children: n.children ? toLocalTree(n.children) : [],
  }));
}
  function reclassifyTree(n: MenuItem): MenuItem {
  return {
    ...n,
    type: classifyType(n.url, n.title, n.refId, n.type),
    children: n.children?.map(reclassifyTree) || [],
  };
}

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  useEffect(() => {
    async function boot() {
      try {
        const [catsRes, pagesRes, menusRes] = await Promise.all([
          fetch("/api/taxonomies/categories"),
          fetch("/api/wp/pages"),
          fetch("/api/menu/menus"),
        ]);

        const catsJson = await catsRes.json().catch(() => ({ items: [] }));
        const pagesJson = await pagesRes.json().catch(() => ({ items: [] }));
        const menusJson = await menusRes.json().catch(() => ({ menus: [] }));

        setCats(
          (catsJson.items || []).map((x: any) => ({ id: x.id, name: x.name }))
        );
        setPages(pagesJson.items || []);

        const map: Record<string, number> = {};
        for (const m of menusJson.menus || []) map[m.name] = m.id;
        setMenuMap(map);
      } finally {
        setBootLoading(false);
      }
    }

    boot();
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    setItems((prev) => deepClone(prev).map(reclassifyTree));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageUrlSet.size]);

  async function loadMenu(def: MenuDef) {
    setLoadingMenu(true);
    setMsg(null);
    setSuccess(null);

    try {
      let res: Response | null = null;
      let data: any = null;

      const tryFetch = async (url: string) => {
        const r = await fetch(url, { cache: "no-store" });
        const j = await r.json();
        return { r, j };
      };

      if (def.loadMode === "menu_id") {
        const id = menuMap[def.wpName];

        if (id) {
          const first = await tryFetch(`/api/menu/sync?menu_id=${id}`);
          res = first.r;
          data = first.j;
        }

        const shouldFallbackToLocation =
          def.key === "primary" &&
          (!res || !res.ok || ((data?.items?.length ?? 0) === 0 && data?.note));

        if (shouldFallbackToLocation) {
          const second = await tryFetch(
            `/api/menu/sync?location=${encodeURIComponent(def.key)}`
          );
          res = second.r;
          data = second.j;
        }

        if (!res && def.key !== "primary") {
          setItems([]);
          notify(`Couldn't load “${def.label}” (menu ID not found).`);
          return;
        }
      } else {
        const direct = await tryFetch(
          `/api/menu/sync?location=${encodeURIComponent(def.key)}`
        );
        res = direct.r;
        data = direct.j;
      }

      if (res?.ok) {
        const local = toLocalTree(data?.items || []);
        setItems(local);
        localStorage.setItem(STORAGE_KEY(def.key), JSON.stringify(local));

        if ((data?.items || []).length === 0) {
          notify(`Loaded “${def.label}”, but it currently has no items.`);
        } else {
          ok(`Loaded “${def.label}”.`);
        }
      } else {
        const raw = localStorage.getItem(STORAGE_KEY(def.key));
        setItems(raw ? JSON.parse(raw) : []);
        notify(
          data?.error ||
            `Couldn't load “${def.label}”. Showing last saved copy from this dashboard.`
        );
      }
    } catch (e: any) {
      const raw = localStorage.getItem(STORAGE_KEY(def.key));
      setItems(raw ? JSON.parse(raw) : []);
      notify(
        e?.message ||
          `Couldn't reach the saved data. Showing last saved copy from this dashboard.`
      );
    } finally {
      setLoadingMenu(false);
    }
  }

  useEffect(() => {
    if (bootLoading) return;
    const def = MENUS.find((m) => m.key === menuKey)!;
    loadMenu(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuKey, menuMap, bootLoading]);

  async function saveAndSync() {
    const def = MENUS.find((m) => m.key === menuKey)!;

    localStorage.setItem(STORAGE_KEY(menuKey), JSON.stringify(items));

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
        location_label: def.wpName,
        also_location_labels: def.also,
      };

      if (def.saveMode === "location") {
        body.location = def.key;
      } else {
        const id = menuMap[def.wpName];
        if (!id) {
          notify(`Cannot save — missing menu ID for “${def.wpName}”.`);
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

      ok("Menu saved.");
    } catch (e: any) {
      notify(e?.message || "Failed to save menu");
    } finally {
      setSyncing(false);
    }
  }

  function addPageById(id: number) {
    const p = pages.find((x) => x.id === id);
    if (!p) return;

    setItems((prev) => [
      ...prev,
      { id: uid(), type: "page", title: p.name, url: p.url, children: [] },
    ]);
    setSelectedPageId("");
  }

  function addCategory(id: number) {
    const c = cats.find((x) => x.id === id);
    if (!c) return;

    const slug = slugify(c.name);

    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        type: "category",
        title: c.name,
        refId: c.id,
        url: `/product-category/${slug}`,
        children: [],
      },
    ]);
    setSelectedCatId("");
  }

  function addCustom() {
    if (!custom.title || !custom.url) return;

    setItems((prev) => [
      ...prev,
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

  function Row({
    item,
    level,
    index,
    siblingCount,
    parentId,
  }: {
    item: MenuItem;
    level: number;
    index: number;
    siblingCount: number;
    parentId: string | null;
  }) {
    const moveTargets: MoveTarget[] = flattenMoveTargets(items, item.id);

    return (
      <div className="space-y-3">
        <div
          className={[
            "rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm",
            level === 0 ? "" : "relative",
          ].join(" ")}
          style={{ marginLeft: level * 42 }}
        >
          {level > 0 && (
            <>
              <div className="absolute -left-5 top-0 bottom-0 w-px bg-slate-300" />
              <div className="absolute -left-5 top-7 h-px w-5 bg-slate-300" />
            </>
          )}

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {item.title}
                </div>

                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {item.type === "page"
                    ? "Page"
                    : item.type === "category"
                    ? "Category"
                    : "Custom"}
                </span>

                {(item.children?.length ?? 0) > 0 && (
  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
    {item.children?.length ?? 0} sub-items
  </span>
)}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,220px)_auto] xl:w-[420px]">
              <select
                value={parentId || ""}
                onChange={(e) =>
                  setItems((prev) =>
                    moveNode(prev, item.id, e.target.value || null)
                  )
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              >
                {moveTargets.map((t) => (
                  <option key={t.id ?? "root"} value={t.id ?? ""}>
                    {`${"— ".repeat(t.depth)}${t.label}`}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() =>
                    setItems((prev) =>
                      reorderWithinParent(prev, parentId, item.id, "up")
                    )
                  }
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40"
                >
                  Up
                </button>

                <button
                  type="button"
                  disabled={index === siblingCount - 1}
                  onClick={() =>
                    setItems((prev) =>
                      reorderWithinParent(prev, parentId, item.id, "down")
                    )
                  }
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40"
                >
                  Down
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) => removeNodeById(prev, item.id).next)
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        {(item.children?.length ?? 0) > 0 && (
  <div className="space-y-3">
    {(item.children ?? []).map((child, childIndex) => (
      <Row
  key={child.id}
  item={child}
  parentId={item.id}
  index={childIndex}
  level={level + 1}
  siblingCount={(item.children ?? []).length}
/>
    ))}
  </div>
)}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-3 py-3 md:px-4 md:py-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#faf6ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
          <MenuSquare className="h-3.5 w-3.5" />
          Menu Builder
        </div>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
              Menu Layout
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Single-page nested menu builder with clear submenu hierarchy.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
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
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:border-violet-300 hover:bg-violet-50"
              onClick={() => loadMenu(currentDef)}
              disabled={loadingMenu}
            >
              <RefreshCcw className="h-4 w-4" />
              {loadingMenu ? "Loading..." : "Reload"}
            </button>

            <button
              onClick={saveAndSync}
              disabled={syncing || loadingMenu}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Menu
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {(success || msg) && (
        <div
          className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <span className="text-lg">{success ? "✅" : "⚠️"}</span>
          <span>{success || msg}</span>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-[#faf7ff] via-white to-[#f4fbff] px-4 py-4 md:px-5">
            <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
              Add menu items
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Add root items first.
            </p>
          </div>

          <div className="space-y-4 p-4 md:p-5">
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-slate-700">
                Pages
              </label>
              <div className="flex gap-2">
                <select
                  className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                >
                  <option value="">Select a page…</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => selectedPageId && addPageById(Number(selectedPageId))}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm hover:bg-violet-700"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold text-slate-700">
                Product categories
              </label>
              <div className="flex gap-2">
                <select
                  className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                >
                  <option value="">Select a category…</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => selectedCatId && addCategory(Number(selectedCatId))}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm hover:bg-violet-700"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold text-slate-700">
                Custom link
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                  <Link2 className="h-4 w-4 text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    placeholder="URL (https://...)"
                    value={custom.url}
                    onChange={(e) => setCustom({ ...custom, url: e.target.value })}
                  />
                </div>

                <input
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  placeholder="Link text"
                  value={custom.title}
                  onChange={(e) => setCustom({ ...custom, title: e.target.value })}
                />

                <button
                  type="button"
                  onClick={addCustom}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  Add to Menu
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-[#faf7ff] via-white to-[#f4fbff] px-4 py-4 md:px-5">
            <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
              Menu structure
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Parent dropdown makes nesting simple. Indentation shows submenu depth clearly.
            </p>
          </div>

          <div className="p-4 md:p-5">
            {loadingMenu ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                  <div className="text-sm font-medium text-slate-600">
                    Loading menu structure...
                  </div>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No items in this menu yet.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <Row
                    key={item.id}
                    item={item}
                    level={0}
                    index={index}
                    siblingCount={items.length}
                    parentId={null}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {(bootLoading || syncing) && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-white/45 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <div className="text-sm font-medium text-slate-600">
              {bootLoading ? "Loading menu builder..." : "Saving menu..."}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}