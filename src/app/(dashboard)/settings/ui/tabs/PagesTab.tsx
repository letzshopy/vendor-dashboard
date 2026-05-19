"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import {
  CheckCircle2,
  FileText,
  Globe2,
  Home,
  ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Save,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";

type SaleSectionMode = "auto" | "manual";

type PagesForm = {
  home: {
    bannerImageUrl: string;
    heroHeading: string;
    heroSubheading: string;
  };
  sections: {
    saleSectionMode: SaleSectionMode;
    saleSectionManualEnabled: boolean;
  };
  about: {
    content: string;
  };
  contact: {
    address: string;
    email: string;
    phone: string;
    whatsappNumber: string;
  };
  refundReturns: {
    acceptsReturns: boolean;
    returnWindowDays: string;
    returnConditions: string;
    exchangeAvailable: boolean;
    exchangeConditions: string;
    refundProcessingDays: string;
    nonReturnableItems: string;
    supportContact: string;
  };
  legal: {
    termsGeneratedHtml: string;
    privacyGeneratedHtml: string;
  };
};

const EMPTY_FORM: PagesForm = {
  home: {
    bannerImageUrl: "",
    heroHeading: "",
    heroSubheading: "",
  },
  sections: {
    saleSectionMode: "auto",
    saleSectionManualEnabled: true,
  },
  about: {
    content: "",
  },
  contact: {
    address: "",
    email: "",
    phone: "",
    whatsappNumber: "",
  },
  refundReturns: {
    acceptsReturns: true,
    returnWindowDays: "",
    returnConditions: "",
    exchangeAvailable: true,
    exchangeConditions: "",
    refundProcessingDays: "",
    nonReturnableItems: "",
    supportContact: "",
  },
  legal: {
    termsGeneratedHtml: "",
    privacyGeneratedHtml: "",
  },
};

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm " +
  "text-slate-900 placeholder:text-slate-400 shadow-sm transition " +
  "focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

const textareaClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm " +
  "text-slate-900 placeholder:text-slate-400 shadow-sm transition resize-none " +
  "focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

