"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ChevronDown,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Tag,
} from "lucide-react";

import ImageUploader, {
  type MediaUploadResult,
} from "@/components/ImageUploader";

type CategoryImage = {
  id: number;
  src: string;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description?: string;
  count?: number;
  image?: CategoryImage | null;
};

type MenuItem = {
  title: string;
  url: string;
  children: MenuItem[];
};

type MenuHeading = {
  index: number;
  title: string;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asMenuItem(value: unknown): MenuItem | null {
  if (!isRecord(value)) return null;

  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (!title) return null;

  return {
    title,
    url: typeof value.url === "string" ? value.url : "",
    children: Array.isArray(value.children)
      ? value.children.flatMap((child) => {
          const item = asMenuItem(child);
          return item ? [item] : [];
        })
      : [],
  };
}

function responseError(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : fallback;
}

function indentCategories(categories: Category[]) {
  const byParent: Record<number, Category[]> = {};

  for (const category of categories) {
    (byParent[category.parent] ||= []).push(category);
  }

  const result: Array<Category & { depth: number }> = [];

  function walk(parent: number, depth: number) {
    for (const category of (byParent[parent] || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))) {
      result.push({ ...category, depth });
      walk(category.id, depth + 1);
    }
  }

  walk(0, 0);
  return result;
}

async function readPrimaryMenu(): Promise<MenuItem[]> {
  const menusResponse = await fetch("/api/menu/menus", { cache: "no-store" });
  const menusPayload: unknown = await menusResponse.json().catch(() => null);

  if (!menusResponse.ok || !isRecord(menusPayload)) {
    throw new Error(responseError(menusPayload, "Could not load menu headings."));
  }

  const menus = Array.isArray(menusPayload.menus) ? menusPayload.menus : [];
  const mainMenu = menus.find(
    (menu) => isRecord(menu) && menu.name === "Main Menu",
  );
  const menuId = isRecord(mainMenu) ? Number(mainMenu.id) : 0;

  let response = menuId > 0
    ? await fetch(`/api/menu/sync?menu_id=${menuId}`, { cache: "no-store" })
    : null;
  let payload: unknown = response
    ? await response.json().catch(() => null)
    : null;

  const needsLocationFallback =
    !response?.ok ||
    !isRecord(payload) ||
    (Array.isArray(payload.items) &&
      payload.items.length === 0 &&
      Boolean(payload.note));

  if (needsLocationFallback) {
    response = await fetch("/api/menu/sync?location=primary", {
      cache: "no-store",
    });
    payload = await response.json().catch(() => null);
  }

  if (!response || !response.ok || !isRecord(payload)) {
    throw new Error(responseError(payload, "Could not load menu headings."));
  }

  return Array.isArray(payload.items)
    ? payload.items.flatMap((value) => {
        const item = asMenuItem(value);
        return item ? [item] : [];
      })
    : [];
}

function removeCategoryLink(items: MenuItem[], url: string): MenuItem[] {
  return items
    .filter((item) => item.url !== url)
    .map((item) => ({
      ...item,
      children: removeCategoryLink(item.children, url),
    }));
}

async function placeCategoryInMenu(
  category: Category,
  headingIndex: number | null,
) {
  if (headingIndex === null) return;

  const url = `/product-category/${category.slug}`;
  const items = removeCategoryLink(await readPrimaryMenu(), url);
  const heading = items[headingIndex];

  if (!heading) {
    throw new Error("The selected menu heading is no longer available.");
  }

  heading.children.push({
    title: category.name,
    url,
    children: [],
  });

  const response = await fetch("/api/menu/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items,
      location: "primary",
      location_label: "Main Menu",
      also_location_labels: ["Off-Canvas Menu"],
    }),
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(responseError(payload, "Could not update the store menu."));
  }
}

function CategoryImagePreview({ image }: { image?: CategoryImage | null }) {
  if (!image?.src) {
    return (
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
        <Tag className="h-5 w-5" />
      </div>
    );
  }

  return (
    // WooCommerce category images are remote WordPress media URLs.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      alt=""
      className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
    />
  );
}

