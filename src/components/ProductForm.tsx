"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProductImages, { type ImgItem } from "@/components/ProductImages";

type Cat = { id: number; name: string; parent: number };
type Attr = { id: number; name: string; slug: string };
type Term = { id: number; name: string; slug: string };
type ProductType = "simple" | "variable" | "grouped";

type ShippingClasses = {
  freeClass:   { name: string; slug: string };
  weightClass: { name: string; slug: string };
};

export type ProductSeed = {
  id?: number;
  type?: ProductType;
  name?: string;
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
  tax_status?: "taxable" | "shipping" | "none";
  tax_class?: string;
  weight?: string | null;
  dimensions?: { length?: string; width?: string; height?: string } | null;
  categories?: { id: number; name: string }[];
  tags?: { id: number; name: string }[];
  images?: { id: number; src: string }[];
  // shipping
  shipping_class?: string;        // <-- NEW: slug (e.g. "free-shipping")
  shipping_class_id?: number;     // (we won’t need to send this; just show)
  // variable
  attributes?: { id?: number; name: string; options: string[]; variation: boolean; visible: boolean }[];
  // grouped
  grouped_products?: number[];
};

function indentCats(cats: Cat[]) {
  const byParent: Record<number, Cat[]> = {};
  cats.forEach((c) => { (byParent[c.parent] ??= []).push(c); });
  const out: (Cat & { depth: number })[] = [];
  (function walk(parent: number, depth: number) {
    (byParent[parent] || []).sort((a, b) => a.name.localeCompare(b.name)).forEach((c) => {
      out.push({ ...c, depth });
      walk(c.id, depth + 1);
    });
  })(0, 0);
  return out;
}

function sizeSlugToShort(slug: string) {
  const s = slug.toLowerCase();
  if (["s","small"].includes(s)) return "S";
  if (["m","medium"].includes(s)) return "M";
  if (["l","large"].includes(s)) return "L";
  if (["xl","extra-large","xlarge"].includes(s)) return "XL";
  if (["xxl","2xl","double-xl","xx-large"].includes(s)) return "XXL";
  if (["xs","xsmall","extra-small"].includes(s)) return "XS";
  if (["xxs","2xs"].includes(s)) return "XXS";
  return slug.replace(/\s+/g, "-");
}
function skuPartFor(attrName: string | undefined, termName: string, termSlug?: string) {
  if (!attrName) return (termSlug || termName).toLowerCase();
  const an = attrName.toLowerCase();
  if (an.includes("size")) return sizeSlugToShort(termSlug || termName);
  return (termSlug || termName).toLowerCase().replace(/\s+/g, "-");
}

