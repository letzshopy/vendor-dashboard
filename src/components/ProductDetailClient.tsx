// src/components/ProductDetailClient.tsx
"use client";

import { useMemo, useState } from "react";

type Cat = { id: number; name: string; parent?: number };
type Tag = { id: number; name: string };
export type ProductDetailShape = {
  id: number;
  name: string;
  sku?: string;
  regular_price?: string;
  stock_quantity?: number | null;
  description?: string;
  status?: "publish" | "draft" | string;
  images?: string[];                  // src URLs (read-only display)
  categories?: Cat[];
  tags?: Tag[];
};

export default function ProductDetailClient({ initial }: { initial: ProductDetailShape }) {
  const [form, setForm] = useState<ProductDetailShape>(initial);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<null | "ok" | "err">(null);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial]
  );

  const update = (k: keyof ProductDetailShape, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const numStr = (v: any) =>
    v === null || v === undefined || v === "" ? "" : String(v);
  const toNumOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

  async function save() {
    if (!dirty) return;
    setSaving(true);
    setFlash(null);
    try {
      const r = await fetch(`/api/products/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          regular_price: form.regular_price,
          stock_quantity: form.stock_quantity,
          description: form.description,
          status: form.status,
        }),
      });
      if (!r.ok) throw new Error((await r.json())?.error || "Save failed");
      const data = (await r.json()) as ProductDetailShape;
      setForm(data);
      // update initial snapshot to reset dirty
      history.replaceState(null, "", `?saved=1`);
      setFlash("ok");
      setTimeout(() => setFlash(null), 2500);
    } catch (e) {
      console.error(e);
      setFlash("err");
      setTimeout(() => setFlash(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {flash === "ok" && (
        <div className="rounded-md border border-green-200 bg-green-50 text-green-700 px-3 py-2 text-sm">
          Saved successfully.
        </div>
      )}
      {flash === "err" && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
          Save failed — check console.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border rounded-xl p-4">
          <label className="block text-sm font-medium">Title</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.name || ""}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Product name"
          />

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">SKU</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.sku || ""}
                onChange={(e) => update("sku", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Status</label>
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.status || "publish"}
                onChange={(e) => update("status", e.target.value as any)}
              >
                <option value="publish">Publish</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Regular price</label>
              <input
                type="number"
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.regular_price || ""}
                onChange={(e) => update("regular_price", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Stock quantity</label>
              <input
                type="number"
                className="mt-1 w-full rounded border px-3 py-2"
                value={numStr(form.stock_quantity)}
                onChange={(e) => update("stock_quantity", toNumOrNull(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium">Description</label>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 min-h-[140px]"
              value={form.description || ""}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="border rounded-xl p-4">
            <div className="text-sm font-medium mb-2">Images</div>
            {form.images?.length ? (
              <div className="grid grid-cols-3 gap-2">
                {form.images.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="w-full h-24 object-cover rounded" />
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No images.</div>
            )}
          </div>

          <div className="border rounded-xl p-4">
            <div className="text-sm font-medium mb-2">Categories</div>
            {form.categories?.length ? (
              <div className="flex flex-wrap gap-1">
                {form.categories.map((c) => (
                  <span key={c.id} className="rounded-full border px-2 py-0.5 text-xs">
                    {c.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No categories.</div>
            )}
          </div>

          <button
            className="w-full rounded-xl border px-3 py-2 disabled:opacity-50"
            disabled={!dirty || saving}
            onClick={save}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {!dirty && (
            <div className="text-xs text-gray-500 text-center">Make a change to enable Save.</div>
          )}
        </div>
      </div>
    </div>
  );
}