export default function CategoriesClient({ initial }: { initial: Category[] }) {
  const [rows, setRows] = useState<Category[]>(initial);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parent, setParent] = useState(0);
  const [newImage, setNewImage] = useState<CategoryImage | null>(null);
  const [newMenuHeading, setNewMenuHeading] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editParent, setEditParent] = useState(0);
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState<CategoryImage | null>(null);
  const [editMenuHeading, setEditMenuHeading] = useState("");
  const [menuHeadings, setMenuHeadings] = useState<MenuHeading[]>([]);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [workingText, setWorkingText] = useState("Please wait...");

  const flat = useMemo(() => indentCategories(rows), [rows]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return flat;
    return flat.filter(
      (category) =>
        category.name.toLowerCase().includes(normalized) ||
        category.slug.toLowerCase().includes(normalized),
    );
  }, [flat, query]);

  useEffect(() => {
    let cancelled = false;

    void readPrimaryMenu()
      .then((items) => {
        if (cancelled) return;
        setMenuHeadings(
          items.map((item, index) => ({ index, title: item.title })),
        );
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMenuError(
            error instanceof Error ? error.message : "Could not load menu headings.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function uploadedImage(
    _url?: string,
    media?: MediaUploadResult,
  ): CategoryImage | null {
    return media ? { id: media.id, src: media.url } : null;
  }

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setWorking(true);
    setWorkingText("Creating category...");

    try {
      const response = await fetch("/api/categories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          parent,
          image_id: newImage?.id,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok || !isRecord(payload) || !isRecord(payload.category)) {
        throw new Error(responseError(payload, "Category creation failed."));
      }

      const category = payload.category as Category;
      setRows((current) => [...current, category]);

      if (newMenuHeading) {
        setWorkingText("Adding category to menu...");
        await placeCategoryInMenu(category, Number(newMenuHeading));
      }

      setName("");
      setDescription("");
      setParent(0);
      setNewImage(null);
      setNewMenuHeading("");
      setAddOpen(false);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Category creation failed.");
    } finally {
      setWorking(false);
    }
  }

  function startEdit(category: Category) {
    setEditId(category.id);
    setEditName(category.name);
    setEditSlug(category.slug);
    setEditParent(category.parent);
    setEditDescription(category.description || "");
    setEditImage(category.image || null);
    setEditMenuHeading("");
  }

  function cancelEdit() {
    setEditId(null);
    setEditName("");
    setEditSlug("");
    setEditParent(0);
    setEditDescription("");
    setEditImage(null);
    setEditMenuHeading("");
  }

  async function saveEdit() {
    if (!editId || !editName.trim()) return;

    setWorking(true);
    setWorkingText("Saving category...");

    try {
      const response = await fetch(`/api/categories/${editId}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim(),
          parent: editParent,
          description: editDescription.trim(),
          image_id: editImage?.id,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok || !isRecord(payload) || !isRecord(payload.category)) {
        throw new Error(responseError(payload, "Category update failed."));
      }

      const category = payload.category as Category;
      setRows((current) =>
        current.map((item) => (item.id === category.id ? category : item)),
      );

      if (editMenuHeading) {
        setWorkingText("Updating category menu placement...");
        await placeCategoryInMenu(category, Number(editMenuHeading));
      }

      cancelEdit();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Category update failed.");
    } finally {
      setWorking(false);
    }
  }

  async function removeCategory(id: number) {
    if (!confirm("Delete this category? Products will not be deleted.")) return;

    setWorking(true);
    setWorkingText("Deleting category...");

    try {
      const response = await fetch(`/api/categories/${id}/delete`, {
        method: "DELETE",
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(responseError(payload, "Category deletion failed."));
      }

      setRows((current) =>
        current
          .filter((item) => item.id !== id)
          .map((item) => (item.parent === id ? { ...item, parent: 0 } : item)),
      );
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Category deletion failed.");
    } finally {
      setWorking(false);
    }
  }

  const menuSelect = (
    value: string,
    onChange: (value: string) => void,
  ) => (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        Add under menu heading <span className="font-normal text-slate-400">(optional)</span>
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
      >
        <option value="">Do not change menu</option>
        {menuHeadings.map((heading) => (
          <option key={heading.index} value={heading.index}>
            {heading.title}
          </option>
        ))}
      </select>
      {menuError && <p className="mt-1 text-[11px] text-amber-700">{menuError}</p>}
    </div>
  );

  const imageUploader = (
    image: CategoryImage | null,
    onChange: (image: CategoryImage | null) => void,
  ) => (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        Category image <span className="font-normal text-slate-400">(optional)</span>
      </label>
      <div className="flex items-start gap-3">
        <CategoryImagePreview image={image} />
        <ImageUploader
          purpose="category_image"
          label={image ? "Replace image" : "Upload image"}
          onUploaded={(url, media) => onChange(uploadedImage(url, media))}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setAddOpen((open) => !open)}
            className="flex w-full items-center justify-between border-b border-slate-100 px-5 py-4 text-left"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700">
                <Plus className="h-5 w-5" />
              </span>
              <span className="font-semibold text-slate-900">Add new category</span>
            </span>
            <ChevronDown className={`h-4 w-4 ${addOpen ? "rotate-180" : ""}`} />
          </button>

          {addOpen && (
            <form onSubmit={createCategory} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Name *</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Parent category</label>
                <select
                  value={parent}
                  onChange={(event) => setParent(Number(event.target.value))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value={0}>None</option>
                  {flat.map((category) => (
                    <option key={category.id} value={category.id}>
                      {"— ".repeat(category.depth)}{category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              {imageUploader(newImage, setNewImage)}
              {menuSelect(newMenuHeading, setNewMenuHeading)}
              <button
                type="submit"
                className="h-11 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white"
              >
                Add category
              </button>
            </form>
          )}
        </section>

        <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Category list</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {filtered.length} items
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or slug..."
                className="min-w-0 flex-1 text-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {filtered.map((category) => (
              <div key={category.id} className="rounded-2xl border border-slate-200 p-3">
                {editId === category.id ? (
                  <div className="space-y-3">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-11 w-full rounded-xl border px-3 text-sm" />
                    <input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="h-11 w-full rounded-xl border px-3 text-sm" placeholder="slug" />
                    <select value={editParent} onChange={(e) => setEditParent(Number(e.target.value))} className="h-11 w-full rounded-xl border bg-white px-3 text-sm">
                      <option value={0}>No parent</option>
                      {flat.filter((item) => item.id !== category.id).map((item) => <option key={item.id} value={item.id}>{"— ".repeat(item.depth)}{item.name}</option>)}
                    </select>
                    <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="w-full rounded-xl border px-3 py-2 text-sm" />
                    {imageUploader(editImage, setEditImage)}
                    {menuSelect(editMenuHeading, setEditMenuHeading)}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void saveEdit()} className="flex-1 rounded-xl bg-violet-600 px-3 py-2 text-sm text-white">Save</button>
                      <button type="button" onClick={cancelEdit} className="flex-1 rounded-xl border px-3 py-2 text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <CategoryImagePreview image={category.image} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/categories/${category.id}`} className="block truncate font-semibold text-slate-900 hover:text-violet-700">
                        {"— ".repeat(category.depth)}{category.name}
                      </Link>
                      <p className="truncate text-sm text-slate-500">{category.slug}</p>
                      <p className="mt-1 text-xs text-slate-500">{category.count ?? 0} products</p>
                      <div className="mt-3 flex gap-3 text-xs font-medium">
                        <Link href={`/categories/${category.id}`} className="text-violet-700">View details</Link>
                        <button type="button" onClick={() => startEdit(category)} className="text-slate-600">Quick edit</button>
                        <button type="button" onClick={() => void removeCategory(category.id)} className="text-rose-600">Delete</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3 text-center">Products</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((category) => {
                  const parentName = category.parent
                    ? rows.find((item) => item.id === category.parent)?.name || "—"
                    : "—";

                  return (
                    <tr key={category.id} className="border-t border-slate-100 align-top">
                      {editId === category.id ? (
                        <td colSpan={5} className="p-4">
                          <div className="grid gap-3 lg:grid-cols-2">
                            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-11 rounded-xl border px-3 text-sm" />
                            <input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="h-11 rounded-xl border px-3 text-sm" placeholder="slug" />
                            <select value={editParent} onChange={(e) => setEditParent(Number(e.target.value))} className="h-11 rounded-xl border bg-white px-3 text-sm">
                              <option value={0}>No parent</option>
                              {flat.filter((item) => item.id !== category.id).map((item) => <option key={item.id} value={item.id}>{"— ".repeat(item.depth)}{item.name}</option>)}
                            </select>
                            {menuSelect(editMenuHeading, setEditMenuHeading)}
                            <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="rounded-xl border px-3 py-2 text-sm lg:col-span-2" />
                            {imageUploader(editImage, setEditImage)}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button type="button" onClick={() => void saveEdit()} className="rounded-xl bg-violet-600 px-4 py-2 text-sm text-white">Save</button>
                            <button type="button" onClick={cancelEdit} className="rounded-xl border px-4 py-2 text-sm">Cancel</button>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <CategoryImagePreview image={category.image} />
                              <Link href={`/categories/${category.id}`} className="font-semibold text-slate-900 hover:text-violet-700">
                                {"— ".repeat(category.depth)}{category.name}
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{category.slug}</td>
                          <td className="px-4 py-3 text-slate-600">{parentName}</td>
                          <td className="px-4 py-3 text-center">{category.count ?? 0}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-3 text-xs font-medium">
                              <Link href={`/categories/${category.id}`} className="text-violet-700">Details</Link>
                              <button type="button" onClick={() => startEdit(category)} className="text-slate-600">Edit</button>
                              <button type="button" onClick={() => void removeCategory(category.id)} className="text-rose-600">Delete</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="grid place-items-center gap-2 px-5 py-12 text-center text-sm text-slate-500">
              <FolderOpen className="h-8 w-8 text-slate-300" />
              No categories found.
            </div>
          )}
        </section>
      </div>

      {working && (
        <div className="fixed inset-0 z-[220] grid place-items-center bg-white/55 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-xl">
            <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
            <span className="text-sm font-medium text-slate-700">{workingText}</span>
          </div>
        </div>
      )}
    </>
  );
}
