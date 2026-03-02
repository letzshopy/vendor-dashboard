"use client";

import React, { useEffect, useMemo, useState } from "react";
import { INDIA_STATE_GROUPS, stateName } from "@/lib/indiaStates";
import RegionsField from "./components/RegionsField";

type Cat = { id: number; name: string; slug: string };
type Slab = { uptoKg: number; price: number };
type Zone = {
  name: string;
  regions: string[];
  step: 0.5 | 1;
  max: number;
  slabs: Slab[];
  overrides: { cat: Cat; slabs: Slab[] }[];
};

const LS_KEY = "letz.shipping.snapshot.v1";
const LS_TAB = "letz.shipping.activeTab.v1";

type Snapshot = {
  freeEnabled: boolean;
  freeScope: "all" | "category";
  freeCatIds: number[];
  allEnabled: boolean;
  catEnabled: boolean;
  zones: Zone[];
  active: "free" | "all" | "cat";
};

const chipButton =
  "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors";
const pillTab =
  "inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors";

const smallBadge =
  "inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-500 " +
  "shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600";

const selectClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600";

// ---------- Helpers ----------

function safeSlug(s?: string) {
  const base = (s || "").trim();
  if (base)
    return base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return "undefined";
}

function loadLS(): Snapshot | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "null");
  } catch {
    return null;
  }
}
function saveLS(s: Snapshot) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}
function loadTab(): Snapshot["active"] | null {
  if (typeof window === "undefined") return null;
  try {
    return (localStorage.getItem(LS_TAB) as any) || null;
  } catch {
    return null;
  }
}
function saveTab(t: Snapshot["active"]) {
  try {
    localStorage.setItem(LS_TAB, t);
  } catch {}
}

function buildStops(step: 0.5 | 1, max: number): number[] {
  const out: number[] = [];
  const N = Math.round(max / step);
  for (let i = 1; i <= N; i++) out.push(Number((i * step).toFixed(2)));
  return out;
}
function humanRangeLabel(prev: number, upto: number, step: 0.5 | 1) {
  if (step === 1) {
    if (upto === 1) return "0 – 1 kg";
    const from = (prev + 0.1).toFixed(1);
    const to = upto.toFixed(1);
    return `${from} – ${to} kg`;
  } else {
    if (upto === 0.5) return "0 – 0.5 kg";
    const from = (prev + 0.01).toFixed(2);
    const to = upto.toFixed(2);
    return `${from} – ${to} kg`;
  }
}
function syncSlabArray(z: Zone) {
  const stops = buildStops(z.step, z.max);
  z.slabs = stops.map((u) => {
    const found = z.slabs.find((s) => Number(s.uptoKg) === Number(u));
    return { uptoKg: u, price: found?.price ?? 0 };
  });
  z.overrides = z.overrides.map((o) => {
    const oo = { ...o };
    oo.slabs = stops.map((u) => {
      const f = o.slabs.find((s) => Number(s.uptoKg) === Number(u));
      return { uptoKg: u, price: f?.price ?? 0 };
    });
    return oo;
  });
}

// ---------- Zone editor (per zone card) ----------

