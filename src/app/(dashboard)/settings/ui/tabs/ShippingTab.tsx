"use client";

import React, { useEffect, useMemo, useState } from "react";

import {
  useUnsavedChanges,
} from "@/components/navigation/UnsavedChangesGuard";
import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Button,
} from "@/components/ui/button";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  Switch,
} from "@/components/ui/switch";
import {
  actionFeedback,
} from "@/lib/actionFeedback";
import { stateName } from "@/lib/indiaStates";
import RegionsField from "./components/RegionsField";
import {
  CheckCircle2,
  Settings2,
  ShieldCheck,
  Truck,
  Weight,
} from "lucide-react";

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

const inputClass =
  "ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground";

const selectClass =
  "ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground";

const smallBadge =
  "inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground";

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

function safeSlug(s?: string) {
  const base = (s || "").trim();
  if (base)
    return base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return "undefined";
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
    <div className="space-y-5 rounded-2xl border border-border bg-surface-soft p-3 md:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <label className="mb-2 block text-xs font-bold text-heading">
            Zone name
          </label>
          <input
            className={inputClass}
            value={z.name}
            onChange={(e) => onChange({ ...z, name: e.target.value })}
            placeholder="E.g. Across India, South Zone"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-heading">
            Regions (states)
          </label>
          <RegionsField
            value={z.regions}
            onChange={(codes) => onChange({ ...z, regions: codes })}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Leave empty to apply across all Indian states.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-bold text-heading">
            Weight step per slab
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose whether slabs should increase every 0.5 kg or every 1 kg.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...z, step: 1 })}
              className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold transition ${
                z.step === 1
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              1 kg
            </button>

            <button
              type="button"
              onClick={() => onChange({ ...z, step: 0.5 })}
              className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold transition ${
                z.step === 0.5
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              0.5 kg
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <label className="mb-2 block text-xs font-bold text-heading">
            Max weight (kg)
          </label>
          <input
            type="number"
            min={1}
            className={inputClass}
            value={z.max}
            onChange={(e) =>
              onChange({
                ...z,
                max: Math.max(1, Number(e.target.value || 1)),
              })
            }
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Slabs will be auto-generated up to this maximum weight.
          </p>
        </div>
      </div>

      <div className={`grid gap-5 ${showOverrides ? "xl:grid-cols-2" : ""}`}>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3">
            <div className="text-sm font-bold text-heading">
              Rates for all products
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              These apply when no category-specific override exists.
            </p>
          </div>

          <div className="max-h-80 space-y-2 overflow-auto pr-1">
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
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3 py-2"
                >
                  <div className="text-xs font-medium text-foreground">
                    {label}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <input
                      type="number"
                      className="h-10 w-28 rounded-xl border border-border bg-card px-3 text-right text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
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

        {showOverrides && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3">
              <div className="text-sm font-bold text-heading">
                Per-category overrides
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Use different slabs for selected product categories.
              </p>
            </div>

            {z.overrides.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-slate-50/70 px-4 py-6 text-center text-xs text-muted-foreground">
                No category overrides added yet.
              </div>
            )}

            <div className="max-h-80 space-y-3 overflow-auto pr-1">
              {z.overrides.map((o, oi) => (
                <div
                  key={oi}
                  className="rounded-xl border border-border bg-surface-soft p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-heading">
                        {o.cat.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Category-specific slabs
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-xs font-medium text-rose-600 hover:underline"
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

                  <div className="space-y-2">
                    {buildStops(z.step, z.max).map((u, i) => {
                      const prev =
                        i === 0 ? 0 : buildStops(z.step, z.max)[i - 1];
                      const label = humanRangeLabel(prev, u, z.step);
                      const idx = o.slabs.findIndex(
                        (s) => Number(s.uptoKg) === Number(u)
                      );
                      const price = idx > -1 ? o.slabs[idx].price : 0;

                      return (
                        <div
                          key={u}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2"
                        >
                          <div className="text-xs font-medium text-foreground">
                            {label}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">₹</span>
                            <input
                              type="number"
                              className="h-10 w-28 rounded-xl border border-border bg-card px-3 text-right text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                              value={price}
                              onChange={(e) => {
                                const next = { ...z };
                                next.overrides = next.overrides.map(
                                  (oo, kk) => {
                                    if (kk !== oi) return oo;
                                    const arr = [...oo.slabs];
                                    arr[idx] = {
                                      uptoKg: u,
                                      price: Number(e.target.value || 0),
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


function StatusPill({
  active,
  labelOn = "Enabled",
  labelOff = "Off",
}: {
  active: boolean;
  labelOn?: string;
  labelOff?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-muted-foreground"
      }`}
    >
      {active ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {active ? labelOn : labelOff}
    </span>
  );
}

function ShippingMethodCard({
  icon,
  title,
  description,
  enabled,
  onToggle,
  badge,
  disabled = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={[
        "overflow-hidden rounded-2xl border bg-card transition",
        enabled
          ? "border-primary/35"
          : "border-border",
        disabled
          ? "opacity-60"
          : "",
      ].join(" ")}
    >
      <div className="p-3 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-not-allowed"
          >
            <div
              className={[
                "grid h-9 w-9 shrink-0 place-items-center rounded-lg md:h-10 md:w-10 md:rounded-xl",
                enabled
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              ].join(" ")}
            >
              {icon}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-extrabold text-heading">
                  {title}
                </h3>
                <StatusPill active={enabled} />
                {badge}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            </div>
          </button>

          <Switch
            checked={enabled}
            disabled={disabled}
            onCheckedChange={() =>
              onToggle()
            }
          />
        </div>
      </div>

      {enabled ? (
        <div className="border-t border-border bg-surface-soft p-3 md:p-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}


export default function ShippingTab() {
  const [active, setActive] = useState<"free" | "all" | "cat">("free");
  const [busy, setBusy] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [
    savedSnap,
    setSavedSnap,
  ] =
    useState("");
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

  const [freeEnabled, setFreeEnabled] = useState(false);
  const [freeScope, setFreeScope] = useState<"all" | "category">("all");
  const [freeCatIds, setFreeCatIds] = useState<number[]>([]);

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

  const [catEnabled, setCatEnabled] = useState(false);
  const [catPicked, setCatPicked] = useState<Cat | null>(null);

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

  useEffect(() => {
    if (mounted) saveTab(active);
  }, [active, mounted]);

  const enabledCount = useMemo(() => {
    let count = 0;
    if (freeEnabled) count += 1;
    if (allEnabled) count += 1;
    if (catEnabled) count += 1;
    return count;
  }, [freeEnabled, allEnabled, catEnabled]);

  const currentSnap =
    useMemo(
      () =>
        JSON.stringify({
          freeEnabled,
          freeScope,
          freeCatIds,
          allEnabled,
          catEnabled,
          zones,
        }),
      [
        freeEnabled,
        freeScope,
        freeCatIds,
        allEnabled,
        catEnabled,
        zones,
      ]
    );

  const isDirty =
    !hydrating &&
    Boolean(savedSnap) &&
    currentSnap !==
      savedSnap;

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

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/shipping/state");
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

        const nextFreeEnabled = !!free.enabled;
        const nextFreeScope = free.scope === "category" ? "category" : "all";
        const nextFreeCatIds = Array.isArray(free.categories)
          ? free.categories
          : [];
        const nextZones: Zone[] = mapped.length
  ? mapped
  : [
      {
        name: "Across India",
        regions: [],
        step: 1 as const,
        max: 10,
        slabs: [],
        overrides: [],
      },
    ];
        const nextActive =
          loadTab() ?? (nextFreeEnabled ? "free" : anyWeight ? "all" : "free");

        setFreeEnabled(nextFreeEnabled);
        setFreeScope(nextFreeScope);
        setFreeCatIds(nextFreeCatIds);
        setAllEnabled(!!anyWeight);
        setZones(nextZones);
        setActive(nextActive);

        saveLS({
          freeEnabled: nextFreeEnabled,
          freeScope: nextFreeScope,
          freeCatIds: nextFreeCatIds,
          allEnabled: !!anyWeight,
          catEnabled,
          zones: nextZones,
          active: nextActive,
        });

        setSavedSnap(
          JSON.stringify({
            freeEnabled:
              nextFreeEnabled,
            freeScope:
              nextFreeScope,
            freeCatIds:
              nextFreeCatIds,
            allEnabled:
              Boolean(
                anyWeight
              ),
            catEnabled,
            zones:
              nextZones,
          })
        );
      } catch {
        // keep local state if store fetch fails
      } finally {
        setHydrating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAndSync(): Promise<boolean> {
    if (
      busy ||
      hydrating
    ) {
      return false;
    }

    const feedbackId =
      "shipping-charges-save";

    setBusy(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Saving shipping charges…",
    });

    try {
      const overrideMap = new Map<string, { name: string; slug: string }>();
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
          `Unexpected response: ${JSON.stringify(result).slice(0, 220)}`
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

      setSavedSnap(
        currentSnap
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Shipping charges saved",
        durationMs: 2200,
      });

      return true;
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save shipping charges",
        message:
          error instanceof
            Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });

      return false;
    } finally {
      setBusy(false);
    }
  }

  const setFreeToggle = () => {
    setActive("free");
    setFreeEnabled((v) => !v);
  };

  const setAllToggle = () => {
    setActive("all");
    setAllEnabled((v) => !v);
  };

  const setCatToggle = () => {
    setActive("cat");
    setCatEnabled((v) => !v);
  };

  useUnsavedChanges({
    id:
      "settings-shipping-charges",
    dirty: isDirty,
    label:
      "shipping charge changes",
    save:
      saveAndSync,
  });

  if (hydrating) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-heading">
                Shipping rules
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Enable only the rules your store needs.
              </p>
            </div>

            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
              {enabledCount} active
            </span>
          </div>

          <div className="space-y-3">
            <ShippingMethodCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Free shipping"
              description="Offer free shipping for all products or selected categories."
              enabled={freeEnabled}
              onToggle={setFreeToggle}
              disabled={hydrating}
              badge={
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Customer friendly
                </span>
              }
            >
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-xs font-bold text-heading">
                    Apply free shipping to
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFreeScope("all")}
                      className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold transition ${
                        freeScope === "all"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      All products
                    </button>
                    <button
                      type="button"
                      onClick={() => setFreeScope("category")}
                      className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold transition ${
                        freeScope === "category"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      Specific categories only
                    </button>
                  </div>
                </div>

                {freeScope === "category" && (
                  <div>
                    <div className="mb-3 text-xs font-bold text-heading">
                      Select categories
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {cats.map((c) => {
                        const on = freeCatIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm ${
                              on
                                ? "border-primary bg-secondary text-secondary-foreground"
                                : "border-border bg-card text-foreground hover:bg-muted"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
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
                    <p className="mt-3 text-xs text-muted-foreground">
                      Only selected categories will get free shipping.
                    </p>
                  </div>
                )}
              </div>
            </ShippingMethodCard>

            <ShippingMethodCard
              icon={<Weight className="h-5 w-5" />}
              title="Weight-based shipping – all categories"
              description="Define zones and weight slabs that apply across the store."
              enabled={allEnabled}
              onToggle={setAllToggle}
              disabled={hydrating}
              badge={
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                  Advanced
                </span>
              }
            >
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={addZone}
                    className="inline-flex items-center justify-center rounded-2xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                  >
                    + Add zone
                  </button>
                </div>

                {zones.map((z, idx) => (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-2xl border border-border bg-surface-soft"
                  >
                    <div className="flex flex-col gap-2 border-b border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-heading">
                          {z.name || "Zone"}
                        </span>
                        <span className={smallBadge}>
                          {z.regions.length === 0
                            ? "All India"
                            : `${z.regions.length} state(s)`}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {z.regions.length === 0
                            ? "Applies to all Indian states"
                            : z.regions.map(stateName).join(", ")}
                        </span>
                        {idx > 0 && (
                          <button
                            type="button"
                            className="font-medium text-rose-600 hover:underline"
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
            </ShippingMethodCard>

            <ShippingMethodCard
              icon={<Settings2 className="h-5 w-5" />}
              title="Weight-based shipping – specific categories"
              description="Add category-wise overrides on top of the zone slabs."
              enabled={catEnabled}
              onToggle={setCatToggle}
              disabled={hydrating}
            >
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,280px)_auto] md:items-end">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-heading">
                      Choose category
                    </label>
                    <select
                      className={selectClass}
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
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    + Add category override
                  </button>
                </div>

                <div className="space-y-4">
                  {zones.map((z, idx) => (
                    <div
                      key={idx}
                      className="overflow-hidden rounded-2xl border border-border bg-surface-soft"
                    >
                      <div className="flex flex-col gap-2 border-b border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-heading">
                            {z.name || "Zone"}
                          </span>
                          <span className={smallBadge}>
                            {z.regions.length === 0
                              ? "All India"
                              : `${z.regions.length} state(s)`}
                          </span>
                        </div>

                        <span className="text-xs text-muted-foreground">
                          Overrides apply only to selected categories inside
                          this zone.
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
              </div>
            </ShippingMethodCard>
          </div>
        </section>

        {!freeEnabled && !allEnabled && !catEnabled && !hydrating && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No shipping rule is enabled. Enable at least one rule before using
            checkout for physical products.
          </div>
        )}

        <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 md:bottom-4">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-[0_12px_28px_rgba(38,51,95,0.12)] backdrop-blur md:gap-3 md:rounded-2xl md:p-2.5">
            <div className="hidden min-w-0 px-1 sm:block">
              <div className="text-xs font-bold text-heading">
                {isDirty
                  ? "Unsaved shipping changes"
                  : "All changes saved"}
              </div>
            </div>

            <AsyncButton
              type="button"
              loading={busy}
              loadingLabel="Saving…"
              className="w-full sm:w-auto"
              disabled={!isDirty}
              onClick={() =>
                void saveAndSync()
              }
            >
              Save Shipping Charges
            </AsyncButton>
          </div>
        </div>
      </div>
    </>
  );
}