export default function ProductForm({
  mode,
  initial,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial?: ProductSeed;
  onSubmit: (payload: any) => Promise<void>;
}) {
  // ----- basics -----
  const [title, setTitle] = useState(initial?.name || "");
  const [sku, setSku] = useState(initial?.sku || "");
  const [skuErr, setSkuErr] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "publish">(initial?.status || "draft");
  const [visibility, setVisibility] = useState<"visible" | "catalog" | "search" | "hidden">(initial?.catalog_visibility || "visible");
  const [ptype, setPtype] = useState<ProductType>(initial?.type || "simple");
  const [shortDesc, setShortDesc] = useState(initial?.short_description || "");
  const [desc, setDesc] = useState(initial?.description || "");
  // images
  const [images, setImages] = useState<ImgItem[]>(
    (initial?.images || []).slice(0, 5).map((im) => ({ id: im.id, url: im.src }))
  );

  // pricing
  const [regular, setRegular] = useState(initial?.regular_price || "");
  const [sale, setSale] = useState(initial?.sale_price || "");
  const [saleFrom, setSaleFrom] = useState((initial?.date_on_sale_from as any) || "");
  const [saleTo, setSaleTo] = useState((initial?.date_on_sale_to as any) || "");

  // inventory
  const [manageStock, setManageStock] = useState(!!initial?.manage_stock);
  const [stockQty, setStockQty] = useState<number | "">(initial?.manage_stock ? (initial?.stock_quantity ?? "") : "");
  const [backorders, setBackorders] = useState<"no" | "notify" | "yes">(initial?.backorders || "no");

  // tax
  const [taxStatus, setTaxStatus] = useState<"taxable" | "shipping" | "none">(initial?.tax_status || "taxable");
  const [taxClass, setTaxClass] = useState(initial?.tax_class || "");

  // shipping (hide for grouped)
  const [weight, setWeight] = useState(initial?.weight || "");
  const [length, setLength] = useState(initial?.dimensions?.length || "");
  const [width, setWidth] = useState(initial?.dimensions?.width || "");
  const [height, setHeight] = useState(initial?.dimensions?.height || "");

  // NEW: shipping class
  const [shipClasses, setShipClasses] = useState<ShippingClasses | null>(null);
  const [shippingClass, setShippingClass] = useState<string>(initial?.shipping_class || ""); // slug or ""

  // categories/tags
  const [cats, setCats] = useState<Cat[]>([]);
  const flatCats = useMemo(() => indentCats(cats), [cats]);
  const [selectedCats, setSelectedCats] = useState<number[]>((initial?.categories || []).map((c) => c.id));
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const filteredCats = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    if (!q) return flatCats;
    return flatCats.filter((c) => c.name.toLowerCase().includes(q));
  }, [flatCats, catQuery]);

  const [tagsInput, setTagsInput] = useState((initial?.tags || []).map((t) => t.name).join(", "));

  // attributes (variable)
  const [attrs, setAttrs] = useState<Attr[]>([]);
  const [termsMap, setTermsMap] = useState<Record<number, Term[]>>({});
  const [varAttrRows, setVarAttrRows] = useState<number[]>(
    (initial?.attributes || []).map((a) => (a.id ? a.id : -Math.random()))
  );
  const [varChosenAttr, setVarChosenAttr] = useState<number | "">("");
  const [varChosenTerms, setVarChosenTerms] = useState<Record<number, string[]>>(() => {
    const m: Record<number, string[]> = {};
    (initial?.attributes || []).forEach((a) => { if (a.id) m[a.id] = a.options || []; });
    return m;
  });

  type VRow = {
    key: string;
    attrs: { id?: number; name?: string; option: string }[];
    sku: string;
    regular_price: string;
    sale_price: string;
    manage_stock: boolean;
    stock_quantity: number | "";
    backorders: "no" | "notify" | "yes";
  };
  const [rows, setRows] = useState<VRow[]>([]);

  // grouped
  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState<{ id: number; name: string; sku: string }[]>([]);
  const [groupSelected, setGroupSelected] = useState<number[]>(initial?.grouped_products || []);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // load categories + attributes + shipping classes
  useEffect(() => {
    (async () => {
      try {
        const [catsRes, attrsRes, shipRes] = await Promise.all([
          fetch("/api/categories/list"),
          fetch("/api/attributes/terms"),
          fetch("/api/settings/shipping", { cache: "no-store" }),
        ]);
        const catsJson = await catsRes.json();
        const attrsJson = await attrsRes.json();
        const shipJson = await shipRes.json();
        if (catsRes.ok) setCats(catsJson.categories || []);
        if (attrsRes.ok) setAttrs(attrsJson.attributes || []);
        if (shipRes.ok && shipJson?.classes) setShipClasses(shipJson.classes);
      } catch {}
    })();
  }, []);

  // prefetch terms for preselected variable attributes
  useEffect(() => {
    (initial?.attributes || []).forEach((a) => { if (a.id) loadTerms(a.id); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SKU uniqueness (only in create mode)
  useEffect(() => {
    if (mode !== "create") return;
    setSkuErr(null);
    const skuTrim = sku.trim();
    if (!skuTrim) return;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/products/sku-check?sku=${encodeURIComponent(skuTrim)}`);
      const j = await r.json();
      if (r.ok && j.exists) setSkuErr("SKU already exists");
    }, 350);
    return () => clearTimeout(t);
  }, [sku, mode]);

  // swallow Enter
  function swallowEnter(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter") e.preventDefault();
  }

  // terms loading
  async function loadTerms(attrId: number) {
    if (termsMap[attrId]) return;
    const r = await fetch(`/api/attributes/terms?id=${attrId}`);
    const j = await r.json();
    if (r.ok) setTermsMap((m) => ({ ...m, [attrId]: j.terms || [] }));
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

  function findTerm(attrId: number, termName: string) {
    return (termsMap[attrId] || []).find((t) => t.name === termName);
  }

  function generateVariations() {
    const base = sku.trim();
    const attrDefs = varAttrRows
      .map((id) => ({ id, name: attrs.find((a) => a.id === id)?.name, terms: varChosenTerms[id] || [] }))
      .filter((a) => a.terms.length > 0);

    if (attrDefs.length === 0) { setRows([]); return; }

    let combos: { id?: number; name?: string; option: string }[][] = [[]];
    for (const a of attrDefs) {
      const next: any[] = [];
      for (const c of combos) for (const termName of a.terms) next.push([...c, { id: a.id, name: a.name, option: termName }]);
      combos = next;
    }

    const newRows = combos.map((attrsCombo) => {
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
        backorders: "no" as const,
      };
    });
    setRows(newRows);
  }

  // grouped search
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(doGroupSearch, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupQuery]);

  async function doGroupSearch() {
    const q = groupQuery.trim();
    if (!q) { setGroupResults([]); return; }
    const r = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
    const j = await r.json();
    if (r.ok) setGroupResults(j.results || []);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null); setErr(null);
    try {
      if (!sku.trim()) throw new Error("SKU is required");
      if (mode === "create" && skuErr) throw new Error(skuErr);

      const basePayload: any = {
        name: title,
        sku: sku.trim(),
        status,
        catalog_visibility: visibility,
        type: ptype,
        short_description: shortDesc,
        description: desc,
        regular_price: ptype === "simple" ? regular || undefined : undefined,
        sale_price: ptype === "simple" ? sale || undefined : undefined,
        date_on_sale_from: ptype === "simple" ? saleFrom || undefined : undefined,
        date_on_sale_to: ptype === "simple" ? saleTo || undefined : undefined,
        manage_stock: ptype === "simple" ? manageStock : false,
        stock_quantity: ptype === "simple" && manageStock ? Number(stockQty || 0) : undefined,
        backorders: ptype === "simple" ? backorders : "no",
        tax_status: taxStatus,
        tax_class: taxClass || undefined,
        weight: ptype !== "grouped" ? weight || undefined : undefined,
        dimensions: ptype !== "grouped" && (length || width || height) ? { length, width, height } : undefined,
        images: images.map((im, idx) => ({ id: im.id, position: idx })),
        categories: selectedCats,
        tags: tagsInput.split(",").map((s) => s.trim()).filter(Boolean),
        // NEW:
        shipping_class: shippingClass || undefined,
      };

      if (ptype === "variable") {
        basePayload.attributes = varAttrRows.map((id) => ({
          id,
          name: (attrs.find((a) => a.id === id)?.name) || "",
          visible: true,
          variation: true,
          options: varChosenTerms[id] || [],
        }));
      }
      if (ptype === "grouped") {
        basePayload.grouped_products = groupSelected;
      }

      await onSubmit(basePayload);

      setMsg(mode === "create" ? "Product created." : "Saved.");
      if (mode === "create") {
        setTitle(""); setSku(""); setShortDesc(""); setDesc(""); setTagsInput("");
        setSelectedCats([]); setRegular(""); setSale(""); setSaleFrom(""); setSaleTo("");
        setManageStock(false); setStockQty(""); setBackorders("no");
        setVarAttrRows([]); setVarChosenTerms({}); setRows([]); setGroupSelected([]);
        setImages([]); setShippingClass("");
      }
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  function editRow(i: number, patch: Partial<VRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <form onSubmit={submit} onKeyDown={(e)=>{ if (e.key==="Enter") e.preventDefault(); }} className="space-y-6">
      {/* Type */}
      <section className="border rounded-lg p-4">
        <div className="font-medium mb-3">Product Type</div>
        <div className="flex gap-3 text-sm">
          {(["simple","variable","grouped"] as ProductType[]).map((t) => (
            <label key={t}
              className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 cursor-pointer ${ptype===t ? "bg-blue-50 border-blue-300" : "bg-white hover:bg-gray-50"}`}>
              <input type="radio" name="ptype" value={t} checked={ptype===t} onChange={()=>setPtype(t)} />
              {t[0].toUpperCase()+t.slice(1)}
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
            <input className="w-full border rounded px-3 py-2 text-sm" value={title} onChange={(e)=>setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">SKU</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={sku} onChange={(e)=>setSku(e.target.value)} required />
            {mode==="create" && skuErr && <div className="text-xs text-red-700 mt-1">{skuErr}</div>}
          </div>
          <div>
            <label className="block text-sm mb-1">Status</label>
            <select className="w-full border rounded px-3 py-2 text-sm" value={status} onChange={(e)=>setStatus(e.target.value as any)}>
              <option value="draft">Draft</option>
              <option value="publish">Published</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Visibility</label>
            <select className="w-full border rounded px-3 py-2 text-sm" value={visibility} onChange={(e)=>setVisibility(e.target.value as any)}>
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
            <textarea className="w-full border rounded px-3 py-2 text-sm" rows={3} value={shortDesc} onChange={(e)=>setShortDesc(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea className="w-full border rounded px-3 py-2 text-sm" rows={6} value={desc} onChange={(e)=>setDesc(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Pricing (simple) */}
      {ptype==="simple" && (
        <section className="border rounded-lg p-4">
          <div className="font-medium mb-3">Pricing</div>
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-1">Regular price</label>
              <input className="w-full border rounded px-3 py-2 text-sm" value={regular} onChange={(e)=>setRegular(e.target.value)} placeholder="e.g. 999" />
            </div>
            <div>
              <label className="block text-sm mb-1">Sale price</label>
              <input className="w-full border rounded px-3 py-2 text-sm" value={sale} onChange={(e)=>setSale(e.target.value)} placeholder="e.g. 799" />
            </div>
            <div>
              <label className="block text-sm mb-1">Sale from</label>
              <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={saleFrom} onChange={(e)=>setSaleFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Sale to</label>
              <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={saleTo} onChange={(e)=>setSaleTo(e.target.value)} />
            </div>
          </div>
        </section>
      )}

      {/* Inventory (simple) */}
      {ptype==="simple" && (
        <section className="border rounded-lg p-4">
          <div className="font-medium mb-3">Inventory</div>
          <label className="inline-flex items-center gap-2 text-sm mb-3">
            <input type="checkbox" checked={manageStock} onChange={(e)=>setManageStock(e.target.checked)} />
            Manage stock?
          </label>
          {manageStock && (
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-1">Quantity</label>
                <input className="w-full border rounded px-3 py-2 text-sm" type="number" min={0}
                  value={stockQty} onChange={(e)=>setStockQty(e.target.value===""? "": Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm mb-1">Backorders</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={backorders} onChange={(e)=>setBackorders(e.target.value as any)}>
                  <option value="no">Do not allow</option>
                  <option value="notify">Allow, but notify</option>
                  <option value="yes">Allow</option>
                </select>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Shipping (not grouped) */}
      {ptype!=="grouped" && (
        <section className="border rounded-lg p-4">
          <div className="font-medium mb-3">Shipping</div>
          <div className="grid sm:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm mb-1">Weight</label>
              <input className="w-full border rounded px-3 py-2 text-sm" value={weight} onChange={(e)=>setWeight(e.target.value)} placeholder="kg" />
            </div>
            <div>
              <label className="block text-sm mb-1">Length</label>
              <input className="w-full border rounded px-3 py-2 text-sm" value={length} onChange={(e)=>setLength(e.target.value)} placeholder="cm" />
            </div>
            <div>
              <label className="block text-sm mb-1">Width</label>
              <input className="w-full border rounded px-3 py-2 text-sm" value={width} onChange={(e)=>setWidth(e.target.value)} placeholder="cm" />
            </div>
            <div>
              <label className="block text-sm mb-1">Height</label>
              <input className="w-full border rounded px-3 py-2 text-sm" value={height} onChange={(e)=>setHeight(e.target.value)} placeholder="cm" />
            </div>

            {/* NEW: Shipping class dropdown */}
            <div>
              <label className="block text-sm mb-1">Shipping class</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={shippingClass}
                onChange={(e)=>setShippingClass(e.target.value)}
              >
                <option value="">— None —</option>
                {shipClasses?.freeClass && (
                  <option value={shipClasses.freeClass.slug}>{shipClasses.freeClass.name}</option>
                )}
                {shipClasses?.weightClass && (
                  <option value={shipClasses.weightClass.slug}>{shipClasses.weightClass.name}</option>
                )}
              </select>
              {initial?.shipping_class_id ? (
                <div className="text-[11px] text-slate-500 mt-1">Current class ID: {initial.shipping_class_id}</div>
              ) : null}
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
            <button type="button" className="w-full border rounded px-3 py-2 text-sm text-left" onClick={()=>setCatOpen((o)=>!o)}>
              {selectedCats.length === 0 ? <span className="text-slate-500">Select categories…</span>
              : <span>{selectedCats.map((id)=>cats.find((c)=>c.id===id)?.name).filter(Boolean).join(", ")}</span>}
            </button>
            {catOpen && (
              <div className="absolute z-10 mt-1 w-full border rounded bg-white shadow">
                <div className="p-2 border-b">
                  <input autoFocus className="w-full border rounded px-2 py-1 text-sm" placeholder="Search…" value={catQuery} onChange={(e)=>setCatQuery(e.target.value)} />
                </div>
                <div className="max-h-64 overflow-auto py-1">
                  {filteredCats.map((c)=> {
                    const checked = selectedCats.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 px-3 py-1 text-sm hover:bg-gray-50 cursor-pointer" style={{ paddingLeft: 12 + c.depth * 14 }}>
                        <input type="checkbox" checked={checked} onChange={()=>setSelectedCats((arr)=> checked ? arr.filter((x)=>x!==c.id) : [...arr, c.id])} />
                        <span>{c.name}</span>
                      </label>
                    );
                  })}
                  {filteredCats.length===0 && <div className="px-3 py-2 text-sm text-slate-500">No matches.</div>}
                </div>
                <div className="flex justify-end gap-2 p-2 border-t">
                  <button type="button" className="text-sm px-3 py-1 rounded border" onClick={()=>setCatOpen(false)}>Done</button>
                  <button type="button" className="text-sm px-3 py-1 rounded border" onClick={()=>{ setSelectedCats([]); setCatOpen(false); }}>Clear</button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">Tags (comma-separated)</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={tagsInput} onChange={(e)=>setTagsInput(e.target.value)} placeholder="e.g. festive, saree, cotton" />
          </div>
        </div>
      </section>

      {/* Variable product: attributes + variations */}
      {ptype==="variable" && (
        <>
          <section className="border rounded-lg p-4">
            <div className="font-medium mb-3">Attributes for variations</div>
            <div className="flex gap-2 mb-3">
              <select className="border rounded px-3 py-2 text-sm" value={varChosenAttr} onChange={(e)=>setVarChosenAttr(e.target.value as any)}>
                <option value="">Select attribute…</option>
                {attrs.map((a)=> <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button type="button" className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={addVarAttrRow}>Add</button>
              <button type="button" className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={generateVariations}>Generate variations</button>
            </div>

            <div className="space-y-3">
              {varAttrRows.map((id)=> (
                <div key={id} className="border rounded p-3">
                  <div className="font-medium mb-2">{attrs.find((a)=>a.id===id)?.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {(termsMap[id] || []).map((t)=> (
                      <button key={t.id} type="button"
                        onClick={()=>toggleVarTerm(id, t.name)}
                        className={`text-xs rounded border px-2 py-1 ${ (varChosenTerms[id]||[]).includes(t.name) ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white hover:bg-gray-50" }`}
                        title={t.slug}
                      >
                        {t.name}{t.slug ? <span className="ml-1 text-slate-500">({t.slug})</span> : null}
                      </button>
                    ))}
                    {!termsMap[id] && <span className="text-xs text-slate-500">Loading…</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border rounded-lg p-4">
            <div className="font-medium mb-3">Variations</div>
            {rows.length === 0 && <div className="text-sm text-slate-600">No variations yet. Choose terms and click <i>Generate variations</i>.</div>}
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
                    {rows.map((r, i)=> (
                      <tr key={r.key} className="border-t">
                        <td className="p-2">{r.key}</td>
                        <td className="p-2">
                          <input className="border rounded px-2 py-1 w-40" value={r.sku} onChange={(e)=>editRow(i,{ sku: e.target.value })} />
                        </td>
                        <td className="p-2">
                          <input className="border rounded px-2 py-1 w-24" value={r.regular_price} onChange={(e)=>editRow(i,{ regular_price: e.target.value })} />
                        </td>
                        <td className="p-2">
                          <input className="border rounded px-2 py-1 w-24" value={r.sale_price} onChange={(e)=>editRow(i,{ sale_price: e.target.value })} />
                        </td>
                        <td className="p-2">
                          <input type="checkbox" checked={r.manage_stock} onChange={(e)=>editRow(i,{ manage_stock: e.target.checked })} />
                        </td>
                        <td className="p-2">
                          <input className="border rounded px-2 py-1 w-20" type="number" min={0}
                            disabled={!rows[i].manage_stock} value={r.stock_quantity}
                            onChange={(e)=>editRow(i,{ stock_quantity: e.target.value==="" ? "" : Number(e.target.value) })} />
                        </td>
                        <td className="p-2">
                          <select className="border rounded px-2 py-1" value={r.backorders} onChange={(e)=>editRow(i,{ backorders: e.target.value as any })}>
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
      {ptype==="grouped" && (
        <section className="border rounded-lg p-4">
          <div className="font-medium mb-3">Group products</div>
          <div className="flex gap-2 mb-2">
            <input className="border rounded px-3 py-2 text-sm w-64" placeholder="Search by name or SKU"
              value={groupQuery} onChange={(e)=>setGroupQuery(e.target.value)}
              onKeyDown={(e)=>{ if (e.key==="Enter") { e.preventDefault(); doGroupSearch(); }}} />
            <button type="button" className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={doGroupSearch}>Search</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="border rounded p-2">
              <div className="text-xs text-slate-500 mb-1">Results</div>
              {groupResults.map((r)=> (
                <button key={r.id} type="button" className="block w-full text-left px-2 py-1 rounded hover:bg-gray-50"
                  onClick={()=> setGroupSelected((s)=> s.includes(r.id) ? s : [...s, r.id])}>
                  {r.name} <span className="text-xs text-slate-500">({r.sku || "no-sku"})</span>
                </button>
              ))}
              {groupResults.length===0 && <div className="text-xs text-slate-500">No results.</div>}
            </div>
            <div className="border rounded p-2">
              <div className="text-xs text-slate-500 mb-1">Selected</div>
              {groupSelected.map((id)=> (
                <div key={id} className="flex items-center justify-between px-2 py-1">
                  <div>#{id}</div>
                  <button type="button" className="text-xs text-red-600 underline" onClick={()=> setGroupSelected((s)=> s.filter((x)=>x!==id))}>Remove</button>
                </div>
              ))}
              {groupSelected.length===0 && <div className="text-xs text-slate-500">None yet.</div>}
            </div>
          </div>
        </section>
      )}

      <div>
        <button type="submit" disabled={busy || (mode==="create" && !!skuErr)} className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
          {busy ? (mode==="create" ? "Creating…" : "Saving…") : (mode==="create" ? "Create product" : "Save changes")}
        </button>
        {msg && <span className="ml-3 text-green-700 text-sm">{msg}</span>}
        {err && <span className="ml-3 text-red-700 text-sm">{err}</span>}
      </div>
    </form>
  );
}