function deepMergePages(data: any): PagesForm {
  return {
    home: { ...EMPTY_FORM.home, ...(data?.home || {}) },
    sections: { ...EMPTY_FORM.sections, ...(data?.sections || {}) },
    about: { ...EMPTY_FORM.about, ...(data?.about || {}) },
    contact: { ...EMPTY_FORM.contact, ...(data?.contact || {}) },
    refundReturns: {
      ...EMPTY_FORM.refundReturns,
      ...(data?.refundReturns || {}),
    },
    legal: { ...EMPTY_FORM.legal, ...(data?.legal || {}) },
  };
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
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
            <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
              {description}
            </p>
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

export default function PagesTab() {
  const [form, setForm] = useState<PagesForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [banner, setBanner] = useState<null | "saved">(null);

  const snapshotRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/pages", { cache: "no-store" });
        const data = await res.json();
        const next = deepMergePages(data);
        setForm(next);
        snapshotRef.current = JSON.stringify(next);
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

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (!isDirty) return;
      const leave = window.confirm(
        "You have unsaved store page changes. Leave this page without saving?"
      );
      if (!leave) {
        e.preventDefault();
        window.history.go(1);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isDirty]);

  function update(path: string, value: any) {
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
      await fetch("/api/settings/pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      snapshotRef.current = JSON.stringify(form);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setBanner("saved");
      setTimeout(() => setBanner(null), 2600);
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
            Store Pages saved successfully
          </div>
        </div>
      )}

      <div className="space-y-4 p-3 md:space-y-5 md:p-5">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">
                Store pages
              </div>
              <div className="mt-1 text-xs text-slate-500 md:text-sm">
                Manage the content shown on Home, About, Contact and policy
                pages.
              </div>
            </div>
          </div>
        </div>

        <SectionCard
          icon={<Home className="h-5 w-5" />}
          title="Home hero"
          description="Banner image and hero text shown at the top of the home page."
        >
          <Field label="Banner image">
            {form.home.bannerImageUrl ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                  <img
                    src={form.home.bannerImageUrl}
                    alt="Home banner"
                    className="h-40 w-full object-cover sm:h-48"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    onClick={() => update("home.bannerImageUrl", "")}
                  >
                    Change banner
                  </button>
                  <span className="text-xs text-slate-500">
                    Recommended ~1600×500px JPG/PNG
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50/70 p-4">
                  <ImageUploader
                    onUploaded={(url) =>
                      update("home.bannerImageUrl", url ?? "")
                    }
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Recommended ~1600×500px JPG/PNG. Use a clean, wide visual.
                </p>
              </div>
            )}
          </Field>

          <div className="grid gap-4">
            <Field label="Hero heading">
              <input
                className={inputClass}
                placeholder="Hero heading"
                value={form.home.heroHeading}
                onChange={(e) => update("home.heroHeading", e.target.value)}
              />
            </Field>

            <Field label="Hero subheading">
              <textarea
                rows={4}
                className={textareaClass}
                placeholder="Hero subheading"
                value={form.home.heroSubheading}
                onChange={(e) => update("home.heroSubheading", e.target.value)}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={<Sparkles className="h-5 w-5" />}
          title="Sale section"
          description="Choose how the home page sale section should appear."
        >
          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-4">
              <input
                type="radio"
                name="saleSectionMode"
                checked={form.sections.saleSectionMode === "auto"}
                onChange={() => update("sections.saleSectionMode", "auto")}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Auto show based on sale products
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  Best option. Show this section only when sale products exist.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-4">
              <input
                type="radio"
                name="saleSectionMode"
                checked={form.sections.saleSectionMode === "manual"}
                onChange={() => update("sections.saleSectionMode", "manual")}
                className="mt-1"
              />
              <div className="w-full">
                <div className="text-sm font-semibold text-slate-900">
                  Manual control
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  Enable or disable the sale section manually.
                </div>

                {form.sections.saleSectionMode === "manual" && (
                  <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.sections.saleSectionManualEnabled}
                      onChange={(e) =>
                        update(
                          "sections.saleSectionManualEnabled",
                          e.target.checked
                        )
                      }
                    />
                    <span>Show sale section on storefront</span>
                  </label>
                )}
              </div>
            </label>
          </div>
        </SectionCard>

        <SectionCard
          icon={<FileText className="h-5 w-5" />}
          title="About Us"
          description="Content shown on the About page."
        >
          <Field label="About content">
            <textarea
              rows={9}
              className={textareaClass}
              placeholder="Write about your brand in 2–4 short paragraphs..."
              value={form.about.content}
              onChange={(e) => update("about.content", e.target.value)}
            />
          </Field>
        </SectionCard>

        <SectionCard
          icon={<Globe2 className="h-5 w-5" />}
          title="Contact page"
          description="Storefront contact details shown on the Contact page."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Storefront address">
              <textarea
                rows={5}
                className={textareaClass}
                placeholder="Storefront address"
                value={form.contact.address}
                onChange={(e) => update("contact.address", e.target.value)}
              />
            </Field>

            <div className="space-y-4">
              <Field label="Contact email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    placeholder="Contact email"
                    value={form.contact.email}
                    onChange={(e) => update("contact.email", e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Contact phone">
                <div className="relative">
                  <MessageCircle className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    placeholder="Contact phone"
                    value={form.contact.phone}
                    onChange={(e) => update("contact.phone", e.target.value)}
                  />
                </div>
              </Field>

              <Field label="WhatsApp number">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    placeholder="WhatsApp number"
                    value={form.contact.whatsappNumber}
                    onChange={(e) =>
                      update("contact.whatsappNumber", e.target.value)
                    }
                  />
                </div>
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Refund & return policy input"
          description="Fill these details once. Policy page content can be generated later from these answers."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.refundReturns.acceptsReturns}
                onChange={(e) =>
                  update("refundReturns.acceptsReturns", e.target.checked)
                }
              />
              <span>Accept returns</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.refundReturns.exchangeAvailable}
                onChange={(e) =>
                  update("refundReturns.exchangeAvailable", e.target.checked)
                }
              />
              <span>Exchange available</span>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Return window in days">
              <input
                className={inputClass}
                placeholder="Return window in days"
                value={form.refundReturns.returnWindowDays}
                onChange={(e) =>
                  update("refundReturns.returnWindowDays", e.target.value)
                }
              />
            </Field>

            <Field label="Refund processing time in days">
              <input
                className={inputClass}
                placeholder="Refund processing time in days"
                value={form.refundReturns.refundProcessingDays}
                onChange={(e) =>
                  update("refundReturns.refundProcessingDays", e.target.value)
                }
              />
            </Field>
          </div>

          <div className="grid gap-4">
            <Field label="Return conditions">
              <textarea
                rows={4}
                className={textareaClass}
                placeholder="Return conditions"
                value={form.refundReturns.returnConditions}
                onChange={(e) =>
                  update("refundReturns.returnConditions", e.target.value)
                }
              />
            </Field>

            <Field label="Exchange conditions">
              <textarea
                rows={4}
                className={textareaClass}
                placeholder="Exchange conditions"
                value={form.refundReturns.exchangeConditions}
                onChange={(e) =>
                  update("refundReturns.exchangeConditions", e.target.value)
                }
              />
            </Field>

            <Field label="Non-returnable items">
              <textarea
                rows={4}
                className={textareaClass}
                placeholder="Non-returnable items"
                value={form.refundReturns.nonReturnableItems}
                onChange={(e) =>
                  update("refundReturns.nonReturnableItems", e.target.value)
                }
              />
            </Field>

            <Field label="Support contact for returns / refunds">
              <input
                className={inputClass}
                placeholder="Support contact"
                value={form.refundReturns.supportContact}
                onChange={(e) =>
                  update("refundReturns.supportContact", e.target.value)
                }
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Legal pages preview"
          description="Terms & Conditions and Privacy Policy can be generated later. Read-only for now."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Terms & Conditions
              </div>
              <div className="min-h-[140px] text-sm text-slate-500">
                {form.legal.termsGeneratedHtml ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: form.legal.termsGeneratedHtml,
                    }}
                  />
                ) : (
                  "Not generated yet."
                )}
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Privacy Policy
              </div>
              <div className="min-h-[140px] text-sm text-slate-500">
                {form.legal.privacyGeneratedHtml ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: form.legal.privacyGeneratedHtml,
                    }}
                  />
                ) : (
                  "Not generated yet."
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="sticky bottom-3 z-10 md:bottom-4">
          <div className="rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isDirty ? "Unsaved changes" : "All changes saved"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Save your latest storefront page content and settings.
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