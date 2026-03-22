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
  Sparkles,
  Tag,
  Truck,
  Wallet,
  X,
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
    <label className="mb-2 block text-[13px] font-semibold tracking-[0.01em] text-slate-700">
      {children} <span className="text-rose-500">*</span>
    </label>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-[13px] font-semibold tracking-[0.01em] text-slate-700">
      {children}
    </label>
  );
}

function SectionCard(props: {
  title: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const { title, hint, icon: Icon, children, rightSlot } = props;

  return (
    <section className="overflow-visible rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#faf7ff] via-white to-[#f3f9ff] px-4 py-4 md:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-50 text-violet-700 shadow-sm">
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
                {title}
              </h2>
              {hint && <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>}
            </div>
          </div>

          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>
      </div>

      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

function FieldShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-[22px] border border-slate-200/80 bg-white p-3 shadow-sm shadow-slate-100",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function MobileField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm transition",
        "placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100",
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
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition",
        "placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100",
        props.className || "",
      ].join(" ")}
    />
  );
}

function MobileSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm transition",
        "focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100",
        props.className || "",
      ].join(" ")}
    />
  );
}

function ToggleCard(props: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  hint?: string;
}) {
  const { checked, onChange, title, hint } = props;

  return (
    <label
      className={[
        "flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3.5 transition",
        checked
          ? "border-violet-300 bg-violet-50/70"
          : "border-slate-200 bg-slate-50/70",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        {hint ? <div className="mt-0.5 text-xs text-slate-500">{hint}</div> : null}
      </div>

      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative h-7 w-12 shrink-0 rounded-full transition",
          checked ? "bg-violet-600" : "bg-slate-300",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked ? "left-6" : "left-1",
          ].join(" ")}
        />
      </button>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  );
}

function StepChip({
  index,
  label,
  active = false,
}: {
  index: number;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold",
        active
          ? "border-violet-300 bg-violet-50 text-violet-700"
          : "border-slate-200 bg-white text-slate-500",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
          active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600",
        ].join(" ")}
      >
        {index}
      </span>
      {label}
    </div>
  );
}

function MobileSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] md:hidden">
      <div
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 top-14 flex flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4 pb-28">{children}</div>
      </div>
    </div>
  );
}

