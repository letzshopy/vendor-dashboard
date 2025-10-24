"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductImages, { type ImgItem } from "@/components/ProductImages";

/** ===== Types ===== */
type Cat = { id: number; name: string; parent: number };
type Attr = { id: number; name: string; slug: string };
type Term = { id: number; name: string; slug: string };

type ProductType = "simple" | "variable" | "grouped";

type Prod = {
  id: number;
  name: string;
  type: ProductType | string;
  sku?: string;
  status?: "draft" | "publish";
  catalog_visibility?: "visible" | "catalog" | "search" | "hidden";
  short_description?: string;
  description?: string;
  regular_price?: string;
  sale_price?: string;
  date_on_sale_from?: string | null;
  date_on_sale_to?: string | null;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  backorders?: "no" | "notify" | "yes";
  weight?: string | null;
  dimensions?: { length?: string; width?: string; height?: string } | null;
  categories?: { id: number; name: string }[];
  tags?: { id: number; name: string }[];
  images?: { id: number; src: string }[];
  attributes?: {
    id?: number;
    name?: string;
    slug?: string;
    visible?: boolean;
    variation?: boolean;
    options?: string[];
  }[];
  grouped_products?: number[];
};

type VRow = {
  id?: number;
  key: string;
  attrs: { id?: number; name?: string; option: string }[];
  sku: string;
  regular_price: string;
  sale_price: string;
  manage_stock: boolean;
  stock_quantity: number | "";
  backorders: "no" | "notify" | "yes";
};

