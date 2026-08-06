"use client";

import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import LocalProductImages, { type ImgItem } from "@/components/LocalProductImages";
import TagPicker from "@/components/TagPicker";

type Cat = { id: number; name: string; parent: number };
type Attr = { id: number; name: string; slug: string };
type Term = { id: number; name: string; slug: string };

type ProductType = "simple" | "variable" | "grouped";
type Backorders = "no" | "notify" | "yes";
type JsonRecord = Record<string, unknown>;

type ProductImage = {
  id?: unknown;
  src?: unknown;
  url?: unknown;
};

type VariationGalleryImage = {
  id?: unknown;
  url?: unknown;
  thumbnail?: unknown;
};

function isColourAttribute(
  attribute: {
    name?: string;
    slug?: string;
  }
): boolean {
  const identity = [
    attribute.name || "",
    attribute.slug || "",
  ]
    .join(" ")
    .toLowerCase();

  return (
    identity.includes("colour") ||
    identity.includes("color")
  );
}

function variationGalleriesFromResponse(
  value: unknown
): Record<number, ImgItem[]> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.galleries)
  ) {
    return {};
  }

  const galleries: Record<number, ImgItem[]> = {};

  for (const entry of value.galleries) {
    if (!isRecord(entry)) continue;

    const variationId = Number(
      entry.variation_id
    );

    if (
      !Number.isSafeInteger(variationId) ||
      variationId <= 0 ||
      !Array.isArray(entry.images)
    ) {
      continue;
    }

    galleries[variationId] =
      entry.images
        .flatMap((item): ImgItem[] => {
          if (!isRecord(item)) return [];

          const image =
            item as VariationGalleryImage;
          const id = Number(image.id);
          const url =
            typeof image.thumbnail === "string"
              ? image.thumbnail
              : typeof image.url === "string"
                ? image.url
                : "";

          return Number.isSafeInteger(id) &&
            id > 0 &&
            url
            ? [{ id, url }]
            : [];
        })
        .slice(0, 3);
  }

  return galleries;
}

function productImagePayload(
  items: Array<{ id?: unknown }>
): Array<{ id: number; position: number }> {
  return items
    .map((item) => Number(item.id))
    .filter((id) => Number.isSafeInteger(id) && id > 0)
    .map((id, position) => ({ id, position }));
}

