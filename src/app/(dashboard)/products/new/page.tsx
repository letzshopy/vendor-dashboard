"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  Check,
  ChevronDown,
  ImagePlus,
  Layers3,
  Package2,
  Search,
  Settings2,
  Tag,
  Truck,
  Wallet,
} from "lucide-react";
import ProductImages, { type ImgItem } from "@/components/ProductImages";
import TagPicker from "@/components/TagPicker";

type Cat = { id: number; name: string; parent: number };
type Attr = { id: number; name: string; slug: string };
type Term = { id: number; name: string; slug: string };
type ProductType = "simple" | "variable" | "grouped";

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
    <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
      {children} <span className="text-rose-500">*</span>
    </label>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
      {children}
    </label>
  );
}

function SectionCard(props: {
  title: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const { title, hint, icon: Icon, children } = props;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-sm shadow-slate-200/60">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#faf7ff] via-white to-[#f4fbff] px-4 py-4 md:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f2ebff] text-[#7a4cf0]">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

function MobileField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm",
        "placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100",
        props.className || "",
      ].join(" ")}
    />
  );
}

function MobileTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm",
        "placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100",
        props.className || "",
      ].join(" ")}
    />
  );
}

function MobileSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) {
  return (
    <select
      {...props}
      className={[
        "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm",
        "focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100",
        props.className || "",
      ].join(" ")}
    />
  );
}