/** ===== Helpers ===== */
function indentCats(cats: Cat[]) {
  const byParent: Record<number, Cat[]> = {};
  cats.forEach((c) => {
    byParent[c.parent] ??= [];
    byParent[c.parent].push(c);
  });
  const out: (Cat & { depth: number })[] = [];
  (function walk(parent: number, depth: number) {
    (byParent[parent] || [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((c) => {
        out.push({ ...c, depth });
        walk(c.id, depth + 1);
      });
  })(0, 0);
  return out;
}
function sizeSlugToShort(slug: string) {
  const s = slug.toLowerCase();
  if (["s", "small"].includes(s)) return "S";
  if (["m", "medium"].includes(s)) return "M";
  if (["l", "large"].includes(s)) return "L";
  if (["xl", "extra-large", "xlarge"].includes(s)) return "XL";
  if (["xxl", "2xl", "double-xl", "xx-large"].includes(s)) return "XXL";
  if (["xs", "xsmall", "extra-small"].includes(s)) return "XS";
  if (["xxs", "2xs"].includes(s)) return "XXS";
  return slug.replace(/\s+/g, "-");
}
function skuPartFor(attrName: string | undefined, termName: string, termSlug?: string) {
  if (!attrName) return (termSlug || termName).toLowerCase();
  const an = attrName.toLowerCase();
  if (an.includes("size")) return sizeSlugToShort(termSlug || termName);
  return (termSlug || termName).toLowerCase().replace(/\s+/g, "-");
}

/** ===== Component ===== */
export default function EditProductClient({
  id,
  mode = "edit",
}: {
  id: string;
  mode?: "edit" | "detail";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isDetailMode = mode === "detail";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [cats, setCats] = useState<Cat[]>([]);
  const flatCats = useMemo(() => indentCats(cats), [cats]);
  const [attrs, setAttrs] = useState<Attr[]>([]);
  const [termsMap, setTermsMap] = useState<Record<number, Term[]>>({});

  const [p, setP] = useState<Prod | null>(null);

  const [ptype, setPtype] = useState<ProductType>("simple");

  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [status, setStatus] = useState<"draft" | "publish">("draft");
  const [visibility, setVisibility] = useState<"visible" | "catalog" | "search" | "hidden">("visible");
  const [shortDesc, setShortDesc] = useState("");
  const [desc, setDesc] = useState("");

  const [images, setImages] = useState<ImgItem[]>([]);

  const [regular, setRegular] = useState("");
  const [sale, setSale] = useState("");
  const [saleFrom, setSaleFrom] = useState("");
  const [saleTo, setSaleTo] = useState("");

  const [manageStock, setManageStock] = useState(false);
  const [stockQty, setStockQty] = useState<number | "">("");
  const [backorders, setBackorders] = useState<"no" | "notify" | "yes">("no");

  // (shipping class UI intentionally omitted)
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const filteredCats = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    if (!q) return flatCats;
    return flatCats.filter((c) => c.name.toLowerCase().includes(q));
  }, [flatCats, catQuery]);

  const [tagsInput, setTagsInput] = useState("");

  const [varAttrRows, setVarAttrRows] = useState<number[]>([]);
  const [varChosenAttr, setVarChosenAttr] = useState<number | "">("");
  const [varChosenTerms, setVarChosenTerms] = useState<Record<number, string[]>>({});
  const [rows, setRows] = useState<VRow[]>([]);

  const [groupSelected, setGroupSelected] = useState<number[]>([]);
  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState<{ id: number; name: string; sku: string }[]>([]);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** --------- DIRTY GUARD (detail mode) --------- */
  function snapshotFromProduct(prod: Prod) {
    const base: any = {
      type: (prod.type as ProductType) ?? "simple",
      name: prod.name || "",
      sku: prod.sku || "",
      status: prod.status || "draft",
      visibility: prod.catalog_visibility || "visible",
      short_description: prod.short_description || "",
      description: prod.description || "",
      images: (prod.images || []).map((im, idx) => ({ id: im.id, position: idx })),
      categories: (prod.categories || []).map((c) => ({ id: c.id })),
      tags: (prod.tags || []).map((t) => ({ name: t.name })),
      weight: prod.weight || "",
      dimensions: prod.dimensions || { length: "", width: "", height: "" },
    };
    if (base.type === "simple") {
      base.regular_price = prod.regular_price || "";
      base.sale_price = prod.sale_price || "";
      base.date_on_sale_from = (prod.date_on_sale_from as any) || "";
      base.date_on_sale_to = (prod.date_on_sale_to as any) || "";
      base.manage_stock = !!prod.manage_stock;
      base.stock_quantity = prod.manage_stock ? (prod.stock_quantity ?? "") : "";
      base.backorders = (prod.backorders as any) || "no";
    }
    if (base.type === "variable") {
      base.attributes = (prod.attributes || [])
        .filter((a) => a.variation)
        .map((a) => ({ id: a.id, name: a.name, options: a.options || [] }));
    }
    if (base.type === "grouped") {
      base.grouped_products = (prod.grouped_products || []).filter((n): n is number => typeof n === "number");
    }
    return JSON.stringify(base);
  }
  function snapshotFromState() {
    const base: any = {
      type: ptype,
      name: title,
      sku,
      status,
      visibility,
      short_description: shortDesc,
      description: desc,
      images: images.map((im, idx) => ({ id: im.id, position: idx })),
      categories: selectedCats.map((id) => ({ id })),
      tags: tagsInput.split(",").map((s) => s.trim()).filter(Boolean).map((name) => ({ name })),
      weight,
      dimensions: { length, width, height },
    };
    if (ptype === "simple") {
      base.regular_price = regular;
      base.sale_price = sale;
      base.date_on_sale_from = saleFrom;
      base.date_on_sale_to = saleTo;
      base.manage_stock = manageStock;
      base.stock_quantity = manageStock ? stockQty : "";
      base.backorders = backorders;
    }
    if (ptype === "variable") {
      base.attributes = varAttrRows.map((id) => ({
        id,
        name: attrs.find((a) => a.id === id)?.name,
        options: varChosenTerms[id] || [],
      }));
      base.variations = rows.map((r) => ({
        id: r.id,
        sku: r.sku,
        regular_price: r.regular_price,
        sale_price: r.sale_price,
        manage_stock: r.manage_stock,
        stock_quantity: r.manage_stock ? r.stock_quantity : "",
        backorders: r.backorders,
        attrs: r.attrs,
      }));
    }
    if (ptype === "grouped") {
      base.grouped_products = groupSelected.slice();
    }
    return JSON.stringify(base);
  }
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  /** -------------------------------------------- */

  useEffect(() => {
    (async () => {
      try {
        const [pr, cr, ar] = await Promise.all([
          fetch(`/api/products/${id}/view`),
          fetch("/api/categories/list"),
          fetch("/api/attributes/terms"),
        ]);
        const pj = await pr.json();
        const cj = await cr.json();
        const aj = await ar.json();

        if (cr.ok) setCats(cj.categories || []);
        if (ar.ok) setAttrs(aj.attributes || []);

        if (pr.ok) {
          const prod: Prod = pj.product;
          setP(prod);

          setPtype((prod.type as ProductType) ?? "simple");
          setTitle(prod.name || "");
          setSku(prod.sku || "");
          setStatus(prod.status || "draft");
          setVisibility(prod.catalog_visibility || "visible");
          setShortDesc(prod.short_description || "");
          setDesc(prod.description || "");
          setImages((prod.images || []).slice(0, 5).map((im) => ({ id: im.id, url: im.src })));
          setSelectedCats((prod.categories || []).map((c) => c.id));
          setTagsInput((prod.tags || []).map((t) => t.name).join(", "));

          if (prod.type === "simple") {
            setRegular(prod.regular_price || "");
            setSale(prod.sale_price || "");
            setSaleFrom((prod.date_on_sale_from as any) || "");
            setSaleTo((prod.date_on_sale_to as any) || "");
            setManageStock(!!prod.manage_stock);
            setStockQty(prod.manage_stock ? (prod.stock_quantity ?? "") : "");
            setBackorders(prod.backorders || "no");
          }

          if (prod.type !== "grouped") {
            setWeight(prod.weight || "");
            setLength(prod.dimensions?.length || "");
            setWidth(prod.dimensions?.width || "");
            setHeight(prod.dimensions?.height || "");
          }

          if (prod.type === "variable") {
            const varAttrs = (prod.attributes || []).filter((a) => a.variation);
            const attrIds: number[] = [];
            const chosen: Record<number, string[]> = {};

            for (const a of varAttrs) {
              const id = a.id;
              if (!id) continue;
              attrIds.push(id);
              chosen[id] = (a.options || []).slice();
            }
            setVarAttrRows(attrIds);
            setVarChosenTerms(chosen);

            await Promise.all(attrIds.map((aid) => loadTerms(aid)));

            const vr = await fetch(`/api/products/${prod.id}/variations`);
            const vj = await vr.json();
            if (vr.ok) {
              const loadedRows: VRow[] = (vj.variations || []).map((v: any) => ({
                id: v.id,
                key: (v.attributes || []).map((a: any) => `${a.name}=${a.option}`).join("|"),
                attrs: v.attributes || [],
                sku: v.sku || "",
                regular_price: v.regular_price || "",
                sale_price: v.sale_price || "",
                manage_stock: !!v.manage_stock,
                stock_quantity: v.manage_stock ? (v.stock_quantity ?? "") : "",
                backorders: (v.backorders as any) || "no",
              }));
              setRows(loadedRows);
            }
          }

          if (prod.type === "grouped") {
            const ids = (prod.grouped_products || []).filter((n): n is number => typeof n === "number");
            setGroupSelected(ids);
          }

          setInitialSnapshot(snapshotFromProduct(prod)); // baseline for detail-mode guard
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadTerms(attrId: number) {
    if (termsMap[attrId]) return;
    const r = await fetch(`/api/attributes/terms?id=${attrId}`);
    const j = await r.json();
    if (r.ok) setTermsMap((m) => ({ ...m, [attrId]: j.terms || [] }));
  }
  function findTerm(attrId: number, termName: string) {
    return (termsMap[attrId] || []).find((t) => t.name === termName);
  }

  function addVarAttrRow() {
    if (!varChosenAttr) return;
    const id = Number(varChosenAttr);
    if (!varAttrRows.includes(id)) {
      setVarAttrRows([...varAttrRows, id]);
      loadTerms(id);
    }
    setVarChosenAttr("");
  }
  function toggleVarTerm(attrId: number, termName: string) {
    setVarChosenTerms((m) => {
      const cur = new Set(m[attrId] || []);
      cur.has(termName) ? cur.delete(termName) : cur.add(termName);
      return { ...m, [attrId]: Array.from(cur) };
    });
  }
  function generateVariations() {
    const base = sku.trim();
    const attrDefs = varAttrRows
      .map((id) => ({
        id,
        name: attrs.find((a) => a.id === id)?.name,
        terms: varChosenTerms[id] || [],
      }))
      .filter((a) => a.terms.length > 0);

    if (attrDefs.length === 0) {
      setRows([]);
      return;
    }

    let combos: { id?: number; name?: string; option: string }[][] = [[]];
    for (const a of attrDefs) {
      const next: any[] = [];
      for (const combo of combos) {
        for (const termName of a.terms) next.push([...combo, { id: a.id, name: a.name, option: termName }]);
      }
      combos = next;
    }

    const built: VRow[] = combos.map((attrsCombo) => {
      const parts = attrsCombo.map((a) => {
        const term = findTerm(a.id!, a.option);
        return skuPartFor(a.name, a.option, term?.slug);
      });
      const autoSku = base ? `${base}-${parts.join("-")}` : "";

      return {
        key: attrsCombo.map((a) => `${a.name}=${a.option}`).join("|"),
        attrs: attrsCombo,
        sku: autoSku,
        regular_price: "",
        sale_price: "",
        manage_stock: false,
        stock_quantity: "",
        backorders: "no",
      };
    });

    setRows(built);
  }
  function editRow(i: number, patch: Partial<VRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(doGroupSearch, 300);
  }, [groupQuery]);
  async function doGroupSearch() {
    const q = groupQuery.trim();
    if (!q) {
      setGroupResults([]);
      return;
    }
    const r = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
    const j = await r.json();
    if (r.ok) setGroupResults(j.results || []);
  }

  function swallowEnter(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter") e.preventDefault();
  }

  const isDirty = useMemo(() => {
    if (!isDetailMode) return true; // normal edit: Save always enabled
    if (!initialSnapshot) return false;
    return snapshotFromState() !== initialSnapshot;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDetailMode,
    initialSnapshot,
    ptype,
    title,
    sku,
    status,
    visibility,
    shortDesc,
    desc,
    images,
    selectedCats,
    tagsInput,
    regular,
    sale,
    saleFrom,
    saleTo,
    manageStock,
    stockQty,
    backorders,
    weight,
    length,
    width,
    height,
    varAttrRows,
    varChosenTerms,
    rows,
  ]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isDetailMode && !isDirty) return;

    setBusy(true);
    setErr(null);

    try {
      if (!p) throw new Error("Product not loaded");
      const basePayload: any = {
        type: ptype,
        name: title,
        sku: sku || undefined,
        status,
        catalog_visibility: visibility,
        short_description: shortDesc,
        description: desc,
        regular_price: ptype === "simple" ? (regular ?? "") : undefined,
	// Always include sale fields for simple products.
	// Blank string "" is intentional — the API route converts it to null.
	sale_price: ptype === "simple" ? (sale ?? "") : undefined,
	date_on_sale_from: ptype === "simple" ? (saleFrom ?? "") : undefined,
	date_on_sale_to: ptype === "simple" ? (saleTo ?? "") : undefined,
        manage_stock: ptype === "simple" ? manageStock : undefined,
        stock_quantity: ptype === "simple" && manageStock ? Number(stockQty || 0) : undefined,
        backorders: ptype === "simple" ? backorders : undefined,
        weight: ptype !== "grouped" ? (weight || undefined) : undefined,
        dimensions: ptype !== "grouped" && (length || width || height) ? { length, width, height } : undefined,
        images: images.map((im, idx) => ({ id: im.id, position: idx })),
        categories: selectedCats.map((id) => ({ id })),
        tags: tagsInput.split(",").map((s) => s.trim()).filter(Boolean).map((name) => ({ name })),
      };

      if (ptype === "variable") {
        basePayload.attributes = varAttrRows.map((id) => ({
          id,
          name: attrs.find((a) => a.id === id)?.name,
          visible: true,
          variation: true,
          options: varChosenTerms[id] || [],
        }));
      }
      if (ptype === "grouped") basePayload.grouped_products = groupSelected;

      const r = await fetch(`/api/products/${p.id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Update failed");

      if (ptype === "variable") {
        const vr = await fetch(`/api/products/${p.id}/variations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variations: rows.map((r) => ({
              id: r.id,
              sku: r.sku || undefined,
              regular_price: r.regular_price || undefined,
              sale_price: r.sale_price || undefined,
              manage_stock: r.manage_stock,
              stock_quantity: r.manage_stock ? Number(r.stock_quantity || 0) : undefined,
              backorders: r.backorders,
              attributes: r.attrs,
            })),
          }),
        });
        const vj = await vr.json();
        if (!vr.ok) throw new Error(vj?.error || "Variations update failed");
      }

      // ✅ Redirect to same URL with presence-only ?saved
      const params = new URLSearchParams(searchParams.toString());
      params.set("saved", "");
      router.replace(`?${params.toString()}`, { scroll: false });

      // Reset dirty baseline in detail mode
      if (isDetailMode) setInitialSnapshot(snapshotFromState());
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse text-slate-500">Loading…</div>;
  }
  if (!p) {
    return <div className="text-red-700">Product not found.</div>;
  }

  return (
    <form onSubmit={submit} onKeyDown={swallowEnter} className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between -mt-2">
        <div className="flex items-center gap-3">
          <Link href="/products" className="text-sm text-blue-600 underline">
            Back to list
          </Link>
          <button
            type="button"
            className="text-sm text-blue-600 underline"
            onClick={async (e) => {
              e.preventDefault();
              const r = await fetch(`/api/products/${p.id}/duplicate`, { method: "POST" });
              const j = await r.json();
              if (!r.ok) return alert(j?.error || "Duplicate failed");
              location.href = "/products";
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="text-sm text-blue-600 underline"
            onClick={async (e) => {
              e.preventDefault();
              await fetch(`/api/products/${p.id}/trash`, { method: "DELETE" });
              location.href = "/products/trash";
            }}
          >
            Trash
          </button>
          <button
            type="button"
            className="text-sm text-red-600 underline"
            onClick={async (e) => {
              e.preventDefault();
              if (!confirm("Permanently delete this product?")) return;
              await fetch(`/api/products/${p.id}/delete`, { method: "DELETE" });
              location.href = "/products";
            }}
          >
            Delete permanently
          </button>
        </div>

        <div>
          <button
            type="submit"
            disabled={busy || (isDetailMode && !isDirty)}
            className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
          {isDetailMode && !isDirty && (
            <span className="ml-3 text-slate-500 text-sm">Make a change to enable Save.</span>
          )}
        </div>
      </div>

      {/* Product Type */}
      <section className="border rounded-lg p-4">
        <div className="font-medium mb-3">Product Type</div>
        <div className="flex gap-3 text-sm">
          {(["simple", "variable", "grouped"] as ProductType[]).map((t) => (
            <label
              key={t}
              className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 cursor-pointer ${
                ptype === t ? "bg-blue-50 border-blue-300" : "bg-white hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="ptype"
                value={t}
                checked={ptype === t}
                onChange={() => setPtype(t)}
              />
              {t[0].toUpperCase() + t.slice(1)}
            </label>
          ))}
        </div>
      </section>

      {/* Basics */}
      <section className="border rounded-lg p-4">
        <div className="font-medium mb-3">Basics</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">SKU</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Status</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="draft">Draft</option>
              <option value="publish">Published</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Visibility</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
            >
              <option value="visible">Visible</option>
              <option value="catalog">Catalog only</option>
              <option value="search">Search only</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Short description</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              rows={3}
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              rows={6}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Pricing (simple) */}
      {ptype === "simple" && (
        <section className="border rounded-lg p-4">
          <div className="font-medium mb-3">Pricing</div>
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-1">Regular price</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={regular}
                onChange={(e) => setRegular(e.target.value)}
                placeholder="e.g. 999"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Sale price</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={sale}
                onChange={(e) => setSale(e.target.value)}
                placeholder="e.g. 799"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Sale from</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2 text-sm"
                value={saleFrom}
                onChange={(e) => setSaleFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Sale to</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2 text-sm"
                value={saleTo}
                onChange={(e) => setSaleTo(e.target.value)}
              />
            </div>
          </div>
        </section>
      )}

      {/* Inventory (simple) */}
      {ptype === "simple" && (
        <section className="border rounded-lg p-4">
          <div className="font-medium mb-3">Inventory</div>
          <label className="inline-flex items-center gap-2 text-sm mb-3">
            <input
              type="checkbox"
              checked={manageStock}
              onChange={(e) => setManageStock(e.target.checked)}
            />
            Manage stock?
          </label>
          {manageStock && (
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-1">Quantity</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  type="number"
                  min={0}
                  value={stockQty}
                  onChange={(e) =>
                    setStockQty(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Backorders</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={backorders}
                  onChange={(e) => setBackorders(e.target.value as any)}
                >
                  <option value="no">Do not allow</option>
                  <option value="notify">Allow, but notify</option>
                  <option value="yes">Allow</option>
                </select>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Shipping (no shipping class UI) */}
      {ptype !== "grouped" && (
        <section className="border rounded-lg p-4">
          <div className="font-medium mb-3">Shipping</div>
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-1">Weight</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="kg"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Length</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="cm"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Width</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="cm"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Height</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="cm"
              />
            </div>
          </div>
        </section>
      )}

      {/* Images */}
      <section className="border rounded-lg p-4">
        <ProductImages value={images} onChange={setImages} max={5} />
      </section>

      {/* Categorization */}
      <section className="border rounded-lg p-4">
        <div className="font-medium mb-3">Categorization</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm mb-1">Categories</label>
            <button
              type="button"
              className="w-full border rounded px-3 py-2 text-sm text-left"
              onClick={() => setCatOpen((o) => !o)}
            >
              {selectedCats.length === 0 ? (
                <span className="text-slate-500">Select categories…</span>
              ) : (
                <span>
                  {selectedCats
                    .map((id) => cats.find((c) => c.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")}
                </span>
              )}
            </button>
            {catOpen && (
              <div className="absolute z-10 mt-1 w-full border rounded bg-white shadow">
                <div className="p-2 border-b">
                  <input
                    autoFocus
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Search…"
                    value={catQuery}
                    onChange={(e) => setCatQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-64 overflow-auto py-1">
                  {filteredCats.map((c) => {
                    const checked = selectedCats.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 px-3 py-1 text-sm hover:bg-gray-50 cursor-pointer"
                        style={{ paddingLeft: 12 + c.depth * 14 }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedCats((arr) =>
                              checked ? arr.filter((x) => x !== c.id) : [...arr, c.id]
                            )
                          }
                        />
                        <span>{c.name}</span>
                      </label>
                    );
                  })}
                  {filteredCats.length === 0 && (
                    <div className="px-3 py-2 text-sm text-slate-500">No matches.</div>
                  )}
                </div>
                <div className="flex justify-end gap-2 p-2 border-t">
                  <button
                    type="button"
                    className="text-sm px-3 py-1 rounded border"
                    onClick={() => setCatOpen(false)}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    className="text-sm px-3 py-1 rounded border"
                    onClick={() => {
                      setSelectedCats([]);
                      setCatOpen(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1">Tags (comma-separated)</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. festive, saree, cotton"
            />
          </div>
        </div>
      </section>

      {/* Variable product */}
      {ptype === "variable" && (
        <>
          <section className="border rounded-lg p-4">
            <div className="font-medium mb-3">Attributes for variations</div>
            <div className="flex gap-2 mb-3">
              <select
                className="border rounded px-3 py-2 text-sm"
                value={varChosenAttr}
                onChange={(e) => setVarChosenAttr(e.target.value as any)}
              >
                <option value="">Select attribute…</option>
                {attrs.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={addVarAttrRow}
              >
                Add
              </button>
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={generateVariations}
              >
                Generate variations
              </button>
            </div>

            <div className="space-y-3">
              {varAttrRows.map((id) => (
                <div key={id} className="border rounded p-3">
                  <div className="font-medium mb-2">
                    {attrs.find((a) => a.id === id)?.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(termsMap[id] || []).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleVarTerm(id, t.name)}
                        className={`text-xs rounded border px-2 py-1 ${
                          (varChosenTerms[id] || []).includes(t.name)
                            ? "bg-blue-50 border-blue-300 text-blue-700"
                            : "bg-white hover:bg-gray-50"
                        }`}
                        title={t.slug}
                      >
                        {t.name}
                        {t.slug ? (
                          <span className="ml-1 text-slate-500">({t.slug})</span>
                        ) : null}
                      </button>
                    ))}
                    {!termsMap[id] && (
                      <span className="text-xs text-slate-500">Loading…</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border rounded-lg p-4">
            <div className="font-medium mb-3">Variations</div>
            {rows.length === 0 && (
              <div className="text-sm text-slate-600">
                No variations yet. Choose terms and click <i>Generate variations</i>.
              </div>
            )}
            {rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="p-2">Combination</th>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Regular</th>
                      <th className="p-2">Sale</th>
                      <th className="p-2">Manage</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Backorders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id ?? r.key} className="border-t">
                        <td className="p-2">{r.key}</td>
                        <td className="p-2">
                          <input
                            className="border rounded px-2 py-1 w-40"
                            value={r.sku}
                            onChange={(e) => editRow(i, { sku: e.target.value })}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            className="border rounded px-2 py-1 w-24"
                            value={r.regular_price}
                            onChange={(e) =>
                              editRow(i, { regular_price: e.target.value })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <input
                            className="border rounded px-2 py-1 w-24"
                            value={r.sale_price}
                            onChange={(e) =>
                              editRow(i, { sale_price: e.target.value })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={r.manage_stock}
                            onChange={(e) =>
                              editRow(i, { manage_stock: e.target.checked })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <input
                            className="border rounded px-2 py-1 w-20"
                            type="number"
                            min={0}
                            disabled={!rows[i].manage_stock}
                            value={r.stock_quantity}
                            onChange={(e) =>
                              editRow(i, {
                                stock_quantity:
                                  e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <select
                            className="border rounded px-2 py-1"
                            value={r.backorders}
                            onChange={(e) =>
                              editRow(i, { backorders: e.target.value as any })
                            }
                          >
                            <option value="no">No</option>
                            <option value="notify">Notify</option>
                            <option value="yes">Yes</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Grouped */}
      {ptype === "grouped" && (
        <section className="border rounded-lg p-4">
          <div className="font-medium mb-3">Group products</div>
          <div className="flex gap-2 mb-2">
            <input
              className="border rounded px-3 py-2 text-sm w-64"
              placeholder="Search by name or SKU"
              value={groupQuery}
              onChange={(e) => setGroupQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  doGroupSearch();
                }
              }}
            />
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={doGroupSearch}
            >
              Search
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="border rounded p-2">
              <div className="text-xs text-slate-500 mb-1">Results</div>
              {groupResults.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  className="block w-full text-left px-2 py-1 rounded hover:bg-gray-50"
                  onClick={() =>
                    setGroupSelected((s) => (s.includes(r.id) ? s : [...s, r.id]))
                  }
                >
                  {r.name}{" "}
                  <span className="text-xs text-slate-500">
                    ({r.sku || "no-sku"})
                  </span>
                </button>
              ))}
              {groupResults.length === 0 && (
                <div className="text-xs text-slate-500">No results.</div>
              )}
            </div>
            <div className="border rounded p-2">
              <div className="text-xs text-slate-500 mb-1">Selected</div>
              {groupSelected.map((gid) => (
                <div key={gid} className="flex items-center justify-between px-2 py-1">
                  <div>#{gid}</div>
                  <button
                    type="button"
                    className="text-xs text-red-600 underline"
                    onClick={() =>
                      setGroupSelected((s) => s.filter((x) => x !== gid))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              {groupSelected.length === 0 && (
                <div className="text-xs text-slate-500">None yet.</div>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Save changes to persist the group.
          </div>
        </section>
      )}
    </form>
  );
}