function ZoneEditor({
  z,
  onChange,
  showOverrides,
}: {
  z: Zone;
  onChange: (next: Zone) => void;
  showOverrides?: boolean;
}) {
  useEffect(() => {
    syncSlabArray(z);
    onChange({ ...z });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [z.step, z.max]);

  const stops = useMemo(() => buildStops(z.step, z.max), [z.step, z.max]);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 md:p-5 space-y-4">
      {/* Zone header row */}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)] items-start">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700">
            Zone name
          </label>
          <input
            className={inputClass}
            value={z.name}
            onChange={(e) => onChange({ ...z, name: e.target.value })}
            placeholder="E.g. Across India, South Zone…"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700">
            Regions (states)
          </label>
          <RegionsField
            value={z.regions}
            onChange={(codes) => onChange({ ...z, regions: codes })}
          />
          <p className="text-[10px] text-slate-500 mt-0.5">
            Leave empty to apply across all Indian states.
          </p>
        </div>
      </div>

      {/* Weight step & max */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-lg bg-white/70 p-3 border border-slate-200">
          <div className="text-xs font-medium text-slate-800">
            Weight step per slab
          </div>
          <p className="text-[10px] text-slate-500 mb-1">
            Decide whether you want slabs every 0.5 kg or every 1 kg.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...z, step: 1 })}
              className={`${chipButton} ${
                z.step === 1
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              1 kg
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...z, step: 0.5 })}
              className={`${chipButton} ${
                z.step === 0.5
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              0.5 kg
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700">
            Max weight (kg)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              className={`${inputClass} max-w-[120px]`}
              value={z.max}
              onChange={(e) =>
                onChange({
                  ...z,
                  max: Math.max(1, Number(e.target.value || 1)),
                })
              }
            />
            <span className="text-[11px] text-slate-500">
              Slabs will be auto-generated up to this weight.
            </span>
          </div>
        </div>
      </div>

      {/* Slabs section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* All products */}
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white/80 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Rates for all products
              </div>
              <p className="text-[10px] text-slate-500">
                These apply when no category-specific override is defined.
              </p>
            </div>
          </div>

          <div className="mt-2 max-h-72 overflow-auto pr-1">
            <div className="grid gap-2">
              {stops.map((u, i) => {
                const prev = i === 0 ? 0 : stops[i - 1];
                const label = humanRangeLabel(prev, u, z.step);
                const idx = z.slabs.findIndex(
                  (s) => Number(s.uptoKg) === Number(u)
                );
                const price = idx > -1 ? z.slabs[idx].price : 0;

                return (
                  <div
                    key={u}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 text-slate-700">{label}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">₹</span>
                      <input
                        type="number"
                        className={`${inputClass} w-24 text-right`}
                        value={price}
                        onChange={(e) => {
                          const next = { ...z };
                          next.slabs[idx] = {
                            uptoKg: u,
                            price: Number(e.target.value || 0),
                          };
                          onChange(next);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Category overrides */}
        {showOverrides && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white/80 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Per-category overrides
                </div>
                <p className="text-[10px] text-slate-500">
                  Use different slabs for specific product categories.
                </p>
              </div>
            </div>

            {z.overrides.length === 0 && (
              <p className="mt-2 text-[11px] text-slate-500">
                No category overrides added yet. Use the{" "}
                <span className="font-medium">“Weight – specific categories”</span>{" "}
                tab to add them.
              </p>
            )}

            <div className="mt-2 space-y-3 max-h-72 overflow-auto pr-1">
              {z.overrides.map((o, oi) => (
                <div
                  key={oi}
                  className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-800">
                        {o.cat.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Category-specific slabs
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-[11px] text-rose-600 hover:underline"
                      onClick={() => {
                        const next = {
                          ...z,
                          overrides: [...z.overrides],
                        };
                        next.overrides.splice(oi, 1);
                        onChange(next);
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-2">
                    {buildStops(z.step, z.max).map((u, i) => {
                      const prev =
                        i === 0
                          ? 0
                          : buildStops(z.step, z.max)[i - 1];
                      const label = humanRangeLabel(prev, u, z.step);
                      const idx = o.slabs.findIndex(
                        (s) => Number(s.uptoKg) === Number(u)
                      );
                      const price = idx > -1 ? o.slabs[idx].price : 0;

                      return (
                        <div
                          key={u}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex-1 text-slate-700">
                            {label}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500">
                              ₹
                            </span>
                            <input
                              type="number"
                              className={`${inputClass} w-24 text-right`}
                              value={price}
                              onChange={(e) => {
                                const next = { ...z };
                                next.overrides = next.overrides.map(
                                  (oo, kk) => {
                                    if (kk !== oi) return oo;
                                    const arr = [...oo.slabs];
                                    arr[idx] = {
                                      uptoKg: u,
                                      price: Number(
                                        e.target.value || 0
                                      ),
                                    };
                                    return { ...oo, slabs: arr };
                                  }
                                );
                                onChange(next);
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Main tab component ----------

export default function ShippingTab() {
  const [active, setActive] = useState<"free" | "all" | "cat">("free");
  const [busy, setBusy] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [cats, setCats] = useState<Cat[]>([]);
  useEffect(() => {
    fetch("/api/taxonomies/categories")
      .then((r) => r.json())
      .then((d) => setCats(d.items || []))
      .catch(() => {});
  }, []);

  // Free shipping
  const [freeEnabled, setFreeEnabled] = useState(false);
  const [freeScope, setFreeScope] = useState<"all" | "category">("all");
  const [freeCatIds, setFreeCatIds] = useState<number[]>([]);

  // Weight — all categories
  const [allEnabled, setAllEnabled] = useState(false);
  const [zones, setZones] = useState<Zone[]>([
    {
      name: "Across India",
      regions: [],
      step: 1,
      max: 10,
      slabs: [],
      overrides: [],
    },
  ]);

  // Weight — specific categories
  const [catEnabled, setCatEnabled] = useState(false);
  const [catPicked, setCatPicked] = useState<Cat | null>(null);

  // Restore last tab + snapshot AFTER mount
  useEffect(() => {
    if (!mounted) return;
    const last = loadTab();
    const snap = loadLS();
    if (last === "free" || last === "all" || last === "cat") setActive(last);
    if (snap) {
      setFreeEnabled(!!snap.freeEnabled);
      setFreeScope(snap.freeScope === "category" ? "category" : "all");
      setFreeCatIds(Array.isArray(snap.freeCatIds) ? snap.freeCatIds : []);
      setAllEnabled(!!snap.allEnabled);
      setCatEnabled(!!snap.catEnabled);
      if (Array.isArray(snap.zones) && snap.zones.length) setZones(snap.zones);
    }
  }, [mounted]);

  // Persist active tab
  useEffect(() => {
    if (mounted) saveTab(active);
  }, [active, mounted]);

  function addCategoryMethod(cat: Cat) {
    const slug = safeSlug(cat.slug || cat.name);
    const full = { ...cat, slug };
    setZones((zs) =>
      zs.map((z) => {
        const exists = z.overrides.some((o) => o.cat.id === full.id);
        if (exists) return z;
        const stops = buildStops(z.step, z.max);
        return {
          ...z,
          overrides: [
            ...z.overrides,
            {
              cat: full,
              slabs: stops.map((u) => ({ uptoKg: u, price: 0 })),
            },
          ],
        };
      })
    );
  }

  function addZone() {
    setZones((zs) => {
      const z: Zone = {
        name: `Zone ${zs.length + 1}`,
        regions: [],
        step: 1,
        max: 10,
        slabs: [],
        overrides: [],
      };
      return [...zs, z];
    });
  }
  function updateZone(i: number, next: Zone) {
    setZones((zs) => zs.map((z, idx) => (idx === i ? next : z)));
  }
  function removeZone(i: number) {
    setZones((zs) => zs.filter((_, idx) => idx !== i));
  }

  // HYDRATE from WP (source of truth), then snapshot
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/wp-json/letz/v1/shipping/state");
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();

        const free = data.free || {
          enabled: 0,
          scope: "all",
          categories: [],
        };

        const srvZones = Array.isArray(data.zones) ? data.zones : [];
        const mapped: Zone[] = srvZones.map((z: any) => {
          const slabs = Array.isArray(z?.methods?.weight?.slabs)
            ? z.methods.weight.slabs
            : [];
          const maxUpto = slabs.length
            ? Math.max(...slabs.map((s: any) => Number(s.uptoKg) || 0))
            : 10;
          const hasHalf = slabs.some((s: any) => {
            const u = Number(s.uptoKg) || 0;
            return Math.abs(u * 2 - Math.round(u * 2)) > 1e-6;
          });
          const step: 0.5 | 1 = hasHalf ? 0.5 : 1;

          return {
            name: z.name || "Across India",
            regions: Array.isArray(z.regions) ? z.regions : [],
            step,
            max: Math.max(1, maxUpto || 10),
            slabs: slabs.map((s: any) => ({
              uptoKg: Number(s.uptoKg) || 0,
              price: Number(s.price) || 0,
            })),
            overrides: [],
          };
        });

        const anyWeight = srvZones.some(
          (z: any) => !!z?.methods?.weight?.enabled
        );

        setFreeEnabled(!!free.enabled);
        setFreeScope(free.scope === "category" ? "category" : "all");
        setFreeCatIds(
          Array.isArray(free.categories) ? free.categories : []
        );

        setAllEnabled(!!anyWeight);
        setZones(
          mapped.length
            ? mapped
            : [
                {
                  name: "Across India",
                  regions: [],
                  step: 1,
                  max: 10,
                  slabs: [],
                  overrides: [],
                },
              ]
        );

        setActive((prev) =>
          prev ||
          (free.enabled ? "free" : anyWeight ? "all" : "free")
        );

        saveLS({
          freeEnabled: !!free.enabled,
          freeScope: free.scope === "category" ? "category" : "all",
          freeCatIds:
            Array.isArray(free.categories) ? free.categories : [],
          allEnabled: !!anyWeight,
          catEnabled,
          zones:
            mapped.length
              ? mapped
              : [
                  {
                    name: "Across India",
                    regions: [],
                    step: 1,
                    max: 10,
                    slabs: [],
                    overrides: [],
                  },
                ],
          active:
            loadTab() ??
            (free.enabled ? "free" : anyWeight ? "all" : "free"),
        });
      } catch {
        // fall back to LS / defaults
      } finally {
        setHydrating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save & sync to WP
  async function saveAndSync() {
    setBusy(true);
    try {
      const overrideMap = new Map<
        string,
        { name: string; slug: string }
      >();
      zones.forEach((z) => {
        z.overrides.forEach((o) => {
          const cslug = safeSlug(o.cat.slug || o.cat.name);
          const classSlug = `shipping-rate-${cslug}`;
          if (!overrideMap.has(classSlug)) {
            overrideMap.set(classSlug, {
              name: `Shipping Rate - ${o.cat.name}`,
              slug: classSlug,
            });
          }
        });
      });

      const classesArr = [
        { name: "Free Shipping", slug: "free-shipping" },
        { name: "Shipping Rate", slug: "shipping-rate" },
        ...Array.from(overrideMap.values()),
      ];

      const zonesPayload = zones.map((z) => ({
        name: z.name,
        regions: z.regions,
        methods: {
          free: {
            enabled: freeEnabled,
            scope: freeScope,
            categories: freeCatIds,
          },
          weight: {
            enabled: allEnabled || catEnabled,
            step: z.step,
            slabs: z.slabs,
            overrides: z.overrides.map((o) => {
              const cslug = safeSlug(o.cat.slug || o.cat.name);
              return {
                category: {
                  id: o.cat.id,
                  slug: cslug,
                  name: o.cat.name,
                },
                slabs: o.slabs,
              };
            }),
          },
        },
      }));

      const postJSON = async (url: string, payload: any) => {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {}
        if (!res.ok) {
          const msg = data?.error
            ? `${data.error} (status ${res.status})`
            : `HTTP ${res.status}: ${text.slice(0, 220)}`;
          throw new Error(msg);
        }
        return data ?? text;
      };

      await postJSON("/api/shipping/sync-classes", {
        classes: classesArr,
      });
      const result = await postJSON("/api/shipping/sync", {
        classes: classesArr,
        zones: zonesPayload,
      });
      if (typeof result === "object" && result?.ok !== true) {
        throw new Error(
          `Unexpected response: ${JSON.stringify(result).slice(
            0,
            220
          )}`
        );
      }

      saveLS({
        freeEnabled,
        freeScope,
        freeCatIds,
        allEnabled,
        catEnabled,
        zones,
        active,
      });

      alert("Shipping settings saved & synced ✅");
    } catch (e: any) {
      alert(`Save failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-900">
          Shipping charges
        </h3>
        <p className="text-xs text-slate-500">
          Configure free shipping and weight-based charges by zone and
          category. These settings are synced to your WooCommerce store.
        </p>
      </header>

      {/* Mode tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-100/70 p-1">
          {[
            { k: "free", label: "Free shipping" },
            { k: "all", label: "Weight – all categories" },
            { k: "cat", label: "Weight – specific categories" },
          ].map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setActive(t.k as any)}
              className={`${pillTab} ${
                active === t.k
                  ? "border-transparent bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className={smallBadge}>
          Shipping classes &amp; zones will be created/updated on sync
        </span>
      </div>

      {hydrating && (
        <div className="text-[11px] text-slate-500">
          Loading shipping configuration from store…
        </div>
      )}

      {/* Free shipping card */}
      {active === "free" && (
        <section
          className={`rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5 space-y-4 ${
            hydrating ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Free shipping
              </h4>
              <p className="text-[11px] text-slate-500">
                Enable free shipping across the store or for specific
                product categories.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={freeEnabled}
                onChange={(e) => setFreeEnabled(e.target.checked)}
              />
              Enable
            </label>
          </div>

          {freeEnabled && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-700">
                  Apply free shipping to
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFreeScope("all")}
                    className={`${chipButton} ${
                      freeScope === "all"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    All products
                  </button>
                  <button
                    type="button"
                    onClick={() => setFreeScope("category")}
                    className={`${chipButton} ${
                      freeScope === "category"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Specific categories only
                  </button>
                </div>
              </div>

              {freeScope === "category" && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-700">
                    Select categories for free shipping
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {cats.map((c) => {
                      const on = freeCatIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${
                            on
                              ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={on}
                            onChange={(e) => {
                              setFreeCatIds((prev) => {
                                const s = new Set(prev);
                                if (e.target.checked) s.add(c.id);
                                else s.delete(c.id);
                                return Array.from(s);
                              });
                            }}
                          />
                          <span className="truncate">{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Only the selected categories will be free. Other
                    categories will use weight-based charges (if enabled).
                  </p>
                </div>
              )}
            </div>
          )}

          {!freeEnabled && (
            <p className="text-[11px] text-slate-500">
              Turn this on to configure free shipping for your store.
            </p>
          )}
        </section>
      )}

      {/* Weight – all categories */}
      {active === "all" && (
        <section
          className={`space-y-4 ${
            hydrating ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Weight-based shipping – all categories
                </h4>
                <p className="text-[11px] text-slate-500">
                  Define zones and slabs that apply to all products in your
                  store.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={allEnabled}
                  onChange={(e) => setAllEnabled(e.target.checked)}
                />
                Enable
              </label>
            </div>

            {allEnabled ? (
              <>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={addZone}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    + Add zone
                  </button>
                </div>

                <div className="space-y-4">
                  {zones.map((z, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100/70 px-3 py-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {z.name || "Zone"}
                          </span>
                          <span className={smallBadge}>
                            {z.regions.length === 0
                              ? "All India"
                              : `${z.regions.length} state(s)`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-600">
                          <span>
                            {z.regions.length === 0
                              ? "Applies to all Indian states"
                              : z.regions.map(stateName).join(", ")}
                          </span>
                          {idx > 0 && (
                            <button
                              type="button"
                              className="text-rose-600 hover:underline"
                              onClick={() => removeZone(idx)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-3 md:p-4">
                        <ZoneEditor
                          z={z}
                          onChange={(next) => updateZone(idx, next)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-slate-500">
                Turn this on to configure zones and weight slabs that apply
                to all products.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Weight – specific categories */}
      {active === "cat" && (
        <section
          className={`space-y-4 ${
            hydrating ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Weight-based shipping – specific categories
                </h4>
                <p className="text-[11px] text-slate-500">
                  Add category-specific overrides on top of your zone slabs.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={catEnabled}
                  onChange={(e) => setCatEnabled(e.target.checked)}
                />
                Enable
              </label>
            </div>

            {catEnabled ? (
              <>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Choose category
                    </label>
                    <select
                      className={`${selectClass} max-w-xs`}
                      value={catPicked?.id || ""}
                      onChange={(e) => {
                        const id = Number(e.target.value || "");
                        setCatPicked(cats.find((c) => c.id === id) || null);
                      }}
                    >
                      <option value="">— Select category —</option>
                      {cats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!catPicked}
                    onClick={() => {
                      if (catPicked) addCategoryMethod(catPicked);
                    }}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    + Add category override
                  </button>
                </div>

                <div className="space-y-4">
                  {zones.map((z, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100/70 px-3 py-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {z.name || "Zone"}
                          </span>
                          <span className={smallBadge}>
                            {z.regions.length === 0
                              ? "All India"
                              : `${z.regions.length} state(s)`}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-600">
                          Overrides will apply only to selected categories
                          inside this zone.
                        </span>
                      </div>

                      <div className="p-3 md:p-4">
                        <ZoneEditor
                          z={z}
                          onChange={(next) => updateZone(idx, next)}
                          showOverrides
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-slate-500">
                Turn this on to define different weight slabs for specific
                categories like “Sarees”, “Bags”, etc.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Footer action */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={saveAndSync}
          disabled={busy || hydrating}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save & Sync to Store"}
        </button>
      </div>
    </div>
  );
}
