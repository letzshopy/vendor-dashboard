"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import {
  Bell,
  CheckCircle2,
  FileText,
  ImageIcon,
  LayoutTemplate,
  Link2,
  Save,
  ShieldCheck,
  Sparkles,
  Type,
} from "lucide-react";

type SetupSiteForm = {
  branding: {
    topbarMessage: string;
    heroBannerUrl: string;
    heroTopText: string;
    heroHeading: string;
    heroBottomText: string;
    heroButtonText: string;
    heroButtonLink: string;
  };
  policies: {
    returnsAccepted: string;
    returnWindowDays: string;
    returnConditionNotes: string;
    refundProcessingDays: string;
    returnAddressSame: boolean;
    returnAddress: string;
  };
};

const EMPTY_FORM: SetupSiteForm = {
  branding: {
    topbarMessage: "",
    heroBannerUrl: "",
    heroTopText: "",
    heroHeading: "",
    heroBottomText: "",
    heroButtonText: "",
    heroButtonLink: "",
  },
  policies: {
    returnsAccepted: "",
    returnWindowDays: "",
    returnConditionNotes: "",
    refundProcessingDays: "",
    returnAddressSame: true,
    returnAddress: "",
  },
};

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 " +
  "placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

const textareaClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 " +
  "placeholder:text-slate-400 shadow-sm transition resize-none focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

