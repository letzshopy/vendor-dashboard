"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  FolderTree,
  Link2,
  Loader2,
  MoreVertical,
  Plus,
  Save,
} from "lucide-react";
import {
  MenuItemNode,
  MoveTarget,
  flattenMoveTargets,
  findNodeById,
  insertNodeUnderParent,
  moveNode,
  removeNodeById,
  reorderWithinParent,
  toLocalTree,
  toWireTree,
  uid,
} from "../../../ui/menu-builder-utils";

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

type PageOpt = { id: number; name: string; url: string };
type CatOpt = { id: number; name: string };

const STORAGE_KEY = (k: MenuKey) => `ls_menu_${k}_v7`;

function getBreadcrumbTitle(
  nodes: MenuItemNode[],
  targetId: string
): string[] {
  function walk(arr: MenuItemNode[], trail: string[]): string[] | null {
    for (const item of arr) {
      const nextTrail = [...trail, item.title];
      if (item.id === targetId) return nextTrail;
      const found = walk(item.children || [], nextTrail);
      if (found) return found;
    }
    return null;
  }

  return walk(nodes, []) || [];
}

function ActionMenu({
  hasChildren,
  onManage,
  onMove,
  onDelete,
}: {
  hasChildren: boolean;
  onManage: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 min-w-[180px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onManage();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            {hasChildren ? "Manage Sub Items" : "Add / Manage Sub Items"}
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onMove();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Move To
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function MenuSubItemsPage() {
  const params = useParams<{ menuKey: string; itemId: string }>();
  const router = useRouter();

  const menuKey = (params.menuKey || "primary") as MenuKey;
  const itemId = params.itemId || "";

  const currentDef = MENUS.find((m) => m.key === menuKey) || MENUS[0];

  const [items, setItems] = useState<MenuItemNode[]>([]);
  const [pages, setPages] = useState<PageOpt[]>([]);
  const [cats, setCats] = useState<CatOpt[]>([]);
  const [menuMap, setMenuMap] = useState<Record<string, number>>({});

  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [custom, setCustom] = useState({ title: "", url: "" });

  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [saving, setSaving] = useState(false);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveItemId, setMoveItemId] = useState<string | null>(null);

  const moveTargets: MoveTarget[] = useMemo(
    () => flattenMoveTargets(items, moveItemId || undefined),
    [items, moveItemId]
  );

  const parentNode = useMemo(() => findNodeById(items, itemId), [items, itemId]);
  const childItems = parentNode?.children || [];
  const breadcrumb = useMemo(() => getBreadcrumbTitle(items, itemId), [items, itemId]);

  async function boot() {
    setLoading(true);
    try {
      const [catsRes, pagesRes, menusRes] = await Promise.all([
        fetch("/api/taxonomies/categories"),
        fetch("/api/wp/pages"),
        fetch("/api/menu/menus"),
      ]);

      const catsJson = await catsRes.json().catch(() => ({ items: [] }));
      const pagesJson = await pagesRes.json().catch(() => ({ items: [] }));
      const menusJson = await menusRes.json().catch(() => ({ menus: [] }));

      setCats((catsJson.items || []).map((x: any) => ({ id: x.id, name: x.name })));
      setPages(pagesJson.items || []);

      const map: Record<string, number> = {};
      for (const m of menusJson.menus || []) map[m.name] = m.id;
      setMenuMap(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
  }, []);

  async function loadMenu() {
    setLoadingAction(true);
    try {
      let res: Response | null = null;
      let data: any = null;
      const id = menuMap[currentDef.wpName];

      if (id) {
        res = await fetch(
          `/api/menu/sync?menu_id=${id}&menu_name=${encodeURIComponent(
            currentDef.wpName
          )}&location_label=${encodeURIComponent(currentDef.wpName)}`,
          { cache: "no-store" }
        );
        data = await res.json();
      }

      const shouldFallback =
        currentDef.key === "primary" &&
        (!res ||
          !res.ok ||
          ((data?.items?.length ?? 0) === 0 &&
            typeof data?.note === "string" &&
            data.note.toLowerCase().includes("not found")));

      if (shouldFallback) {
        res = await fetch(
          `/api/menu/sync?location=${encodeURIComponent(
            currentDef.key
          )}&menu_name=${encodeURIComponent(
            currentDef.wpName
          )}&location_label=${encodeURIComponent(currentDef.wpName)}`,
          { cache: "no-store" }
        );
        data = await res.json();
      }

      if (res?.ok) {
        const local = toLocalTree(data?.items || []);
        setItems(local);
        localStorage.setItem(STORAGE_KEY(currentDef.key), JSON.stringify(local));
      } else {
        const raw = localStorage.getItem(STORAGE_KEY(currentDef.key));
        setItems(raw ? JSON.parse(raw) : []);
      }
    } catch {
      const raw = localStorage.getItem(STORAGE_KEY(currentDef.key));
      setItems(raw ? JSON.parse(raw) : []);
    } finally {
      setLoadingAction(false);
    }
  }

  useEffect(() => {
    if (!loading && Object.keys(menuMap).length) {
      loadMenu();
    }
  }, [loading, menuMap, currentDef.key]);

  async function saveMenu() {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY(currentDef.key), JSON.stringify(items));

      const body: any = {
        items: toWireTree(items),
        location_label: currentDef.wpName,
        also_location_labels: currentDef.also,
      };

      if (currentDef.saveMode === "location") {
        body.location = currentDef.key;
      } else {
        const id = menuMap[currentDef.wpName];
        if (!id) throw new Error("Menu ID missing");
        body.menu_id = id;
      }

      const res = await fetch("/api/menu/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  function addPage() {
    const p = pages.find((x) => String(x.id) === selectedPageId);
    if (!p) return;

    setItems((prev) =>
      insertNodeUnderParent(prev, itemId, {
        id: Math.random().toString(36).slice(2, 9),
        title: p.name,
        type: "page",
        url: p.url,
        children: [],
      })
    );
    setSelectedPageId("");
  }

  function addCategory() {
    const c = cats.find((x) => String(x.id) === selectedCatId);
    if (!c) return;

    const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    setItems((prev) =>
      insertNodeUnderParent(prev, itemId, {
        id: uid(),
        title: c.name,
        type: "category",
        url: `/product-category/${slug}`,
        refId: c.id,
        children: [],
      })
    );
    setSelectedCatId("");
  }

  function addCustom() {
    if (!custom.title.trim() || !custom.url.trim()) return;

    setItems((prev) =>
      insertNodeUnderParent(prev, itemId, {
        id: uid(),
        title: custom.title.trim(),
        type: "custom",
        url: custom.url.trim(),
        children: [],
      })
    );
    setCustom({ title: "", url: "" });
  }

  function removeChildNode(id: string) {
    setItems((prev) => {
      const { next } = removeNodeById(prev, id);
      return next;
    });
  }

  function reorderChild(index: number, dir: "up" | "down") {
    setItems((prev) => reorderWithinParent(prev, itemId, index, dir));
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-5">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <div className="text-sm font-medium text-slate-600">
              Loading sub items...
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!parentNode) {
    return (
      <main className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-5">
        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Item not found</div>
          <p className="mt-2 text-sm text-slate-500">
            This menu item could not be found. Reload the menu or go back.
          </p>
          <div className="mt-4">
            <Link
              href={`/menu/${menuKey}`}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-violet-600 px-5 text-sm font-semibold text-white"
            >
              Back to Menu
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-3 py-3 md:px-4 md:py-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#faf6ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
          <FolderTree className="h-3.5 w-3.5" />
          Manage Sub Items
        </div>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/menu/${menuKey}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
                {parentNode.title}
              </h1>
            </div>

            <div className="mt-2 text-sm text-slate-500">
              Menu Layout {breadcrumb.length > 0 ? `> ${breadcrumb.join(" > ")}` : ""}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={loadMenu}
              disabled={loadingAction}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm"
            >
              {loadingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loadingAction ? "Loading..." : "Reload"}
            </button>

            <button
              type="button"
              onClick={saveMenu}
              disabled={saving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Menu"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-[#faf7ff] via-white to-[#f4fbff] px-4 py-4 md:px-5">
            <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
              Add new sub item
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Add child items under {parentNode.title}.
            </p>
          </div>

          <div className="space-y-4 p-4 md:p-5">
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-slate-700">
                Pages
              </label>
              <div className="flex gap-2">
                <select
                  className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm"
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
                  onClick={addPage}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm"
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
                  className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm"
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
                  onClick={addCategory}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm"
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
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm"
                  placeholder="Link text"
                  value={custom.title}
                  onChange={(e) => setCustom({ ...custom, title: e.target.value })}
                />

                <button
                  type="button"
                  onClick={addCustom}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm"
                >
                  Add Sub Item
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-[#faf7ff] via-white to-[#f4fbff] px-4 py-4 md:px-5">
            <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
              Sub items
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Reorder or move sub items under this menu item.
            </p>
          </div>

          <div className="p-4 md:p-5">
            {childItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No sub items yet. Add one from the left panel.
              </div>
            ) : (
              <div className="space-y-2">
                {childItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {item.title}
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {item.type}
                          </span>
                        </div>

                        {item.url && (
                          <div className="mt-1 truncate text-xs text-slate-500">
                            {item.url}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => reorderChild(index, "up")}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                            disabled={index === 0}
                          >
                            Up
                          </button>

                          <button
                            type="button"
                            onClick={() => reorderChild(index, "down")}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                            disabled={index === childItems.length - 1}
                          >
                            Down
                          </button>

                          <Link
                            href={`/menu/${menuKey}/item/${item.id}`}
                            className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white"
                          >
                            Manage Sub Items
                          </Link>

                          {item.children?.length > 0 && (
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                              {item.children.length} sub-items
                            </span>
                          )}
                        </div>
                      </div>

                      <ActionMenu
                        hasChildren={(item.children?.length || 0) > 0}
                        onManage={() => router.push(`/menu/${menuKey}/item/${item.id}`)}
                        onMove={() => {
                          setMoveItemId(item.id);
                          setMoveOpen(true);
                        }}
                        onDelete={() => removeChildNode(item.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {moveOpen && moveItemId && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/30 px-4 pb-4 md:items-center">
          <div className="w-full max-w-[420px] rounded-[28px] border border-slate-200 bg-white shadow-xl">
            <div className="border-b px-4 py-4 text-base font-semibold text-slate-900">
              Move To
            </div>

            <div className="max-h-[60vh] overflow-auto p-4">
              <div className="space-y-2">
                {moveTargets.map((target) => (
                  <button
                    key={target.id || "root"}
                    type="button"
                    onClick={() => {
                      setItems((prev) => moveNode(prev, moveItemId, target.id));
                      setMoveOpen(false);
                      setMoveItemId(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <span style={{ marginLeft: target.depth * 16 }}>
                      {target.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t p-4">
              <button
                type="button"
                onClick={() => {
                  setMoveOpen(false);
                  setMoveItemId(null);
                }}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {(loadingAction || saving) && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-white/45 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <div className="text-sm font-medium text-slate-600">
              {saving ? "Saving menu..." : "Loading menu..."}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}