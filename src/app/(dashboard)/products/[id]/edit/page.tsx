"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProductImages, { type ImgItem } from "@/components/ProductImages";

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

function skuPartFor(
  attrName: string | undefined,
  termName: string,
  termSlug?: string
) {
  if (!attrName) return (termSlug || termName).toLowerCase();
  const an = attrName.toLowerCase();
  if (an.includes("size")) return sizeSlugToShort(termSlug || termName);
  return (termSlug || termName).toLowerCase().replace(/\s+/g, "-");
}

function ReqLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-slate-700">
      {children}
    </label>
  );
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
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
  const [visibility, setVisibility] = useState<
    "visible" | "catalog" | "search" | "hidden"
  >("visible");
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

  const [taxStatus, setTaxStatus] = useState<
    "taxable" | "shipping" | "none"
  >("taxable");
  const [taxClass, setTaxClass] = useState("");

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
  const [varChosenTerms, setVarChosenTerms] = useState<
    Record<number, string[]>
  >({});
  const [rows, setRows] = useState<VRow[]>([]);

  const [groupSelected, setGroupSelected] = useState<number[]>([]);
  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState<
    { id: number; name: string; sku: string }[]
  >([]);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          setImages(
            (prod.images || []).slice(0, 5).map((im) => ({
              id: im.id,
              url: im.src,
            }))
          );
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
              const aid = a.id;
              if (!aid) continue;
              attrIds.push(aid);
              chosen[aid] = (a.options || []).slice();
            }

            setVarAttrRows(attrIds);
            setVarChosenTerms(chosen);

            await Promise.all(attrIds.map((aid) => loadTerms(aid)));

            const vr = await fetch(`/api/products/${prod.id}/variations`);
            const vj = await vr.json();
            if (vr.ok) {
              const loadedRows: VRow[] = (vj.variations || []).map((v: any) => ({
                id: v.id,
                key: (v.attributes || [])
                  .map((a: any) => `${a.name}=${a.option}`)
                  .join("|"),
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
            const ids = (prod.grouped_products || []).filter(
              (n): n is number => typeof n === "number"
            );
            setGroupSelected(ids);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
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
    const aid = Number(varChosenAttr);
    if (!varAttrRows.includes(aid)) {
      setVarAttrRows([...varAttrRows, aid]);
      loadTerms(aid);
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
      .map((aid) => ({
        id: aid,
        name: attrs.find((a) => a.id === aid)?.name,
        terms: varChosenTerms[aid] || [],
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
        for (const termName of a.terms) {
          next.push([...combo, { id: a.id, name: a.name, option: termName }]);
        }
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
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
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
        regular_price: ptype === "simple" ? regular || undefined : undefined,
        sale_price: ptype === "simple" ? sale || undefined : undefined,
        date_on_sale_from:
          ptype === "simple" ? saleFrom || undefined : undefined,
        date_on_sale_to:
          ptype === "simple" ? saleTo || undefined : undefined,
        manage_stock: ptype === "simple" ? manageStock : undefined,
        stock_quantity:
          ptype === "simple" && manageStock
            ? Number(stockQty || 0)
            : undefined,
        backorders: ptype === "simple" ? backorders : undefined,
        tax_status: taxStatus,
        tax_class: taxClass || undefined,
        weight: ptype !== "grouped" ? weight || undefined : undefined,
        dimensions:
          ptype !== "grouped" && (length || width || height)
            ? { length, width, height }
            : undefined,
        images: images.map((im, idx) => ({ id: im.id, position: idx })),
        categories: selectedCats.map((id) => ({ id })),
        tags: tagsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({ name })),
      };

      if (ptype === "variable") {
        basePayload.attributes = varAttrRows.map((aid) => ({
          id: aid,
          name: attrs.find((a) => a.id === aid)?.name,
          visible: true,
          variation: true,
          options: varChosenTerms[aid] || [],
        }));
      }

      if (ptype === "grouped") {
        basePayload.grouped_products = groupSelected;
      }

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
            variations: rows.map((row) => ({
              id: row.id,
              sku: row.sku || undefined,
              regular_price: row.regular_price || undefined,
              sale_price: row.sale_price || undefined,
              manage_stock: row.manage_stock,
              stock_quantity: row.manage_stock
                ? Number(row.stock_quantity || 0)
                : undefined,
              backorders: row.backorders,
              attributes: row.attrs,
            })),
          }),
        });

        const vj = await vr.json();
        if (!vr.ok) throw new Error(vj?.error || "Variations update failed");
      }

      setMsg("Saved.");
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="animate-pulse text-slate-500">Loading…</div>
      </main>
    );
  }

  if (!p) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="text-rose-700">Product not found.</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Edit product
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Update your product details, media, pricing, and variations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/products"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-violet-300 hover:text-violet-700"
          >
            Back to list
          </Link>

          <button
            type="button"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-violet-300 hover:text-violet-700"
            onClick={async (e) => {
              e.preventDefault();
              const r = await fetch(`/api/products/${p.id}/duplicate`, {
                method: "POST",
              });
              const j = await r.json();
              if (!r.ok) return alert(j?.error || "Duplicate failed");
              location.href = "/products";
            }}
          >
            Duplicate
          </button>

          <button
            type="button"
            className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm hover:bg-amber-100"
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
            className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm hover:bg-rose-100"
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
      </div>

      {msg && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-xs text-emerald-800 shadow-sm md:text-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
              <span className="text-base leading-none">✓</span>
            </div>
            <div>
              <div className="font-semibold">Changes saved</div>
              <p className="mt-0.5 text-[11px] md:text-xs">
                Your product has been updated successfully.
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

      <div className="rounded-3xl border border-slate-100 bg-white/80 shadow-sm shadow-indigo-100">
        <div className="border-b border-violet-50 bg-gradient-to-r from-[#f7f2ff] via-[#fef6ff] to-[#f5fbff] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-medium text-slate-600">
              Product type
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
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

        <form
          onSubmit={submit}
          onKeyDown={swallowEnter}
          className="space-y-8 p-4 md:p-6"
        >
          <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Basics</h2>

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
                  />
                </div>

                <div>
                  <ReqLabel>Status</ReqLabel>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
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
                    onChange={(e) => setVisibility(e.target.value as any)}
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

          {ptype === "simple" && (
            <>
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
                          onChange={(e) => setBackorders(e.target.value as any)}
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
            </>
          )}

          {ptype !== "grouped" && (
            <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
              <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">
                  Shipping
                </h2>

                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Weight
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="kg"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Length
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder="cm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Width
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder="cm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Height
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="cm"
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
                      onChange={(e) => setTaxStatus(e.target.value as any)}
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

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Product images
              </h2>
              <ProductImages value={images} onChange={setImages} max={5} />
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
                          .map((cid) => cats.find((c) => c.id === cid)?.name)
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
                  <ReqLabel>Tags (comma-separated)</ReqLabel>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. festive, saree, cotton"
                  />
                </div>
              </div>
            </div>
          </section>

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

                <div className="space-y-3">
                  {varAttrRows.map((aid) => (
                    <div
                      key={aid}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                    >
                      <div className="mb-2 text-xs font-semibold text-slate-800">
                        {attrs.find((a) => a.id === aid)?.name}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(termsMap[aid] || []).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleVarTerm(aid, t.name)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] ${
                              (varChosenTerms[aid] || []).includes(t.name)
                                ? "border-violet-400 bg-violet-500 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                            }`}
                            title={t.slug}
                          >
                            {t.name}
                          </button>
                        ))}

                        {!termsMap[aid] && (
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
                  <div className="text-xs text-slate-600">
                    No variations yet. Choose terms and click{" "}
                    <span className="font-semibold">Generate variations</span>.
                  </div>
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
                        {rows.map((row, i) => (
                          <tr
                            key={row.id ?? row.key}
                            className="border-t border-slate-100 bg-white"
                          >
                            <td className="px-3 py-2 text-slate-700">
                              {row.key}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-40 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-violet-400 focus:outline-none"
                                value={row.sku}
                                onChange={(e) =>
                                  editRow(i, { sku: e.target.value })
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-violet-400 focus:outline-none"
                                value={row.regular_price}
                                onChange={(e) =>
                                  editRow(i, {
                                    regular_price: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-violet-400 focus:outline-none"
                                value={row.sale_price}
                                onChange={(e) =>
                                  editRow(i, { sale_price: e.target.value })
                                }
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={row.manage_stock}
                                onChange={(e) =>
                                  editRow(i, {
                                    manage_stock: e.target.checked,
                                  })
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-violet-400 focus:outline-none disabled:opacity-40"
                                type="number"
                                min={0}
                                disabled={!rows[i].manage_stock}
                                value={row.stock_quantity}
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
                                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-violet-400 focus:outline-none"
                                value={row.backorders}
                                onChange={(e) =>
                                  editRow(i, {
                                    backorders: e.target.value as any,
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
                    <div className="text-[11px] text-slate-500">No results.</div>
                  )}
                </div>

                <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="text-[11px] font-medium text-slate-600">
                    Selected
                  </div>
                  {groupSelected.map((gid) => (
                    <div
                      key={gid}
                      className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-[11px]"
                    >
                      <div>#{gid}</div>
                      <button
                        type="button"
                        className="text-[10px] font-medium text-rose-500 hover:text-rose-600"
                        onClick={() =>
                          setGroupSelected((s) => s.filter((x) => x !== gid))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {groupSelected.length === 0 && (
                    <div className="text-[11px] text-slate-500">None yet.</div>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-500">
                Save changes to persist the group.
              </div>
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-3">
              {err && (
                <span className="text-xs font-medium text-rose-600">{err}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center rounded-full bg-gradient-to-r from-[#8b5cff] to-[#ff7ac3] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}