function SectionCard({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-indigo-50/40 px-4 py-4 md:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            {icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {hint ? (
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                {hint}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function SetupSiteTab() {
  const [form, setForm] = useState<SetupSiteForm>(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<null | "saved" | "error">(null);

  const snapshotRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/site-setup", {
          cache: "no-store",
        });

        const data = res.ok ? await res.json() : {};

        const next: SetupSiteForm = {
          branding: { ...EMPTY_FORM.branding, ...(data?.branding || {}) },
          policies: { ...EMPTY_FORM.policies, ...(data?.policies || {}) },
        };

        setForm(next);
        snapshotRef.current = JSON.stringify(next);
      } catch {
        setForm(EMPTY_FORM);
        snapshotRef.current = JSON.stringify(EMPTY_FORM);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const currentSnap = useMemo(() => JSON.stringify(form), [form]);

  const isDirty = useMemo(() => {
    if (!snapshotRef.current) return false;
    return snapshotRef.current !== currentSnap;
  }, [currentSnap]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };

    if (isDirty) {
      window.addEventListener("beforeunload", onBeforeUnload);
    }

    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function patch(path: string, value: any) {
    setForm((prev) => {
      const clone: any = structuredClone(prev);
      const segs = path.split(".");
      let ptr = clone;
      for (let i = 0; i < segs.length - 1; i++) ptr = ptr[segs[i]];
      ptr[segs[segs.length - 1]] = value;
      return clone;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/site-setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Save failed");

      snapshotRef.current = JSON.stringify(form);
      setBanner("saved");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setBanner(null), 2600);
    } catch {
      setBanner("error");
      setTimeout(() => setBanner(null), 3200);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="p-4 md:p-5">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <>
      {banner === "saved" && (
        <div className="pointer-events-none fixed left-0 right-0 top-[72px] z-40 flex justify-center">
          <div className="pointer-events-auto rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            Setup Site saved successfully
          </div>
        </div>
      )}

      {banner === "error" && (
        <div className="pointer-events-none fixed left-0 right-0 top-[72px] z-40 flex justify-center">
          <div className="pointer-events-auto rounded-full bg-rose-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            Failed to save Setup Site
          </div>
        </div>
      )}

      <div className="space-y-4 p-3 md:space-y-5 md:p-5">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">
                Setup Site
              </div>
              <div className="mt-1 text-xs text-slate-500 md:text-sm">
                Control storefront branding, hero banner content and returns/refund inputs.
              </div>
            </div>
          </div>
        </div>

        <SectionCard
          icon={<Sparkles className="h-5 w-5" />}
          title="Branding & Hero Banner"
          hint="These fields control the top bar message and homepage hero section."
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-4">
              <Field label="Top bar notification message">
                <div className="relative">
                  <Bell className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    placeholder="Example: Free shipping on every order!"
                    value={form.branding.topbarMessage}
                    onChange={(e) =>
                      patch("branding.topbarMessage", e.target.value)
                    }
                  />
                </div>
              </Field>

              <Field label="Hero top text">
                <div className="relative">
                  <Type className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    placeholder="Small text above heading"
                    value={form.branding.heroTopText}
                    onChange={(e) =>
                      patch("branding.heroTopText", e.target.value)
                    }
                  />
                </div>
              </Field>

              <Field label="Hero heading">
                <input
                  className={inputClass}
                  placeholder="Main banner heading"
                  value={form.branding.heroHeading}
                  onChange={(e) => patch("branding.heroHeading", e.target.value)}
                />
              </Field>

              <Field label="Hero bottom text">
                <textarea
                  rows={4}
                  className={textareaClass}
                  placeholder="Small text below heading"
                  value={form.branding.heroBottomText}
                  onChange={(e) =>
                    patch("branding.heroBottomText", e.target.value)
                  }
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Hero button text">
                  <input
                    className={inputClass}
                    placeholder="Shop Now"
                    value={form.branding.heroButtonText}
                    onChange={(e) =>
                      patch("branding.heroButtonText", e.target.value)
                    }
                  />
                </Field>

                <Field label="Hero button link">
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                      placeholder="/shop"
                      value={form.branding.heroButtonLink}
                      onChange={(e) =>
                        patch("branding.heroButtonLink", e.target.value)
                      }
                    />
                  </div>
                </Field>
              </div>
            </div>

            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-4 md:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Hero banner image
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Upload the banner image used on the storefront home page.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {form.branding.heroBannerUrl ? (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white p-1">
                      <img
                        src={form.branding.heroBannerUrl}
                        alt="Hero banner"
                        className="h-44 w-full rounded-[18px] object-cover"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        onClick={() => patch("branding.heroBannerUrl", "")}
                      >
                        Change banner
                      </button>
                      <span className="text-xs text-slate-500">
                        Recommended ~1600×600px JPG/PNG
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-4">
                      <ImageUploader
                        onUploaded={(url) =>
                          patch("branding.heroBannerUrl", url ?? "")
                        }
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Recommended ~1600×600px JPG/PNG.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Returns & Refund Inputs"
          hint="Collect structured answers first. These can be used to generate policy content later."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Returns accepted">
              <input
                className={inputClass}
                placeholder="Yes / No / Only damaged items"
                value={form.policies.returnsAccepted}
                onChange={(e) =>
                  patch("policies.returnsAccepted", e.target.value)
                }
              />
            </Field>

            <Field label="Return window in days">
              <input
                className={inputClass}
                placeholder="Return window in days"
                value={form.policies.returnWindowDays}
                onChange={(e) =>
                  patch("policies.returnWindowDays", e.target.value)
                }
              />
            </Field>

            <Field label="Refund processing days">
              <input
                className={inputClass}
                placeholder="Refund processing days"
                value={form.policies.refundProcessingDays}
                onChange={(e) =>
                  patch("policies.refundProcessingDays", e.target.value)
                }
              />
            </Field>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Return address setting
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.policies.returnAddressSame}
                  onChange={(e) =>
                    patch("policies.returnAddressSame", e.target.checked)
                  }
                />
                <span>Return address same as store address</span>
              </label>
            </div>
          </div>

          <Field label="Return conditions / notes">
            <textarea
              rows={4}
              className={textareaClass}
              placeholder="Example: Product must be unused and returned with original packaging"
              value={form.policies.returnConditionNotes}
              onChange={(e) =>
                patch("policies.returnConditionNotes", e.target.value)
              }
            />
          </Field>

          {!form.policies.returnAddressSame && (
            <Field label="Return address">
              <textarea
                rows={4}
                className={textareaClass}
                placeholder="Enter return address"
                value={form.policies.returnAddress}
                onChange={(e) =>
                  patch("policies.returnAddress", e.target.value)
                }
              />
            </Field>
          )}
        </SectionCard>

        <div className="sticky bottom-3 z-10 md:bottom-4">
          <div className="rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isDirty ? "Unsaved changes" : "All changes saved"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Save your latest branding and policy setup details.
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isDirty && (
                  <span className="hidden text-xs text-emerald-600 sm:inline">
                    All changes saved
                  </span>
                )}

                {isDirty && (
                  <span className="hidden text-xs text-amber-600 sm:inline">
                    You have unsaved changes
                  </span>
                )}

                <button
                  onClick={save}
                  disabled={saving || !isDirty}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}