export default function AddProductPage() {
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [skuErr, setSkuErr] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "publish">("publish");
  const [visibility, setVisibility] = useState<"visible" | "hidden">("visible");
  const [ptype, setPtype] = useState<ProductType>("simple");
  const [shortDesc, setShortDesc] = useState("");
  const [desc, setDesc] = useState("");

  const [images, setImages] = useState<ImgItem[]>([]);

  const [regular, setRegular] = useState("");
  const [sale, setSale] = useState("");
  const [saleFrom, setSaleFrom] = useState("");
  const [saleTo, setSaleTo] = useState("");
  const [enableSalePrice, setEnableSalePrice] = useState(false);

  const [manageStock, setManageStock] = useState(true);
  const [stockQty, setStockQty] = useState<number | "">("");
  const [backorders, setBackorders] = useState<"no" | "notify" | "yes">("no");

  const [enableTax, setEnableTax] = useState(false);
  const [taxStatus, setTaxStatus] = useState<"taxable" | "shipping" | "none">(
    "none"
  );
  const [taxClass, setTaxClass] = useState("");

  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [enableDimensions, setEnableDimensions] = useState(false);

  const [cats, setCats] = useState<Cat[]>([]);
  const flatCats = useMemo(() => indentCats(cats), [cats]);
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const [mobileTagOpen, setMobileTagOpen] = useState(false);

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
        key: attrsCombo.map((a) => `${a.name}=${a.option}`).join(" • "),
        attrs: attrsCombo,
        sku: autoSku,
        regular_price: "",
        sale_price: "",
        manage_stock: true,
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
        sale_price:
          ptype === "simple" && enableSalePrice ? sale || undefined : undefined,
        date_on_sale_from:
          ptype === "simple" && enableSalePrice ? saleFrom || undefined : undefined,
        date_on_sale_to:
          ptype === "simple" && enableSalePrice ? saleTo || undefined : undefined,

        manage_stock: ptype === "simple" ? manageStock : false,
        stock_quantity:
          ptype === "simple" && manageStock
            ? Number(stockQty || 0)
            : undefined,
        backorders: ptype === "simple" ? backorders : "no",

        tax_status: enableTax ? taxStatus : "none",
        tax_class: enableTax ? taxClass || undefined : undefined,

        weight: ptype !== "grouped" ? weight || undefined : undefined,
        dimensions:
          ptype !== "grouped" && enableDimensions && (length || width || height)
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
      setEnableSalePrice(false);
      setManageStock(true);
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
      setEnableDimensions(false);
      setTaxClass("");
      setTaxStatus("none");
      setEnableTax(false);
      setCatQuery("");
      setCatOpen(false);
      setMobileCatOpen(false);
      setMobileTagOpen(false);
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

  const selectedCatNames = selectedCats
    .map((id) => cats.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-10 md:pt-5">
      <MobileSheet
        open={mobileCatOpen}
        title="Select categories"
        onClose={() => setMobileCatOpen(false)}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              autoFocus
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              placeholder="Search category"
              value={catQuery}
              onChange={(e) => setCatQuery(e.target.value)}
            />
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white">
            <div className="max-h-[52vh] overflow-auto py-2">
              {filteredCats.map((c) => {
                const checked = selectedCats.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50"
                    style={{ paddingLeft: 16 + c.depth * 16 }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedCats((arr) =>
                          checked ? arr.filter((x) => x !== c.id) : [...arr, c.id]
                        )
                      }
                      className="h-4 w-4"
                    />
                    <span className="text-slate-700">{c.name}</span>
                  </label>
                );
              })}

              {filteredCats.length === 0 && (
                <div className="px-4 py-4 text-sm text-slate-500">No matches.</div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              onClick={() => setSelectedCats([])}
            >
              Clear
            </button>
            <button
              type="button"
              className="flex-1 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white"
              onClick={() => setMobileCatOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      </MobileSheet>

      <MobileSheet
        open={mobileTagOpen}
        title="Manage tags"
        onClose={() => setMobileTagOpen(false)}
      >
        <div className="space-y-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-3">
            <TagPicker value={tags} onChange={setTags} />
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white"
            onClick={() => setMobileTagOpen(false)}
          >
            Done
          </button>
        </div>
      </MobileSheet>

      <div className="mb-4 rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#faf6ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Products
              </Link>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  New product
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {ptype}
                </div>
              </div>

              <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
                Add product
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Create a polished product listing for your store.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-3 shadow-sm backdrop-blur">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Product type
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
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition",
                        active
                          ? "border-violet-500 bg-violet-600 text-white shadow-sm"
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

          <div className="flex flex-wrap gap-2">
            <StepChip index={1} label="Basic info" active />
            <StepChip index={2} label="Pricing & stock" active={ptype !== "grouped"} />
            <StepChip index={3} label="Media & categories" active />
            <StepChip index={4} label="Shipping & tax" active={ptype !== "grouped"} />
          </div>
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-[24px] border border-emerald-100 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold">Product created</div>
                <div className="mt-0.5 text-xs text-emerald-700">
                  Saved to your store. You can continue adding the next product.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
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
          <div className="grid gap-3 md:grid-cols-2">
            <FieldShell className="md:col-span-2">
              <ReqLabel>Title</ReqLabel>
              <MobileField
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter product title"
                required
              />
            </FieldShell>

            <FieldShell>
              <ReqLabel>SKU</ReqLabel>
              <MobileField
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Unique product code"
                required
              />
              {skuErr ? (
                <p className="mt-2 text-xs font-semibold text-rose-600">{skuErr}</p>
              ) : (
                <p className="mt-2 text-xs text-slate-400">
                  Use a unique code to identify this product.
                </p>
              )}
            </FieldShell>

            <FieldShell>
              <ReqLabel>Status</ReqLabel>
              <MobileSelect
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "publish")}
              >
                <option value="draft">Draft</option>
                <option value="publish">Published</option>
              </MobileSelect>
            </FieldShell>

            <FieldShell className="md:col-span-2">
              <ReqLabel>Visibility</ReqLabel>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["visible", "Visible"],
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
                        "rounded-2xl border px-3 py-3 text-sm font-semibold transition",
                        active
                          ? "border-violet-400 bg-violet-50 text-violet-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-violet-300",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </FieldShell>
          </div>
        </SectionCard>

        <SectionCard
          title="Descriptions"
          hint="Short summary and full product details"
          icon={Layers3}
        >
          <div className="grid gap-3">
            <FieldShell>
              <FieldLabel>Short description</FieldLabel>
              <MobileTextarea
                rows={4}
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                placeholder="Small summary shown in product highlights"
              />
            </FieldShell>

            <FieldShell>
              <FieldLabel>Description</FieldLabel>
              <MobileTextarea
                rows={7}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Detailed product description"
              />
            </FieldShell>
          </div>
        </SectionCard>

        {ptype === "simple" && (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <SectionCard
              title="Pricing"
              hint="Regular price, optional sale price and sale schedule"
              icon={Wallet}
            >
              <div className="space-y-3">
                <FieldShell>
                  <FieldLabel>Regular price</FieldLabel>
                  <MobileField
                    value={regular}
                    onChange={(e) => setRegular(e.target.value)}
                    placeholder="e.g. 999"
                  />
                </FieldShell>

                <ToggleCard
                  checked={enableSalePrice}
                  onChange={setEnableSalePrice}
                  title="Enable sale price"
                  hint="Show sale price and sale date fields"
                />

                {enableSalePrice && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <FieldShell>
                      <FieldLabel>Sale price</FieldLabel>
                      <MobileField
                        value={sale}
                        onChange={(e) => setSale(e.target.value)}
                        placeholder="e.g. 799"
                      />
                    </FieldShell>

                    <FieldShell>
                      <FieldLabel>Sale from</FieldLabel>
                      <MobileField
                        type="date"
                        value={saleFrom}
                        onChange={(e) => setSaleFrom(e.target.value)}
                      />
                    </FieldShell>

                    <FieldShell>
                      <FieldLabel>Sale to</FieldLabel>
                      <MobileField
                        type="date"
                        value={saleTo}
                        onChange={(e) => setSaleTo(e.target.value)}
                      />
                    </FieldShell>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Inventory"
              hint="Stock quantity and backorder rules"
              icon={Boxes}
            >
              <div className="space-y-3">
                <ToggleCard
                  checked={manageStock}
                  onChange={setManageStock}
                  title="Manage stock"
                  hint="Track inventory at product level"
                />

                {manageStock && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <FieldShell>
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
                    </FieldShell>

                    <FieldShell>
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
                    </FieldShell>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <SectionCard
            title="Product images"
            hint="Upload clean images. First image becomes thumbnail."
            icon={ImagePlus}
            rightSlot={
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {images.length}/5
              </div>
            }
          >
            <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-3">
              <ProductImages value={images} onChange={setImages} max={5} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Use clean front images first. Add detail images after that.
            </p>
          </SectionCard>

          <SectionCard
            title="Categorisation"
            hint="Assign categories and tags so products are easy to find"
            icon={Tag}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <FieldShell className="relative z-30">
                <ReqLabel>Categories</ReqLabel>

                <button
                  type="button"
                  onClick={() => setMobileCatOpen(true)}
                  className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-700 shadow-sm md:hidden"
                >
                  <span className="min-w-0 truncate">
                    {selectedCats.length === 0
                      ? "Select categories…"
                      : selectedCatNames.join(", ")}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                </button>

                <div className="hidden md:block">
                  <button
                    type="button"
                    className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-700 shadow-sm transition hover:border-violet-300"
                    onClick={() => setCatOpen((o) => !o)}
                  >
                    <span className="min-w-0 truncate">
                      {selectedCats.length === 0
                        ? "Select categories…"
                        : selectedCatNames.join(", ")}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                </div>

                {selectedCatNames.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedCatNames.map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}

                {catOpen && (
                  <div className="absolute left-0 right-0 top-full z-[100] mt-2 hidden overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl md:block xl:w-[440px]">
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
                            className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50"
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
                            <span className="text-slate-700">{c.name}</span>
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
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => setSelectedCats([])}
                      >
                        Clear
                      </button>

                      <button
                        type="button"
                        className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                        onClick={() => setCatOpen(false)}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </FieldShell>

              <FieldShell className="relative z-20">
                <FieldLabel>Tags</FieldLabel>

                <button
                  type="button"
                  onClick={() => setMobileTagOpen(true)}
                  className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-700 shadow-sm md:hidden"
                >
                  <span className="min-w-0 truncate">
                    {tags.length === 0 ? "Add tags…" : `${tags.length} tag(s) selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                </button>

                <div className="hidden md:block">
                  <TagPicker value={tags} onChange={setTags} />
                </div>

                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Press Enter to create new tags quickly.
                </p>
              </FieldShell>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <span className="font-semibold text-rose-500">*</span> Required fields
            </div>
          </SectionCard>
        </div>

        {ptype !== "grouped" && (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <SectionCard
              title="Shipping"
              hint="Weight first, dimensions only when needed"
              icon={Truck}
            >
              <div className="space-y-3">
                <FieldShell>
                  <FieldLabel>Weight (kg)</FieldLabel>
                  <MobileField
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0.50"
                  />
                </FieldShell>

                <ToggleCard
                  checked={enableDimensions}
                  onChange={setEnableDimensions}
                  title="Include dimensions"
                  hint="Show length, width and height fields"
                />

                {enableDimensions && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <FieldShell>
                      <FieldLabel>Length (cm)</FieldLabel>
                      <MobileField
                        value={length}
                        onChange={(e) => setLength(e.target.value)}
                        placeholder="10"
                      />
                    </FieldShell>

                    <FieldShell>
                      <FieldLabel>Width (cm)</FieldLabel>
                      <MobileField
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        placeholder="8"
                      />
                    </FieldShell>

                    <FieldShell>
                      <FieldLabel>Height (cm)</FieldLabel>
                      <MobileField
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="4"
                      />
                    </FieldShell>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Tax"
              hint="Enable only when this product needs tax settings"
              icon={Settings2}
            >
              <div className="space-y-3">
                <ToggleCard
                  checked={enableTax}
                  onChange={setEnableTax}
                  title="Enable tax"
                  hint="Show tax status and tax class fields"
                />

                {enableTax && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <FieldShell>
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
                    </FieldShell>

                    <FieldShell>
                      <FieldLabel>Tax class</FieldLabel>
                      <MobileField
                        value={taxClass}
                        onChange={(e) => setTaxClass(e.target.value)}
                        placeholder="Leave blank for standard"
                      />
                    </FieldShell>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {ptype === "variable" && (
          <>
            <SectionCard
              title="Variation attributes"
              hint="Choose attributes and terms to generate variation combinations"
              icon={Layers3}
            >
              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/60 p-3">
                <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
                  <MobileSelect
                    value={varChosenAttr}
                    onChange={(e) =>
                      setVarChosenAttr(e.target.value as unknown as number | "")
                    }
                    className="w-full md:w-[260px]"
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
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
                    onClick={addVarAttrRow}
                  >
                    Add attribute
                  </button>

                  <button
                    type="button"
                    className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                    onClick={generateVariations}
                  >
                    Generate variations
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {varAttrRows.length === 0 && (
                  <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No attributes added yet.
                  </div>
                )}

                {varAttrRows.map((id) => (
                  <div
                    key={id}
                    className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-800">
                        {attrs.find((a) => a.id === id)?.name}
                      </div>
                      <div className="text-xs font-medium text-slate-400">
                        {(varChosenTerms[id] || []).length} selected
                      </div>
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
                              "rounded-full border px-3 py-2 text-sm font-medium transition",
                              selected
                                ? "border-violet-400 bg-violet-600 text-white shadow-sm"
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
              rightSlot={
                rows.length > 0 ? (
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {rows.length} variations
                  </div>
                ) : null
              }
            >
              {rows.length === 0 && (
                <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No variations yet. Choose terms and tap Generate variations.
                </div>
              )}

              {rows.length > 0 && (
                <div className="space-y-3">
                  {rows.map((r, i) => (
                    <div
                      key={r.key}
                      className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm font-semibold text-slate-800">
                          {r.key}
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                          Variation {i + 1}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <FieldShell>
                          <FieldLabel>SKU</FieldLabel>
                          <MobileField
                            value={r.sku}
                            onChange={(e) =>
                              editRow(i, { sku: e.target.value })
                            }
                          />
                        </FieldShell>

                        <FieldShell>
                          <FieldLabel>Regular price</FieldLabel>
                          <MobileField
                            value={r.regular_price}
                            onChange={(e) =>
                              editRow(i, { regular_price: e.target.value })
                            }
                          />
                        </FieldShell>

                        <FieldShell>
                          <FieldLabel>Sale price</FieldLabel>
                          <MobileField
                            value={r.sale_price}
                            onChange={(e) =>
                              editRow(i, { sale_price: e.target.value })
                            }
                          />
                        </FieldShell>

                        <FieldShell>
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
                        </FieldShell>
                      </div>

                      <div className="mt-4 space-y-3">
                        <ToggleCard
                          checked={r.manage_stock}
                          onChange={(checked) =>
                            editRow(i, { manage_stock: checked })
                          }
                          title="Manage stock for this variation"
                        />

                        {r.manage_stock && (
                          <div className="md:max-w-[240px]">
                            <FieldShell>
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
                            </FieldShell>
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
            <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/60 p-3">
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
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
                  onClick={doGroupSearch}
                >
                  Search
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">
                  Results
                </div>

                <div className="space-y-2">
                  {groupResults.map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm shadow-sm transition hover:border-violet-300 hover:bg-slate-50"
                      onClick={() =>
                        setGroupSelected((s) => (s.includes(r.id) ? s : [...s, r.id]))
                      }
                    >
                      <span className="min-w-0 truncate font-medium text-slate-700">
                        {r.name}
                      </span>
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

              <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">
                  Selected
                </div>

                <div className="space-y-2">
                  {groupSelected.map((id) => {
                    const r = groupResults.find((x) => x.id === id);
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm"
                      >
                        <span className="min-w-0 truncate font-medium text-slate-700">
                          {r?.name || `#${id}`}
                        </span>
                        <button
                          type="button"
                          className="ml-3 shrink-0 text-xs font-semibold text-rose-600 hover:text-rose-700"
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

        <div className="sticky bottom-3 z-40 -mx-1 md:bottom-4 md:mx-0">
          <div className="rounded-[26px] border border-slate-200/90 bg-white/92 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-h-[20px]">
                {err ? (
                  <span className="text-sm font-semibold text-rose-600">{err}</span>
                ) : (
                  <span className="text-xs text-slate-500">
                    Review details and create product when ready.
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Link
                  href="/products"
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:flex-none"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={busy || !!skuErr}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-[#8b5cff] to-[#ff7ac3] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 md:min-w-[170px] md:flex-none"
                >
                  {busy ? "Creating…" : "Create product"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}