"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProductImages, { type ImgItem } from "@/components/ProductImages";
import TagPicker from "@/components/TagPicker";

type Cat = { id: number; name: string; parent: number };
type Attr = { id: number; name: string; slug: string };
type Term = { id: number; name: string; slug: string };
type ProductType = "simple" | "variable" | "grouped";

function indentCats(cats: Cat[]) {
  const byParent: Record<number, Cat[]> = {};
  cats.forEach((c) => {
    byParent[c.parent] ??= [];
    byParent[c.parent].push(c);
  });
  const out: (Cat & { depth: number })[] = [];
  function walk(parent: number, depth: number) {
    (byParent[parent] || [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((c) => {
        out.push({ ...c, depth });
        walk(c.id, depth + 1);
      });
  }
  walk(0, 0);
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

function skuPartFor(
  attrName: string | undefined,
  termName: string,
  termSlug?: string
) {
  if (!attrName) return (termSlug || termName).toLowerCase();
  const an = attrName.toLowerCase();
  if (an.includes("size")) {
    return sizeSlugToShort(termSlug || termName);
  }
  return (termSlug || termName).toLowerCase().replace(/\s+/g, "-");
}

function ReqLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-slate-700">
      {children} <span className="text-rose-500">*</span>
    </label>
  );
}

export default function AddProductPage() {
  // basics
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [skuErr, setSkuErr] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "publish">("draft");
  const [visibility, setVisibility] = useState<
    "visible" | "catalog" | "search" | "hidden"
  >("visible");
  const [ptype, setPtype] = useState<ProductType>("simple");
  const [shortDesc, setShortDesc] = useState("");
  const [desc, setDesc] = useState("");

  // images
  const [images, setImages] = useState<ImgItem[]>([]);

  // pricing
  const [regular, setRegular] = useState("");
  const [sale, setSale] = useState("");
  const [saleFrom, setSaleFrom] = useState("");
  const [saleTo, setSaleTo] = useState("");

  // inventory
  const [manageStock, setManageStock] = useState(false);
  const [stockQty, setStockQty] = useState<number | "">("");
  const [backorders, setBackorders] = useState<"no" | "notify" | "yes">("no");

  // tax
  const [taxStatus, setTaxStatus] = useState<
    "taxable" | "shipping" | "none"
  >("taxable");
  const [taxClass, setTaxClass] = useState("");

  // shipping
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  // categories
  const [cats, setCats] = useState<Cat[]>([]);
  const flatCats = useMemo(() => indentCats(cats), [cats]);
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const filteredCats = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    if (!q) return flatCats;
    return flatCats.filter((c) => c.name.toLowerCase().includes(q));
  }, [flatCats, catQuery]);

  // tags
  const [tags, setTags] = useState<string[]>([]);

  // attributes / variations
  const [attrs, setAttrs] = useState<Attr[]>([]);
  const [termsMap, setTermsMap] = useState<Record<number, Term[]>>({});
  const [varAttrRows, setVarAttrRows] = useState<number[]>([]);
  const [varChosenAttr, setVarChosenAttr] = useState<number | "">("");
  const [varChosenTerms, setVarChosenTerms] = useState<
    Record<number, string[]>
  >({});

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
  const [groupResults, setGroupResults] = useState<
    { id: number; name: string; sku: string }[]
  >([]);
  const [groupSelected, setGroupSelected] = useState<number[]>([]);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // load categories + attributes
  useEffect(() => {
    (async () => {
      try {
        const [catsRes, attrsRes] = await Promise.all([
          fetch("/api/categories/list"),
          fetch("/api/attributes/terms"),
        ]);
        const catsJson = await catsRes.json();
        const attrsJson = await attrsRes.json();
        if (catsRes.ok) setCats(catsJson.categories || []);
        if (attrsRes.ok) setAttrs(attrsJson.attributes || []);
      } catch {
        // ignore
      }
    })();
  }, []);

  // sku uniqueness
  useEffect(() => {
    setSkuErr(null);
    const skuTrim = sku.trim();
    if (!skuTrim) return;
    const t = setTimeout(async () => {
      const r = await fetch(
        `/api/products/sku-check?sku=${encodeURIComponent(skuTrim)}`
      );
      const j = await r.json();
      if (r.ok && j.exists) setSkuErr("SKU already exists");
    }, 350);
    return () => clearTimeout(t);
  }, [sku]);

  function swallowEnter(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter") e.preventDefault();
  }

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

  // cartesian product
  let combos: { id?: number; name?: string; option: string }[][] = [[]];
  for (const a of attrDefs) {
    const next: { id?: number; name?: string; option: string }[][] = [];
    for (const combo of combos) {
      for (const termName of a.terms) {
        next.push([...combo, { id: a.id, name: a.name, option: termName }]);
      }
    }
    combos = next;
  }

  // 🔧 Explicitly type as VRow[]
  const newRows: VRow[] = combos.map((attrsCombo): VRow => {
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
      stock_quantity: "" as VRow["stock_quantity"], // <= matches number | ""
      backorders: "no",
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
    if (!q) {
      setGroupResults([]);
      return;
    }
    const r = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
    const j = await r.json();
    if (r.ok) setGroupResults(j.results || []);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);

    try {
      if (!title.trim()) throw new Error("Title is required");
      if (!sku.trim()) throw new Error("SKU is required");
      if (skuErr) throw new Error(skuErr);

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
        date_on_sale_from:
          ptype === "simple" ? saleFrom || undefined : undefined,
        date_on_sale_to: ptype === "simple" ? saleTo || undefined : undefined,

        manage_stock: ptype === "simple" ? manageStock : false,
        stock_quantity:
          ptype === "simple" && manageStock
            ? Number(stockQty || 0)
            : undefined,
        backorders: ptype === "simple" ? backorders : "no",

        tax_status: taxStatus,
        tax_class: taxClass || undefined,

        weight: ptype !== "grouped" ? weight || undefined : undefined,
        dimensions:
          ptype !== "grouped" && (length || width || height)
            ? { length, width, height }
            : undefined,

        images: images.map((im, idx) => ({ id: im.id, position: idx })),
        categories: selectedCats,
        tags: tags.map((n) => ({ name: n })),
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

      if (ptype === "grouped") {
        basePayload.grouped_products = groupSelected;
      }

      const res = await fetch("/api/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });
      const parent = await res.json();
      if (!res.ok) throw new Error(parent?.error || "Create failed");

            if (ptype === "variable" && rows.length > 0) {
        const vRes = await fetch(
          `/api/products/${parent.id}/variations`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              variations: rows.map((r) => ({
                sku: r.sku || undefined,
                regular_price: r.regular_price || undefined,
                sale_price: r.sale_price || undefined,
                manage_stock: r.manage_stock,
                stock_quantity: r.manage_stock
                  ? Number(r.stock_quantity || 0)
                  : undefined,
                backorders: r.backorders,
                attributes: r.attrs,
              })),
            }),
          }
        );
        const vJson = await vRes.json();
        if (!vRes.ok) throw new Error(vJson?.error || "Variations failed");
      }

      // 🔼 scroll to top so success banner is visible
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      setMsg("Product created");

      // lite reset
      setTitle("");
      setSku("");
      setShortDesc("");
      setDesc("");
      setTags([]);
      setSelectedCats([]);
      setRegular("");
      setSale("");
      setSaleFrom("");
      setSaleTo("");
      setManageStock(false);
      setStockQty("");
      setBackorders("no");
      setVarAttrRows([]);
      setVarChosenTerms({});
      setRows([]);
      setGroupSelected([]);
      setImages([]);
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Add product
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Create a new product for your store.
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-violet-300 hover:text-violet-700"
        >
          Back to Products
        </Link>
      </div>

      {/* Success banner */}
      {msg && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-xs text-emerald-800 shadow-sm md:text-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
              <span className="text-base leading-none">✓</span>
            </div>
            <div>
              <div className="font-semibold">Product created</div>
              <p className="mt-0.5 text-[11px] md:text-xs">
                Saved to your store. Add another product or go back to the
                Products list.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900"
            onClick={() => setMsg(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Card wrapper */}
      <div className="rounded-3xl border border-slate-100 bg-white/80 shadow-sm shadow-indigo-100">
        {/* Top stripe with product type pills */}
        <div className="border-b border-violet-50 bg-gradient-to-r from-[#f7f2ff] via-[#fef6ff] to-[#f5fbff] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-medium text-slate-600">
              Product type <span className="text-rose-500">*</span>
            </div>
            <div
              className="flex flex-wrap gap-2 text-xs"
              role="radiogroup"
              aria-required="true"
            >
              {(["simple", "variable", "grouped"] as ProductType[]).map((t) => {
                const label = t[0].toUpperCase() + t.slice(1);
                const active = ptype === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPtype(t)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
                      active
                        ? "border-violet-400 bg-violet-500 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Form body */}
        <form
          onSubmit={submit}
          onKeyDown={swallowEnter}
          className="space-y-8 p-4 md:p-6"
        >
          {/* Essentials */}
          <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Essentials
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <ReqLabel>Title</ReqLabel>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-inner focus:border-violet-400 focus:outline-none"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <ReqLabel>SKU</ReqLabel>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-inner focus:border-violet-400 focus:outline-none"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    required
                  />
                  {skuErr && (
                    <p className="mt-1 text-[11px] text-rose-600">{skuErr}</p>
                  )}
                </div>
                <div>
                  <ReqLabel>Status</ReqLabel>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "draft" | "publish")
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="publish">Published</option>
                  </select>
                </div>
                <div>
                  <ReqLabel>Visibility</ReqLabel>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                    value={visibility}
                    onChange={(e) =>
                      setVisibility(
                        e.target.value as
                          | "visible"
                          | "catalog"
                          | "search"
                          | "hidden"
                      )
                    }
                  >
                    <option value="visible">Visible</option>
                    <option value="catalog">Catalog only</option>
                    <option value="search">Search only</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Descriptions
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Short description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-inner focus:border-violet-400 focus:outline-none"
                    value={shortDesc}
                    onChange={(e) => setShortDesc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    rows={5}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-inner focus:border-violet-400 focus:outline-none"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Pricing & Inventory */}
          {ptype === "simple" && (
            <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
              <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">
                  Pricing
                </h2>
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Regular price
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={regular}
                      onChange={(e) => setRegular(e.target.value)}
                      placeholder="e.g. 999"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Sale price
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={sale}
                      onChange={(e) => setSale(e.target.value)}
                      placeholder="e.g. 799"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Sale from
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={saleFrom}
                      onChange={(e) => setSaleFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Sale to
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={saleTo}
                      onChange={(e) => setSaleTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">
                  Inventory
                </h2>
                <label className="mb-2 inline-flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={manageStock}
                    onChange={(e) => setManageStock(e.target.checked)}
                  />
                  Manage stock at product level
                </label>
                {manageStock && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <ReqLabel>Quantity</ReqLabel>
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                        value={stockQty}
                        onChange={(e) =>
                          setStockQty(
                            e.target.value === ""
                              ? ""
                              : Number(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Backorders
                      </label>
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                        value={backorders}
                        onChange={(e) =>
                          setBackorders(
                            e.target.value as "no" | "notify" | "yes"
                          )
                        }
                      >
                        <option value="no">Do not allow</option>
                        <option value="notify">Allow, but notify</option>
                        <option value="yes">Allow</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Shipping & Tax */}
          {ptype !== "grouped" && (
            <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
              <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">
                  Shipping
                </h2>
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Weight (kg)
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Length (cm)
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Width (cm)
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Height (cm)
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Tax</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Tax status
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={taxStatus}
                      onChange={(e) =>
                        setTaxStatus(
                          e.target.value as "taxable" | "shipping" | "none"
                        )
                      }
                    >
                      <option value="taxable">Taxable</option>
                      <option value="shipping">Shipping only</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Tax class
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={taxClass}
                      onChange={(e) => setTaxClass(e.target.value)}
                      placeholder="Leave blank for standard"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Media & categories */}
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Product images
              </h2>
              <ProductImages value={images} onChange={setImages} max={5} />
              <p className="mt-1 text-[11px] text-slate-500">
                Upload up to 5 images. The first image will be used as the main
                thumbnail.
              </p>
            <p className="text-[11px] font-medium text-amber-600">
        
      </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Categorisation
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative">
                  <ReqLabel>Categories</ReqLabel>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 hover:border-violet-300 focus:outline-none"
                    onClick={() => setCatOpen((o) => !o)}
                  >
                    {selectedCats.length === 0 ? (
                      <span className="text-slate-400">
                        Select categories…
                      </span>
                    ) : (
                      <span className="truncate">
                        {selectedCats
                          .map((id) => cats.find((c) => c.id === id)?.name)
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">▾</span>
                  </button>
                  {catOpen && (
                    <div className="absolute z-20 mt-1 w-full rounded-2xl border border-slate-200 bg-white text-xs shadow-lg">
                      <div className="border-b px-2 py-1.5">
                        <input
                          autoFocus
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs focus:border-violet-400 focus:outline-none"
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
                              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50"
                              style={{ paddingLeft: 12 + c.depth * 14 }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedCats((arr) =>
                                    checked
                                      ? arr.filter((x) => x !== c.id)
                                      : [...arr, c.id]
                                  )
                                }
                              />
                              <span>{c.name}</span>
                            </label>
                          );
                        })}
                        {filteredCats.length === 0 && (
                          <div className="px-3 py-2 text-xs text-slate-500">
                            No matches.
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between gap-2 border-t px-2 py-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-3 py-1 text-[11px] hover:bg-slate-50"
                          onClick={() => setSelectedCats([])}
                        >
                          Clear all
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-violet-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-violet-600"
                          onClick={() => setCatOpen(false)}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Tags
                  </label>
                  <TagPicker value={tags} onChange={setTags} />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Start typing to select existing tags or press Enter to
                    create a new one.
                  </p>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                <span className="font-semibold text-rose-500">*</span> Required
                fields
              </p>
            </div>
          </section>

          {/* Variable products */}
          {ptype === "variable" && (
            <>
              <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">
                  Attributes for variations
                </h2>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-violet-400 focus:outline-none"
                    value={varChosenAttr}
                    onChange={(e) =>
                      setVarChosenAttr(e.target.value as unknown as number | "")
                    }
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
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:border-violet-300 hover:text-violet-700"
                    onClick={addVarAttrRow}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-violet-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
                    onClick={generateVariations}
                  >
                    Generate variations
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {varAttrRows.map((id) => (
                    <div
                      key={id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-800">
                          {attrs.find((a) => a.id === id)?.name}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(termsMap[id] || []).map((t) => {
                          const selected =
                            (varChosenTerms[id] || []).includes(t.name);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleVarTerm(id, t.name)}
                              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                                selected
                                  ? "border-violet-400 bg-violet-500 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                              }`}
                              title={t.slug}
                            >
                              {t.name}
                            </button>
                          );
                        })}
                        {!termsMap[id] && (
                          <span className="text-[11px] text-slate-500">
                            Loading…
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">
                  Variations
                </h2>
                {rows.length === 0 && (
                  <p className="text-xs text-slate-600">
                    No variations yet. Choose terms and click{" "}
                    <span className="font-semibold">
                      Generate variations
                    </span>
                    .
                  </p>
                )}
                {rows.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Combination</th>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Regular</th>
                          <th className="px-3 py-2">Sale</th>
                          <th className="px-3 py-2">Manage</th>
                          <th className="px-3 py-2">Qty</th>
                          <th className="px-3 py-2">Backorders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr
                            key={r.key}
                            className="border-t border-slate-100 bg-white"
                          >
                            <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                              {r.key}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-40 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-violet-400 focus:outline-none"
                                value={r.sku}
                                onChange={(e) =>
                                  editRow(i, { sku: e.target.value })
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-violet-400 focus:outline-none"
                                value={r.regular_price}
                                onChange={(e) =>
                                  editRow(i, {
                                    regular_price: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-violet-400 focus:outline-none"
                                value={r.sale_price}
                                onChange={(e) =>
                                  editRow(i, { sale_price: e.target.value })
                                }
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={r.manage_stock}
                                onChange={(e) =>
                                  editRow(i, {
                                    manage_stock: e.target.checked,
                                  })
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                disabled={!rows[i].manage_stock}
                                className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-violet-400 focus:outline-none disabled:opacity-40"
                                value={r.stock_quantity}
                                onChange={(e) =>
                                  editRow(i, {
                                    stock_quantity:
                                      e.target.value === ""
                                          ? ""
                                          : Number(e.target.value),
                                  })
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-violet-400 focus:outline-none"
                                value={r.backorders}
                                onChange={(e) =>
                                  editRow(i, {
                                    backorders:
                                      e.target.value as "no" | "notify" | "yes",
                                  })
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

          {/* Grouped products */}
          {ptype === "grouped" && (
            <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Group products
              </h2>
              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  className="w-64 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-violet-400 focus:outline-none"
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
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:border-violet-300 hover:text-violet-700"
                  onClick={doGroupSearch}
                >
                  Search
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="text-[11px] font-medium text-slate-600">
                    Results
                  </div>
                  {groupResults.map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      className="flex w-full items-center justify-between rounded-lg bg-white px-2 py-1.5 text-left text-[11px] hover:bg-slate-50"
                      onClick={() =>
                        setGroupSelected((s) =>
                          s.includes(r.id) ? s : [...s, r.id]
                        )
                      }
                    >
                      <span className="truncate">{r.name}</span>
                      <span className="ml-2 shrink-0 text-[10px] text-slate-400">
                        {r.sku || "no-sku"}
                      </span>
                    </button>
                  ))}
                  {groupResults.length === 0 && (
                    <div className="text-[11px] text-slate-500">
                      No results yet.
                    </div>
                  )}
                </div>
                <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="text-[11px] font-medium text-slate-600">
                    Selected
                  </div>
                  {groupSelected.map((id) => {
                    const r = groupResults.find((x) => x.id === id);
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-[11px]"
                      >
                        <span className="truncate">
                          {r?.name || `#${id}`}
                        </span>
                        <button
                          type="button"
                          className="ml-2 text-[10px] font-medium text-rose-500 hover:text-rose-600"
                          onClick={() =>
                            setGroupSelected((s) => s.filter((x) => x !== id))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                  {groupSelected.length === 0 && (
                    <div className="text-[11px] text-slate-500">
                      None selected yet.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Submit row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-3">
              {err && (
                <span className="text-xs font-medium text-rose-600">
                  {err}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={busy || !!skuErr}
              className="inline-flex items-center rounded-full bg-gradient-to-r from-[#8b5cff] to-[#ff7ac3] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create product"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );

  function editRow(i: number, patch: Partial<VRow>) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  }
}