function productImagesFromResponse(product: {
  images?: Array<ProductImage | string>;
  image_objects?: ProductImage[];
}): ImgItem[] {
  const source =
    Array.isArray(product.image_objects) && product.image_objects.length > 0
      ? product.image_objects
      : product.images;

  if (!Array.isArray(source)) return [];

  return source
    .flatMap((item): ImgItem[] => {
      if (!isRecord(item)) return [];

      const id = Number(item.id);
      const url =
        typeof item.src === "string"
          ? item.src
          : typeof item.url === "string"
            ? item.url
            : "";

      return Number.isSafeInteger(id) && id > 0 && url
        ? [{ id, url }]
        : [];
    })
    .slice(0, 5);
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function normalizeBackorders(value: unknown): Backorders {
  return value === "notify" || value === "yes" ? value : "no";
}

function variationKey(
  attrs: { id?: number; name?: string; option: string }[]
): string {
  return attrs
    .map((attribute) => {
      const identity =
        attribute.id && attribute.id > 0
          ? String(attribute.id)
          : attribute.name || "attribute";

      return `${identity}=${attribute.option}`;
    })
    .join("|");
}

function variationLabel(
  attrs: { id?: number; name?: string; option: string }[]
): string {
  return attrs
    .map(
      (attribute) =>
        `${attribute.name || "Option"}: ${attribute.option}`
    )
    .join(" / ");
}

function variationImage(value: unknown): ImgItem | null {
  if (!isRecord(value)) return null;

  const id = Number(value.id);
  const url =
    typeof value.src === "string"
      ? value.src
      : typeof value.url === "string"
        ? value.url
        : "";

  return Number.isSafeInteger(id) && id > 0 && url
    ? { id, url }
    : null;
}

function variationRowFromValue(value: unknown): VRow | null {
  if (!isRecord(value)) return null;

  const attrs = Array.isArray(value.attributes)
    ? value.attributes.flatMap((attribute) => {
        const item = isRecord(attribute) ? attribute : {};
        const option =
          typeof item.option === "string"
            ? item.option
            : "";

        if (!option) return [];

        const attrId = Number(item.id);

        return [
          {
            id:
              Number.isSafeInteger(attrId) && attrId > 0
                ? attrId
                : undefined,
            name:
              typeof item.name === "string"
                ? item.name
                : undefined,
            option,
          },
        ];
      })
    : [];

  if (attrs.length === 0) return null;

  const variationId = Number(value.id);
  const managesStock = value.manage_stock === true;
  const quantity = Number(value.stock_quantity);

  return {
    id:
      Number.isSafeInteger(variationId) && variationId > 0
        ? variationId
        : undefined,
    key: variationKey(attrs),
    attrs,
    sku: typeof value.sku === "string" ? value.sku : "",
    regular_price:
      typeof value.regular_price === "string"
        ? value.regular_price
        : "",
    manage_stock: managesStock,
    stock_quantity:
      managesStock && Number.isFinite(quantity)
        ? quantity
        : "",
    backorders: normalizeBackorders(value.backorders),
    image: variationImage(value.image),
  };
}

type Prod = {
  id: number;
  name: string;
  type: ProductType | string;
  sku?: string;
  color?: string;
  status?: "draft" | "publish";
  catalog_visibility?: "visible" | "catalog" | "search" | "hidden";
  short_description?: string;
  description?: string;
  regular_price?: string;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  backorders?: Backorders;
  weight?: string | null;
  dimensions?: { length?: string; width?: string; height?: string } | null;
  categories?: { id: number; name: string }[];
  tags?: { id: number; name: string }[];
  images?: Array<ProductImage | string>;
  image_objects?: ProductImage[];
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
  manage_stock: boolean;
  stock_quantity: number | "";
  backorders: Backorders;
  image: ImgItem | null;
};

function rowUsesColourGallery(
  row: VRow
): boolean {
  return row.attrs.some((attribute) =>
    isColourAttribute(attribute)
  );
}

function rowGalleryImages(
  row: VRow,
  galleries: Record<string, ImgItem[]>
): ImgItem[] {
  const gallery = galleries[row.key];

  if (Array.isArray(gallery)) {
    return gallery.slice(0, 3);
  }

  return row.image ? [row.image] : [];
}

function uniqueImages(
  items: ImgItem[],
  max: number
): ImgItem[] {
  const seen = new Set<number>();

  return items
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, max);
}

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
  const [color, setColor] = useState("");
  const [status, setStatus] = useState<"draft" | "publish">("publish");
  const [visibility, setVisibility] = useState<
    "visible" | "catalog" | "search" | "hidden"
  >("visible");
  const [shortDesc, setShortDesc] = useState("");
  const [desc, setDesc] = useState("");

  const [images, setImages] = useState<ImgItem[]>([]);

  const [regular, setRegular] = useState("");

  const [manageStock, setManageStock] = useState(false);
  const [stockQty, setStockQty] = useState<number | "">("");
  const [backorders, setBackorders] = useState<"no" | "notify" | "yes">("no");

  const [taxStatus, setTaxStatus] = useState<
    "taxable" | "shipping" | "none"
  >("none");
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

  const [tags, setTags] = useState<string[]>([]);

  const [varAttrRows, setVarAttrRows] = useState<number[]>([]);
  const [varChosenAttr, setVarChosenAttr] = useState<number | "">("");
  const [varChosenTerms, setVarChosenTerms] = useState<
    Record<number, string[]>
  >({});
  const [rows, setRows] = useState<VRow[]>([]);
  const [removedVariationIds, setRemovedVariationIds] =
    useState<number[]>([]);
  const [variationGalleries, setVariationGalleries] =
    useState<Record<string, ImgItem[]>>({});
  const [variationGalleryError, setVariationGalleryError] =
    useState<string | null>(null);
  const [dirtyVariationGalleryKeys, setDirtyVariationGalleryKeys] =
    useState<string[]>([]);
  const colourVariationProduct = useMemo(
    () =>
      ptype === "variable" &&
      rows.some(rowUsesColourGallery),
    [ptype, rows]
  );

  const [groupSelected, setGroupSelected] = useState<number[]>([]);
  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState<
    { id: number; name: string; sku: string }[]
  >([]);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMessageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!msg) return;

    const frame = requestAnimationFrame(() => {
      saveMessageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [msg]);

  const loadTerms = useCallback(async (attrId: number) => {
    const response = await fetch(
      `/api/attributes/terms?id=${attrId}`
    );
    const parsed: unknown = await response
      .json()
      .catch(() => ({}));

    if (
      !response.ok ||
      !isRecord(parsed) ||
      !Array.isArray(parsed.terms)
    ) {
      return;
    }

    setTermsMap((current) =>
      current[attrId]
        ? current
        : {
            ...current,
            [attrId]: parsed.terms as Term[],
          }
    );
  }, []);

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
          setColor(prod.color || "");
          setStatus(prod.status || "draft");
          setVisibility(prod.catalog_visibility || "visible");
          setShortDesc(prod.short_description || "");
          setDesc(prod.description || "");
          setImages(productImagesFromResponse(prod));
          setSelectedCats((prod.categories || []).map((c) => c.id));
          setTags((prod.tags || []).map((tag) => tag.name));

          if (prod.type === "simple") {
            setRegular(prod.regular_price || "");
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
            const parsed: unknown = await vr.json();
            if (vr.ok) {
              const variations =
                isRecord(parsed) && Array.isArray(parsed.variations)
                  ? parsed.variations
                  : [];

              const loadedRows = variations.flatMap((value) => {
                const row = variationRowFromValue(value);
                return row ? [row] : [];
              });

              setRows(loadedRows);
              setRemovedVariationIds([]);

              const colourProduct =
                varAttrs.some((attribute) =>
                  isColourAttribute(attribute)
                );

              if (colourProduct) {
                const galleryResponse =
                  await fetch(
                    `/api/products/${prod.id}/variation-galleries`
                  );
                const galleryJson: unknown =
                  await galleryResponse
                    .json()
                    .catch(() => ({}));

                if (galleryResponse.ok) {
                  const galleriesByVariationId =
                    variationGalleriesFromResponse(
                      galleryJson
                    );
                  const galleriesByRowKey:
                    Record<string, ImgItem[]> = {};

                  for (const row of loadedRows) {
                    if (!row.id) continue;

                    const gallery =
                      galleriesByVariationId[row.id];

                    galleriesByRowKey[row.key] =
                      gallery && gallery.length > 0
                        ? gallery
                        : row.image
                          ? [row.image]
                          : [];
                  }

                  setVariationGalleries(
                    galleriesByRowKey
                  );
                  setDirtyVariationGalleryKeys([]);
                  setVariationGalleryError(null);
                } else {
                  setVariationGalleries(
                    Object.fromEntries(
                      loadedRows.map((row) => [
                        row.key,
                        row.image ? [row.image] : [],
                      ])
                    )
                  );
                  setVariationGalleryError(
                    "Existing colour galleries could not be loaded. The main variation image is shown instead."
                  );
                  setDirtyVariationGalleryKeys([]);
                }
              } else {
                setVariationGalleries({});
                setDirtyVariationGalleryKeys([]);
                setVariationGalleryError(null);
              }
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
  }, [id, loadTerms]);

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
      if (cur.has(termName)) {
        cur.delete(termName);
      } else {
        cur.add(termName);
      }
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
      setErr("Choose at least one variation term.");
      return;
    }

    let combos: { id?: number; name?: string; option: string }[][] = [[]];

    for (const a of attrDefs) {
      const next: {
        id?: number;
        name?: string;
        option: string;
      }[][] = [];

      for (const combo of combos) {
        for (const termName of a.terms) {
          next.push([
            ...combo,
            {
              id: a.id,
              name: a.name,
              option: termName,
            },
          ]);
        }
      }

      combos = next;
    }

    const existingKeys = new Set(
      rows.map((row) => row.key)
    );

    const additions: VRow[] = combos.flatMap((attrsCombo) => {
      const key = variationKey(attrsCombo);

      if (existingKeys.has(key)) return [];

      const parts = attrsCombo.map((attribute) => {
        const term = findTerm(
          attribute.id!,
          attribute.option
        );

        return skuPartFor(
          attribute.name,
          attribute.option,
          term?.slug
        );
      });

      const autoSku = base
        ? `${base}-${parts.join("-")}`
        : "";

      return [
        {
          key,
          attrs: attrsCombo,
          sku: autoSku,
          regular_price: "",
          manage_stock: true,
          stock_quantity: 0,
          backorders: "no" as Backorders,
          image: null,
        },
      ];
    });

    if (additions.length === 0) {
      setErr("No new variation combinations were found.");
      return;
    }

    setErr(null);
    setRows((current) => [
      ...current,
      ...additions,
    ]);
  }

  function editRow(i: number, patch: Partial<VRow>) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  }

  function editVariationGallery(
    row: VRow,
    next: ImgItem[]
  ) {
    setVariationGalleries((current) => ({
      ...current,
      [row.key]: uniqueImages(next, 3),
    }));

    setDirtyVariationGalleryKeys((current) =>
      current.includes(row.key)
        ? current
        : [...current, row.key]
    );
  }

  function removeVariationRow(index: number) {
    const row = rows[index];

    if (!row) return;

    if (
      !window.confirm(
        `Remove variation "${variationLabel(row.attrs)}"? The change is applied when you save.`
      )
    ) {
      return;
    }

    const variationId = row.id;

    if (variationId) {
      setRemovedVariationIds((current) =>
        current.includes(variationId)
          ? current
          : [...current, variationId]
      );
    }

    setRows((current) =>
      current.filter(
        (_, rowIndex) => rowIndex !== index
      )
    );

    setVariationGalleries((current) => {
      const next = { ...current };
      delete next[row.key];
      return next;
    });

    setDirtyVariationGalleryKeys((current) =>
      current.filter((key) => key !== row.key)
    );
  }

  const doGroupSearch = useCallback(async () => {
    const q = groupQuery.trim();

    if (!q) {
      setGroupResults([]);
      return;
    }

    const response = await fetch(
      `/api/products/search?q=${encodeURIComponent(q)}`
    );
    const parsed: unknown = await response
      .json()
      .catch(() => ({}));

    if (
      response.ok &&
      isRecord(parsed) &&
      Array.isArray(parsed.results)
    ) {
      setGroupResults(
        parsed.results.flatMap((value) => {
          if (!isRecord(value)) return [];

          const productId = Number(value.id);
          const name =
            typeof value.name === "string"
              ? value.name
              : "";

          if (
            !Number.isSafeInteger(productId) ||
            productId <= 0 ||
            !name
          ) {
            return [];
          }

          return [
            {
              id: productId,
              name,
              sku:
                typeof value.sku === "string"
                  ? value.sku
                  : "",
            },
          ];
        })
      );
    }
  }, [groupQuery]);

  useEffect(() => {
    if (searchDebounce.current) {
      clearTimeout(searchDebounce.current);
    }

    searchDebounce.current = setTimeout(() => {
      void doGroupSearch();
    }, 300);

    return () => {
      if (searchDebounce.current) {
        clearTimeout(searchDebounce.current);
      }
    };
  }, [doGroupSearch]);

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

      const colourParentImages =
        colourVariationProduct &&
        !variationGalleryError
          ? uniqueImages(
              rows.flatMap((row) =>
                rowUsesColourGallery(row)
                  ? rowGalleryImages(
                      row,
                      variationGalleries
                    )
                  : []
              ),
              20
            )
          : images;

      const basePayload: JsonRecord = {
        type: ptype,
        name: title,
        sku: sku || undefined,
        color: color.trim(),
        status,
        catalog_visibility: visibility,
        short_description: shortDesc,
        description: desc,
        regular_price: ptype === "simple" ? regular || undefined : undefined,
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
        images: productImagePayload(
          colourParentImages
        ),
        categories: selectedCats.map((id) => ({ id })),
        tags: tags.map((name) => ({ name })),
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
        const dirtyGalleryKeys =
          new Set(dirtyVariationGalleryKeys);

        const vr = await fetch(`/api/products/${p.id}/variations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variations: rows.map((row) => {
              const colourGallery =
                rowUsesColourGallery(row)
                  ? rowGalleryImages(
                      row,
                      variationGalleries
                    )
                  : [];
              const mainImage =
                colourGallery[0] ?? null;
              const colourGalleryChanged =
                dirtyGalleryKeys.has(row.key);

              return {
                id: row.id,
                sku: row.sku || undefined,
                regular_price:
                  row.regular_price || undefined,
                manage_stock: row.manage_stock,
                stock_quantity: row.manage_stock
                  ? Number(row.stock_quantity || 0)
                  : undefined,
                backorders: row.backorders,
                attributes: row.attrs,
                ...(rowUsesColourGallery(row)
                  ? mainImage
                    ? {
                        image: {
                          id: mainImage.id,
                        },
                      }
                    : row.id && colourGalleryChanged
                      ? {
                          image: {
                            id: 0,
                          },
                        }
                      : {}
                  : row.image
                    ? {
                        image: {
                          id: row.image.id,
                        },
                      }
                    : {}),
              };
            }),
            delete_ids: removedVariationIds,
          }),
        });

        const parsed: unknown = await vr
          .json()
          .catch(() => null);
        const result = isRecord(parsed) ? parsed : {};

        if (!vr.ok) {
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : "Variations update failed"
          );
        }

        const savedRows = Array.isArray(result.variations)
          ? result.variations.flatMap((value) => {
              const row = variationRowFromValue(value);
              return row ? [row] : [];
            })
          : [];

        const savedByKey = new Map(
          savedRows.map((row) => [row.key, row])
        );

        if (savedRows.length > 0 || rows.length === 0) {
          setRows((current) =>
            current.map(
              (row) => savedByKey.get(row.key) ?? row
            )
          );
        }

        const galleryPayload =
          rows.flatMap((row) => {
            if (
              !rowUsesColourGallery(row) ||
              !dirtyGalleryKeys.has(row.key)
            ) {
              return [];
            }

            const savedRow =
              savedByKey.get(row.key) ?? row;

            if (!savedRow.id) {
              throw new Error(
                `The variation "${variationLabel(
                  row.attrs
                )}" was saved without an ID. Its gallery was not updated.`
              );
            }

            return [
              {
                variation_id: savedRow.id,
                image_ids: rowGalleryImages(
                  row,
                  variationGalleries
                ).map((image) => image.id),
              },
            ];
          });

        if (galleryPayload.length > 0) {
          const galleryResponse = await fetch(
            `/api/products/${p.id}/variation-galleries`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                galleries: galleryPayload,
              }),
            }
          );

          const galleryJson: unknown =
            await galleryResponse
              .json()
              .catch(() => ({}));
          const galleryResult =
            isRecord(galleryJson)
              ? galleryJson
              : {};

          if (
            !galleryResponse.ok ||
            galleryResult.ok !== true
          ) {
            throw new Error(
              typeof galleryResult.error === "string"
                ? galleryResult.error
                : "Variation galleries update failed"
            );
          }

          if (
            Number(
              galleryResult.updated_count
            ) !== galleryPayload.length
          ) {
            throw new Error(
              `Only ${Number(
                galleryResult.updated_count
              ) || 0} of ${galleryPayload.length} variation galleries were updated.`
            );
          }
        }

        setDirtyVariationGalleryKeys([]);
        setRemovedVariationIds([]);
      }

      setMsg("Saved.");
    } catch (error: unknown) {
      setErr(
        error instanceof Error
          ? error.message
          : "Save failed"
      );
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
    <main className="mx-auto w-full max-w-7xl overflow-x-hidden pb-28 pt-1 md:px-4 md:pb-8 md:pt-3">
      <div className="flex items-start justify-between gap-3 border-b border-[#E2E7F1] bg-white px-3 py-3 md:mb-4 md:rounded-2xl md:border md:px-4">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-[#26335F] md:text-2xl">
            Edit product
          </h1>
          <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
            Update your product details, media, pricing, and variations.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/products"
            className="inline-flex min-h-9 items-center rounded-xl border border-[#C9D0E8] bg-white px-3 text-xs font-bold text-[#2E3F7D] transition hover:bg-[#F7F8FC]"
          >
            Back
          </Link>

          <details className="relative md:hidden">
            <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-xl bg-[#2E3F7D] px-3 text-xs font-bold text-white">
              More
            </summary>

            <div className="absolute right-0 top-11 z-[90] w-52 overflow-hidden rounded-xl border border-[#DDE2EE] bg-white p-1.5 shadow-[0_16px_36px_rgba(38,51,95,0.18)]">
              <button
                type="button"
                className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-slate-700 hover:bg-[#F7F8FC]"
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
                Duplicate product
              </button>

              <button
                type="button"
                className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-amber-700 hover:bg-amber-50"
                onClick={async (e) => {
                  e.preventDefault();
                  await fetch(`/api/products/${p.id}/trash`, { method: "DELETE" });
                  location.href = "/products/trash";
                }}
              >
                Move to Trash
              </button>

              <button
                type="button"
                className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
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
          </details>

          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <button
              type="button"
              className="inline-flex min-h-9 items-center rounded-xl border border-[#C9D0E8] bg-white px-3 text-xs font-bold text-[#2E3F7D] transition hover:bg-[#F7F8FC]"
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
              className="inline-flex min-h-9 items-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-700 hover:bg-amber-100"
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
              className="inline-flex min-h-9 items-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100"
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
      </div>

      {msg && (
        <div
          ref={saveMessageRef}
          className="border-y border-emerald-100 bg-emerald-50/90 px-3 py-3 text-xs text-emerald-800 md:mx-0 md:mb-4 md:rounded-2xl md:border md:px-4 md:text-sm"
        >
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

      <div className="bg-white md:rounded-2xl md:border md:border-[#E1E5EF] md:shadow-[0_8px_24px_rgba(38,51,95,0.05)]">
        <div className="border-b border-[#E2E7F1] bg-[#F8F9FC] px-3 py-3 md:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-medium text-slate-600">
              Product type
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D9DEEC] bg-white px-3 py-1.5 text-xs font-semibold text-[#2E3F7D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E85D4A]" />
              {ptype === "variable"
                ? "Variable product"
                : ptype === "grouped"
                  ? "Grouped product"
                  : "Simple product"}
            </div>
          </div>
        </div>

        <form
          onSubmit={submit}
          onKeyDown={swallowEnter}
          className="space-y-2 pb-0 md:space-y-6 md:p-6"
        >
          <section className="grid gap-2 md:gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)] lg:gap-6">
            <div className="space-y-4 border-b border-[#E7EAF2] bg-white px-3 py-4 md:rounded-2xl md:border md:border-[#E1E5EF] md:bg-[#F8F9FC] md:p-4">
              <h2 className="text-sm font-bold text-[#26335F]">Basics</h2>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <ReqLabel>Title</ReqLabel>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-inner focus:border-[#5366B7] focus:outline-none"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <ReqLabel>SKU</ReqLabel>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-inner focus:border-[#5366B7] focus:outline-none"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </div>

                <div>
                  <ReqLabel>Color</ReqLabel>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-inner focus:border-[#5366B7] focus:outline-none"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="e.g. Pink, Navy Blue, Maroon"
                  />
                </div>

                <div>
                  <ReqLabel>Status</ReqLabel>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
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

            <div className="space-y-4 border-b border-[#E7EAF2] bg-white px-3 py-4 md:rounded-2xl md:border md:border-[#E1E5EF] md:bg-[#F8F9FC] md:p-4">
              <h2 className="text-sm font-bold text-[#26335F]">
                Descriptions
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Short description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-inner focus:border-[#5366B7] focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-inner focus:border-[#5366B7] focus:outline-none"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {ptype === "simple" && (
            <>
              <section className="grid gap-2 md:gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] lg:gap-6">
                <div className="space-y-4 border-b border-[#E7EAF2] bg-white px-3 py-4 md:rounded-2xl md:border md:border-[#E1E5EF] md:p-4 md:shadow-[0_6px_18px_rgba(38,51,95,0.04)]">
                  <h2 className="text-sm font-bold text-[#26335F]">
                    Pricing
                  </h2>

                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Regular price
                      </label>
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
                        value={regular}
                        onChange={(e) => setRegular(e.target.value)}
                        placeholder="e.g. 999"
                      />
                    </div>

                  </div>
                </div>

                <div className="space-y-4 border-b border-[#E7EAF2] bg-white px-3 py-4 md:rounded-2xl md:border md:border-[#E1E5EF] md:p-4 md:shadow-[0_6px_18px_rgba(38,51,95,0.04)]">
                  <h2 className="text-sm font-bold text-[#26335F]">
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
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
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
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
                          value={backorders}
                          onChange={(e) =>
                            setBackorders(
                              normalizeBackorders(e.target.value)
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
            </>
          )}

          {ptype !== "grouped" && (
            <section className="grid gap-2 md:gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] lg:gap-6">
              <div className="space-y-4 border-b border-[#E7EAF2] bg-white px-3 py-4 md:rounded-2xl md:border md:border-[#E1E5EF] md:p-4 md:shadow-[0_6px_18px_rgba(38,51,95,0.04)]">
                <h2 className="text-sm font-bold text-[#26335F]">
                  Shipping
                </h2>

                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Weight
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="cm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-b border-[#E7EAF2] bg-white px-3 py-4 md:rounded-2xl md:border md:border-[#E1E5EF] md:p-4 md:shadow-[0_6px_18px_rgba(38,51,95,0.04)]">
                <h2 className="text-sm font-bold text-[#26335F]">Tax</h2>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Tax status
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
                      value={taxStatus}
                      onChange={(e) =>
                        setTaxStatus(
                          e.target.value as
                            | "taxable"
                            | "shipping"
                            | "none"
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
                      value={taxClass}
                      onChange={(e) => setTaxClass(e.target.value)}
                      placeholder="Leave blank for standard"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="grid gap-2 md:gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)] lg:gap-6">
            <div className="space-y-4 border-b border-[#E7EAF2] bg-white px-3 py-4 md:rounded-2xl md:border md:border-[#E1E5EF] md:p-4 md:shadow-[0_6px_18px_rgba(38,51,95,0.04)]">
              <h2 className="text-sm font-bold text-[#26335F]">
                Product images
              </h2>
              {colourVariationProduct ? (
                <div className="rounded-xl border border-[#D9DEEC] bg-[#F7F8FC] px-3 py-3 text-xs text-slate-600">
                  Colour images are managed inside each variation below.
                  The saved colour galleries automatically become the
                  parent product gallery.
                </div>
              ) : (
                <LocalProductImages
                  value={images}
                  onChange={setImages}
                  max={5}
                />
              )}
            </div>

            <div className="space-y-4 border-b border-[#E7EAF2] bg-white px-3 py-4 md:rounded-2xl md:border md:border-[#E1E5EF] md:p-4 md:shadow-[0_6px_18px_rgba(38,51,95,0.04)]">
              <h2 className="text-sm font-bold text-[#26335F]">
                Categorisation
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative">
                  <ReqLabel>Categories</ReqLabel>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 hover:border-[#5366B7] focus:outline-none"
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
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs focus:border-[#5366B7] focus:outline-none"
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
                          className="rounded-lg bg-[#2E3F7D] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#26366F]"
                          onClick={() => setCatOpen(false)}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <ReqLabel>Product tags</ReqLabel>
                  <TagPicker
                    value={tags}
                    onChange={setTags}
                    placeholder="Type a tag, then press comma or Enter"
                  />
                </div>
              </div>
            </div>
          </section>

          {ptype === "variable" && (
            <>
              <section className="space-y-4 border-b border-[#E7EAF2] bg-white px-3 py-4 md:rounded-2xl md:border md:border-[#E1E5EF] md:p-4 md:shadow-[0_6px_18px_rgba(38,51,95,0.04)]">
                <h2 className="text-sm font-bold text-[#26335F]">
                  Attributes for variations
                </h2>

                <div className="flex flex-wrap gap-2">
                  <select
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-[#5366B7] focus:outline-none"
                    value={varChosenAttr}
                    onChange={(e) =>
                      setVarChosenAttr(
                        e.target.value === ""
                          ? ""
                          : Number(e.target.value)
                      )
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
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:border-[#5366B7] hover:text-[#2E3F7D]"
                    onClick={addVarAttrRow}
                  >
                    Add
                  </button>

                  <button
                    type="button"
                    className="rounded-xl bg-[#E85D4A] px-3 py-2 text-xs font-bold text-white hover:bg-[#D94F3D]"
                    onClick={generateVariations}
                  >
                    Add selected variations
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
                                ? "border-[#2E3F7D] bg-[#2E3F7D] text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-[#5366B7]"
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

              <section className="space-y-4 border-b border-[#E7EAF2] bg-white px-3 py-4 md:rounded-2xl md:border md:border-[#E1E5EF] md:p-4 md:shadow-[0_6px_18px_rgba(38,51,95,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-[#26335F]">
                      Variations
                    </h2>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Colour variations allow up to 3 images. The first image is used as the variation image. Size variations use the shared product images above.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {rows.length} variation{rows.length === 1 ? "" : "s"}
                  </span>
                </div>

                {variationGalleryError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    {variationGalleryError}
                  </div>
                )}

                {rows.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-600">
                    No variations remain. Choose terms above and click{" "}
                    <span className="font-semibold">
                      Add selected variations
                    </span>.
                  </div>
                )}

                {rows.length > 0 && (
                  <>
                    <div className="space-y-3 md:hidden">
                      {rows.map((row, i) => (
                        <article
                          key={row.id ?? row.key}
                          className="border-b border-[#E7EAF2] bg-white px-0 py-3 last:border-b-0"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-sm font-bold text-[#26335F]">
                              {variationLabel(row.attrs)}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeVariationRow(i)}
                              className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="mt-3">
                            {rowUsesColourGallery(row) ? (
                              <LocalProductImages
                                value={rowGalleryImages(
                                  row,
                                  variationGalleries
                                )}
                                onChange={(next) =>
                                  editVariationGallery(
                                    row,
                                    next
                                  )
                                }
                                max={3}
                                compact
                              />
                            ) : (
                              <div className="flex items-center gap-3 rounded-xl border border-[#E1E5EF] bg-[#F8F9FC] p-2.5">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                                  {row.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={row.image.url}
                                      alt={variationLabel(row.attrs)}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="px-1 text-center text-[9px] text-slate-400">
                                      Shared
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] leading-5 text-slate-500">
                                  This variation uses the shared product images.
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <label className="col-span-2">
                              <span className="mb-1 block text-[11px] font-semibold text-slate-600">
                                SKU
                              </span>
                              <input
                                className="w-full rounded-xl border border-slate-200 bg-[#F8F9FC] px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
                                value={row.sku}
                                onChange={(e) =>
                                  editRow(i, {
                                    sku: e.target.value,
                                  })
                                }
                              />
                            </label>

                            <label>
                              <span className="mb-1 block text-[11px] font-semibold text-slate-600">
                                Price
                              </span>
                              <input
                                className="w-full rounded-xl border border-slate-200 bg-[#F8F9FC] px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
                                value={row.regular_price}
                                onChange={(e) =>
                                  editRow(i, {
                                    regular_price:
                                      e.target.value,
                                  })
                                }
                              />
                            </label>

                            <label>
                              <span className="mb-1 block text-[11px] font-semibold text-slate-600">
                                Quantity
                              </span>
                              <input
                                className="w-full rounded-xl border border-slate-200 bg-[#F8F9FC] px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none disabled:opacity-40"
                                type="number"
                                min={0}
                                disabled={!row.manage_stock}
                                value={row.stock_quantity}
                                onChange={(e) =>
                                  editRow(i, {
                                    stock_quantity:
                                      e.target.value === ""
                                        ? ""
                                        : Number(
                                            e.target.value
                                          ),
                                  })
                                }
                              />
                            </label>

                            <label className="col-span-2 flex min-h-10 items-center gap-2 rounded-xl border border-[#E1E5EF] bg-[#F8F9FC] px-3 text-xs font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={row.manage_stock}
                                onChange={(e) =>
                                  editRow(i, {
                                    manage_stock:
                                      e.target.checked,
                                  })
                                }
                              />
                              Manage stock for this variation
                            </label>

                            <label className="col-span-2">
                              <span className="mb-1 block text-[11px] font-semibold text-slate-600">
                                Backorders
                              </span>
                              <select
                                className="w-full rounded-xl border border-slate-200 bg-[#F8F9FC] px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none"
                                value={row.backorders}
                                onChange={(e) =>
                                  editRow(i, {
                                    backorders:
                                      normalizeBackorders(
                                        e.target.value
                                      ),
                                  })
                                }
                              >
                                <option value="no">Do not allow</option>
                                <option value="notify">
                                  Allow, but notify
                                </option>
                                <option value="yes">Allow</option>
                              </select>
                            </label>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="hidden overflow-x-auto rounded-xl border border-slate-100 md:block">
                    <table className="min-w-[1240px] text-xs">
                      <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Images</th>
                          <th className="px-3 py-2">Variation</th>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Price</th>
                          <th className="px-3 py-2">Stock</th>
                          <th className="px-3 py-2">Qty</th>
                          <th className="px-3 py-2">Backorders</th>
                          <th className="px-3 py-2">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {rows.map((row, i) => (
                          <tr
                            key={row.id ?? row.key}
                            className="border-t border-slate-100 bg-white align-top"
                          >
                            <td className="min-w-[360px] px-3 py-2">
                              {rowUsesColourGallery(row) ? (
                                <LocalProductImages
                                  value={rowGalleryImages(
                                    row,
                                    variationGalleries
                                  )}
                                  onChange={(next) =>
                                    editVariationGallery(
                                      row,
                                      next
                                    )
                                  }
                                  max={3}
                                  compact
                                />
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                  {row.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={row.image.url}
                                      alt={variationLabel(row.attrs)}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="px-1 text-center text-[9px] text-slate-400">
                                      Shared
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="max-w-[220px] px-3 py-2 font-medium text-slate-700">
                              {variationLabel(row.attrs)}
                            </td>

                            <td className="px-3 py-2">
                              <input
                                className="w-40 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-[#5366B7] focus:outline-none"
                                value={row.sku}
                                onChange={(e) =>
                                  editRow(i, {
                                    sku: e.target.value,
                                  })
                                }
                              />
                            </td>

                            <td className="px-3 py-2">
                              <input
                                className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-[#5366B7] focus:outline-none"
                                value={row.regular_price}
                                onChange={(e) =>
                                  editRow(i, {
                                    regular_price:
                                      e.target.value,
                                  })
                                }
                              />
                            </td>

                            <td className="px-3 py-2">
                              <label className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={row.manage_stock}
                                  onChange={(e) =>
                                    editRow(i, {
                                      manage_stock:
                                        e.target.checked,
                                    })
                                  }
                                />
                                Manage
                              </label>
                            </td>

                            <td className="px-3 py-2">
                              <input
                                className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-[#5366B7] focus:outline-none disabled:opacity-40"
                                type="number"
                                min={0}
                                disabled={!row.manage_stock}
                                value={row.stock_quantity}
                                onChange={(e) =>
                                  editRow(i, {
                                    stock_quantity:
                                      e.target.value === ""
                                        ? ""
                                        : Number(
                                            e.target.value
                                          ),
                                  })
                                }
                              />
                            </td>

                            <td className="px-3 py-2">
                              <select
                                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-[#5366B7] focus:outline-none"
                                value={row.backorders}
                                onChange={(e) =>
                                  editRow(i, {
                                    backorders:
                                      normalizeBackorders(
                                        e.target.value
                                      ),
                                  })
                                }
                              >
                                <option value="no">No</option>
                                <option value="notify">
                                  Notify
                                </option>
                                <option value="yes">Yes</option>
                              </select>
                            </td>

                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  removeVariationRow(i)
                                }
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}
              </section>
            </>
          )}

          {ptype === "grouped" && (
            <section className="space-y-4 border-b border-[#E7EAF2] bg-white px-3 py-4 md:rounded-2xl md:border md:border-[#E1E5EF] md:p-4 md:shadow-[0_6px_18px_rgba(38,51,95,0.04)]">
              <h2 className="text-sm font-bold text-[#26335F]">
                Group products
              </h2>

              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-[#F8F9FC] px-3 py-2 text-xs focus:border-[#5366B7] focus:outline-none sm:w-64"
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
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:border-[#5366B7] hover:text-[#2E3F7D]"
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

          <div
            className="sticky bottom-0 z-40 flex flex-col gap-2 border-t border-[#E2E7F1] bg-white/95 px-3 py-3 shadow-[0_-10px_30px_rgba(38,51,95,0.08)] backdrop-blur md:static md:mx-0 md:flex-row md:items-center md:justify-between md:bg-transparent md:px-0 md:shadow-none"
            style={{
              paddingBottom:
                "calc(0.75rem + env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex items-center gap-3">
              {err && (
                <span className="text-xs font-medium text-rose-600">{err}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#E85D4A] px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(232,93,74,0.2)] hover:bg-[#D94F3D] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}