export default function AddProductPage() {
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [skuErr, setSkuErr] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "publish">("publish");
  const [visibility, setVisibility] = useState<
    "visible" | "catalog" | "search" | "hidden"
  >("visible");
  const [ptype, setPtype] = useState<ProductType>("simple");
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

  const [taxStatus, setTaxStatus] = useState<"taxable" | "shipping" | "none">(
    "none"
  );
  const [taxClass, setTaxClass] = useState("");

  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

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

  const [tags, setTags] = useState<string[]>([]);

  const [attrs, setAttrs] = useState<Attr[]>([]);
  const [termsMap, setTermsMap] = useState<Record<number, Term[]>>({});
  const [varAttrRows, setVarAttrRows] = useState<number[]>([]);
  const [varChosenAttr, setVarChosenAttr] = useState<number | "">("");
  const [varChosenTerms, setVarChosenTerms] = useState<Record<number, string[]>>(
    {}
  );
  const [rows, setRows] = useState<VRow[]>([]);

  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState<
    { id: number; name: string; sku: string }[]
  >([]);
  const [groupSelected, setGroupSelected] = useState<number[]>([]);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(doGroupSearch, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupQuery]);

  function swallowEnter(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter") e.preventDefault();
  }

  async function loadTerms(attrId: number) {
    if (termsMap[attrId]) return;
    const r = await fetch(`/api/attributes/terms?id=${attrId}`);
    const j = await r.json();
    if (r.ok) {
      setTermsMap((m) => ({ ...m, [attrId]: j.terms || [] }));
    }
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

    const newRows: VRow[] = combos.map((attrsCombo): VRow => {
      const parts = attrsCombo.map((a) => {
        const term = a.id ? findTerm(a.id, a.option) : undefined;
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

    setRows(newRows);
  }

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

      const parentRaw = await res.text();
      let parent: any = {};
      try {
        parent = parentRaw ? JSON.parse(parentRaw) : {};
      } catch {
        parent = {};
      }

      if (!res.ok) {
        throw new Error(parent?.error || "Create failed");
      }

      if (!parent?.id) {
        throw new Error("Product created but ID missing");
      }

      if (ptype === "variable" && rows.length > 0) {
        const vRes = await fetch(`/api/products/${parent.id}/variations`, {
          method: "PUT",
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
        });

        const vRaw = await vRes.text();
        let vJson: any = {};
        try {
          vJson = vRaw ? JSON.parse(vRaw) : {};
        } catch {
          vJson = {};
        }

        if (!vRes.ok) {
          throw new Error(vJson?.error || "Variations failed");
        }
      }

      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      setMsg("Product created");

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
      setWeight("");
      setLength("");
      setWidth("");
      setHeight("");
      setTaxClass("");
      setTaxStatus("none");
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  function editRow(i: number, patch: Partial<VRow>) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 md:px-4 md:py-6">
      <div className="mb-4 rounded-[28px] border border-white/70 bg-gradient-to-br from-white via-[#faf6ff] to-[#eef7ff] p-4 shadow-sm shadow-slate-200/60 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <Link
              href="/products"
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Products
            </Link>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Add product
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Create a product with pricing, images, stock and categories in one
              clean flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["simple", "variable", "grouped"] as ProductType[]).map((t) => {
              const active = ptype === t;
              const label = t[0].toUpperCase() + t.slice(1);

              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPtype(t)}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                    active
                      ? "border-violet-400 bg-violet-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700",
                  ].join(" ")}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      active ? "bg-white" : "bg-slate-300"
                    }`}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold">Product created</div>
                <div className="mt-0.5 text-xs text-emerald-700">
                  Saved to your store. You can create another product now.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
              onClick={() => setMsg(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form onSubmit={submit} onKeyDown={swallowEnter} className="space-y-4 md:space-y-5">
        <SectionCard
          title="Essentials"
          hint="Basic product identity and publishing settings"
          icon={Package2}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <ReqLabel>Title</ReqLabel>
              <MobileField
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter product title"
                required
              />
            </div>

            <div>
              <ReqLabel>SKU</ReqLabel>
              <MobileField
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Unique product code"
                required
              />
              {skuErr && (
                <p className="mt-1.5 text-xs font-medium text-rose-600">
                  {skuErr}
                </p>
              )}
            </div>

            <div>
              <ReqLabel>Status</ReqLabel>
              <MobileSelect
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "publish")}
              >
                <option value="draft">Draft</option>
                <option value="publish">Published</option>
              </MobileSelect>
            </div>

            <div className="md:col-span-2">
              <ReqLabel>Visibility</ReqLabel>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {(
                  [
                    ["visible", "Visible"],
                    ["catalog", "Catalog only"],
                    ["search", "Search only"],
                    ["hidden", "Hidden"],
                  ] as const
                ).map(([value, label]) => {
                  const active = visibility === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setVisibility(value)}
                      className={[
                        "rounded-2xl border px-3 py-3 text-sm font-medium transition",
                        active
                          ? "border-violet-400 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-violet-300",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Descriptions"
          hint="Short summary and full product details"
          icon={Layers3}
        >
          <div className="grid gap-4">
            <div>
              <FieldLabel>Short description</FieldLabel>
              <MobileTextarea
                rows={4}
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                placeholder="Small summary shown in product highlights"
              />
            </div>

            <div>
              <FieldLabel>Description</FieldLabel>
              <MobileTextarea
                rows={7}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Detailed product description"
              />
            </div>
          </div>
        </SectionCard>

        {ptype === "simple" && (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <SectionCard
              title="Pricing"
              hint="Regular price, sale price and sale schedule"
              icon={Wallet}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <FieldLabel>Regular price</FieldLabel>
                  <MobileField
                    value={regular}
                    onChange={(e) => setRegular(e.target.value)}
                    placeholder="e.g. 999"
                  />
                </div>

                <div>
                  <FieldLabel>Sale price</FieldLabel>
                  <MobileField
                    value={sale}
                    onChange={(e) => setSale(e.target.value)}
                    placeholder="e.g. 799"
                  />
                </div>

                <div>
                  <FieldLabel>Sale from</FieldLabel>
                  <MobileField
                    type="date"
                    value={saleFrom}
                    onChange={(e) => setSaleFrom(e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Sale to</FieldLabel>
                  <MobileField
                    type="date"
                    value={saleTo}
                    onChange={(e) => setSaleTo(e.target.value)}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Inventory"
              hint="Stock quantity and backorder rules"
              icon={Boxes}
            >
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">
                      Manage stock
                    </div>
                    <div className="text-xs text-slate-500">
                      Track inventory at product level
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={manageStock}
                    onChange={(e) => setManageStock(e.target.checked)}
                    className="h-4 w-4"
                  />
                </label>

                {manageStock && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <ReqLabel>Quantity</ReqLabel>
                      <MobileField
                        type="number"
                        min={0}
                        value={stockQty}
                        onChange={(e) =>
                          setStockQty(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel>Backorders</FieldLabel>
                      <MobileSelect
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
                      </MobileSelect>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {ptype !== "grouped" && (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <SectionCard
              title="Shipping"
              hint="Weight and dimensions used for fulfilment"
              icon={Truck}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <FieldLabel>Weight (kg)</FieldLabel>
                  <MobileField
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0.50"
                  />
                </div>

                <div>
                  <FieldLabel>Length (cm)</FieldLabel>
                  <MobileField
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    placeholder="10"
                  />
                </div>

                <div>
                  <FieldLabel>Width (cm)</FieldLabel>
                  <MobileField
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="8"
                  />
                </div>

                <div>
                  <FieldLabel>Height (cm)</FieldLabel>
                  <MobileField
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="4"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Tax"
              hint="Tax status and class for this product"
              icon={Settings2}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Tax status</FieldLabel>
                  <MobileSelect
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
                  </MobileSelect>
                </div>

                <div>
                  <FieldLabel>Tax class</FieldLabel>
                  <MobileField
                    value={taxClass}
                    onChange={(e) => setTaxClass(e.target.value)}
                    placeholder="Leave blank for standard"
                  />
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <SectionCard
            title="Product images"
            hint="Upload clean images. First image becomes thumbnail."
            icon={ImagePlus}
          >
            <ProductImages value={images} onChange={setImages} max={5} />
            <p className="mt-3 text-xs text-slate-500">
              Use clear front images first. Add detail images after that.
            </p>
          </SectionCard>

          <SectionCard
            title="Categorisation"
            hint="Assign categories and tags so products are easy to find"
            icon={Tag}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <ReqLabel>Categories</ReqLabel>

                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-700 shadow-sm hover:border-violet-300"
                  onClick={() => setCatOpen((o) => !o)}
                >
                  <span className="min-w-0 truncate">
                    {selectedCats.length === 0
                      ? "Select categories…"
                      : selectedCats
                          .map((id) => cats.find((c) => c.id === id)?.name)
                          .filter(Boolean)
                          .join(", ")}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                </button>

                {catOpen && (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 p-3">
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                          autoFocus
                          className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                          placeholder="Search category"
                          value={catQuery}
                          onChange={(e) => setCatQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="max-h-72 overflow-auto py-2">
                      {filteredCats.map((c) => {
                        const checked = selectedCats.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50"
                            style={{ paddingLeft: 16 + c.depth * 18 }}
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
                              className="h-4 w-4"
                            />
                            <span>{c.name}</span>
                          </label>
                        );
                      })}

                      {filteredCats.length === 0 && (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          No matches.
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-3">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setSelectedCats([])}
                      >
                        Clear
                      </button>

                      <button
                        type="button"
                        className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                        onClick={() => setCatOpen(false)}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <FieldLabel>Tags</FieldLabel>
                <TagPicker value={tags} onChange={setTags} />
                <p className="mt-2 text-xs text-slate-500">
                  Press Enter to create new tags quickly.
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              <span className="font-semibold text-rose-500">*</span> Required
              fields
            </p>
          </SectionCard>
        </div>

        {ptype === "variable" && (
          <>
            <SectionCard
              title="Variation attributes"
              hint="Choose attributes and terms to generate variation combinations"
              icon={Layers3}
            >
              <div className="flex flex-wrap gap-2">
                <MobileSelect
                  value={varChosenAttr}
                  onChange={(e) =>
                    setVarChosenAttr(e.target.value as unknown as number | "")
                  }
                  className="w-full md:w-[240px]"
                >
                  <option value="">Select attribute…</option>
                  {attrs.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </MobileSelect>

                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-violet-300 hover:text-violet-700"
                  onClick={addVarAttrRow}
                >
                  Add attribute
                </button>

                <button
                  type="button"
                  className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                  onClick={generateVariations}
                >
                  Generate variations
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {varAttrRows.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No attributes added yet.
                  </div>
                )}

                {varAttrRows.map((id) => (
                  <div
                    key={id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="mb-3 text-sm font-semibold text-slate-800">
                      {attrs.find((a) => a.id === id)?.name}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(termsMap[id] || []).map((t) => {
                        const selected = (varChosenTerms[id] || []).includes(
                          t.name
                        );

                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleVarTerm(id, t.name)}
                            className={[
                              "rounded-full border px-3 py-1.5 text-sm transition",
                              selected
                                ? "border-violet-400 bg-violet-600 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-violet-300",
                            ].join(" ")}
                            title={t.slug}
                          >
                            {t.name}
                          </button>
                        );
                      })}

                      {!termsMap[id] && (
                        <span className="text-sm text-slate-500">Loading…</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Variations"
              hint="Edit price and stock for each generated combination"
              icon={Boxes}
            >
              {rows.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No variations yet. Choose terms and tap Generate variations.
                </div>
              )}

              {rows.length > 0 && (
                <div className="space-y-3">
                  {rows.map((r, i) => (
                    <div
                      key={r.key}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="mb-3 text-sm font-semibold text-slate-800">
                        {r.key}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <FieldLabel>SKU</FieldLabel>
                          <MobileField
                            value={r.sku}
                            onChange={(e) =>
                              editRow(i, { sku: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel>Regular price</FieldLabel>
                          <MobileField
                            value={r.regular_price}
                            onChange={(e) =>
                              editRow(i, { regular_price: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel>Sale price</FieldLabel>
                          <MobileField
                            value={r.sale_price}
                            onChange={(e) =>
                              editRow(i, { sale_price: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel>Backorders</FieldLabel>
                          <MobileSelect
                            value={r.backorders}
                            onChange={(e) =>
                              editRow(i, {
                                backorders: e.target.value as
                                  | "no"
                                  | "notify"
                                  | "yes",
                              })
                            }
                          >
                            <option value="no">Do not allow</option>
                            <option value="notify">Allow, but notify</option>
                            <option value="yes">Allow</option>
                          </MobileSelect>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              Manage stock for this variation
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={r.manage_stock}
                            onChange={(e) =>
                              editRow(i, { manage_stock: e.target.checked })
                            }
                            className="h-4 w-4"
                          />
                        </label>

                        {r.manage_stock && (
                          <div className="md:max-w-[220px]">
                            <FieldLabel>Quantity</FieldLabel>
                            <MobileField
                              type="number"
                              min={0}
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
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        )}

        {ptype === "grouped" && (
          <SectionCard
            title="Group products"
            hint="Search and select existing products to include in this grouped product"
            icon={Boxes}
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <MobileField
                  value={groupQuery}
                  onChange={(e) => setGroupQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      doGroupSearch();
                    }
                  }}
                  placeholder="Search by name or SKU"
                  className="pl-11"
                />
              </div>

              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-violet-300 hover:text-violet-700"
                onClick={doGroupSearch}
              >
                Search
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">
                  Results
                </div>

                <div className="space-y-2">
                  {groupResults.map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      className="flex w-full items-center justify-between rounded-2xl bg-white px-3 py-3 text-left text-sm shadow-sm hover:bg-slate-50"
                      onClick={() =>
                        setGroupSelected((s) => (s.includes(r.id) ? s : [...s, r.id]))
                      }
                    >
                      <span className="min-w-0 truncate">{r.name}</span>
                      <span className="ml-3 shrink-0 text-xs text-slate-400">
                        {r.sku || "no-sku"}
                      </span>
                    </button>
                  ))}

                  {groupResults.length === 0 && (
                    <div className="text-sm text-slate-500">No results yet.</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">
                  Selected
                </div>

                <div className="space-y-2">
                  {groupSelected.map((id) => {
                    const r = groupResults.find((x) => x.id === id);
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 text-sm shadow-sm"
                      >
                        <span className="min-w-0 truncate">
                          {r?.name || `#${id}`}
                        </span>
                        <button
                          type="button"
                          className="ml-3 shrink-0 text-xs font-medium text-rose-600 hover:text-rose-700"
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
                    <div className="text-sm text-slate-500">
                      None selected yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        <div className="app-sticky-actions -mx-3 mt-2 px-3 md:mx-0 md:px-0">
          <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-white/90 p-3 shadow-lg shadow-slate-200/70 backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="min-h-[20px]">
              {err && (
                <span className="text-sm font-medium text-rose-600">{err}</span>
              )}
            </div>

            <div className="flex gap-2">
              <Link
                href="/products"
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 md:flex-none"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={busy || !!skuErr}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-[#8b5cff] to-[#ff7ac3] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 md:flex-none"
              >
                {busy ? "Creating…" : "Create product"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}