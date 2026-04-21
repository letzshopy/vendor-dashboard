"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ImageUploader from "@/components/ImageUploader";

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
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm " +
  "text-slate-900 placeholder:text-slate-500 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600";

const textareaClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm " +
  "text-slate-900 placeholder:text-slate-500 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600";

const primaryBtnClass =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 " +
  "text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60";

const secondaryBtnClass =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 " +
  "text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50";

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
    return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  }

  return (
    <>
      {banner === "saved" && (
        <div className="fixed left-0 right-0 top-[72px] z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            Store Pages saved successfully
          </div>
        </div>
      )}

      <section className="space-y-6 p-4 md:p-6">
        <header className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900">Store pages</h3>
          <p className="text-xs text-slate-500">
            Control the content shown on your storefront pages like Home, About,
            Contact and policy pages.
          </p>
        </header>

        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <h4 className="text-sm font-semibold text-slate-900">Home hero</h4>
          <p className="mb-4 text-[11px] text-slate-500">
            Banner image and wording shown at the top of the Home page.
          </p>

          <div className="space-y-4">
            <div>
              <div className="mb-1 text-xs font-medium text-slate-700">
                Banner image
              </div>

              {form.home.bannerImageUrl ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-1">
                    <img
                      src={form.home.bannerImageUrl}
                      alt="Home banner"
                      className="h-24 w-44 rounded-md object-cover"
                    />
                  </div>

                  <div className="space-y-2 text-xs text-slate-500">
                    <p>Preview of your current home banner.</p>
                    <button
                      type="button"
                      className={secondaryBtnClass}
                      onClick={() => update("home.bannerImageUrl", "")}
                    >
                      Change banner
                    </button>
                    <p className="text-[11px]">
                      Recommended ~1600×500px JPG/PNG.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <ImageUploader
                    onUploaded={(url) =>
                      update("home.bannerImageUrl", url ?? "")
                    }
                  />
                  <p className="text-[11px] text-slate-500">
                    Recommended ~1600×500px JPG/PNG. Use a clean, wide visual.
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <input
                className={inputClass}
                placeholder="Hero heading"
                value={form.home.heroHeading}
                onChange={(e) => update("home.heroHeading", e.target.value)}
              />
              <textarea
                rows={3}
                className={textareaClass}
                placeholder="Hero subheading"
                value={form.home.heroSubheading}
                onChange={(e) => update("home.heroSubheading", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <h4 className="text-sm font-semibold text-slate-900">Sale section</h4>
          <p className="mb-4 text-[11px] text-slate-500">
            Decide how the homepage sale section should behave.
          </p>

          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-3">
              <input
                type="radio"
                name="saleSectionMode"
                checked={form.sections.saleSectionMode === "auto"}
                onChange={() => update("sections.saleSectionMode", "auto")}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium text-slate-900">
                  Auto show based on sale products
                </div>
                <div className="text-xs text-slate-500">
                  Best option. Show the section only when sale products exist.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-3">
              <input
                type="radio"
                name="saleSectionMode"
                checked={form.sections.saleSectionMode === "manual"}
                onChange={() => update("sections.saleSectionMode", "manual")}
                className="mt-0.5"
              />
              <div className="w-full">
                <div className="text-sm font-medium text-slate-900">
                  Manual control
                </div>
                <div className="text-xs text-slate-500">
                  Enable or disable this section manually.
                </div>

                {form.sections.saleSectionMode === "manual" && (
                  <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-700">
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
                    Show sale section on storefront
                  </label>
                )}
              </div>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <h4 className="text-sm font-semibold text-slate-900">About Us</h4>
          <p className="mb-4 text-[11px] text-slate-500">
            Content shown on the About page.
          </p>

          <textarea
            rows={8}
            className={textareaClass}
            placeholder="Write about your brand in 2–4 short paragraphs…"
            value={form.about.content}
            onChange={(e) => update("about.content", e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <h4 className="text-sm font-semibold text-slate-900">Contact page</h4>
          <p className="mb-4 text-[11px] text-slate-500">
            Storefront contact details shown in Contact page and optionally footer.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <textarea
              rows={4}
              className={textareaClass}
              placeholder="Storefront address"
              value={form.contact.address}
              onChange={(e) => update("contact.address", e.target.value)}
            />
            <div className="space-y-3">
              <input
                className={inputClass}
                placeholder="Contact email"
                value={form.contact.email}
                onChange={(e) => update("contact.email", e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Contact phone"
                value={form.contact.phone}
                onChange={(e) => update("contact.phone", e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="WhatsApp number"
                value={form.contact.whatsappNumber}
                onChange={(e) =>
                  update("contact.whatsappNumber", e.target.value)
                }
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <h4 className="text-sm font-semibold text-slate-900">
            Refund &amp; return policy input
          </h4>
          <p className="mb-4 text-[11px] text-slate-500">
            Fill this once. Later we can generate the actual policy page content
            from these answers.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.refundReturns.acceptsReturns}
                onChange={(e) =>
                  update("refundReturns.acceptsReturns", e.target.checked)
                }
              />
              Accept returns
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.refundReturns.exchangeAvailable}
                onChange={(e) =>
                  update("refundReturns.exchangeAvailable", e.target.checked)
                }
              />
              Exchange available
            </label>

            <input
              className={inputClass}
              placeholder="Return window in days"
              value={form.refundReturns.returnWindowDays}
              onChange={(e) =>
                update("refundReturns.returnWindowDays", e.target.value)
              }
            />

            <input
              className={inputClass}
              placeholder="Refund processing time in days"
              value={form.refundReturns.refundProcessingDays}
              onChange={(e) =>
                update("refundReturns.refundProcessingDays", e.target.value)
              }
            />
          </div>

          <div className="mt-4 grid gap-3">
            <textarea
              rows={3}
              className={textareaClass}
              placeholder="Return conditions"
              value={form.refundReturns.returnConditions}
              onChange={(e) =>
                update("refundReturns.returnConditions", e.target.value)
              }
            />
            <textarea
              rows={3}
              className={textareaClass}
              placeholder="Exchange conditions"
              value={form.refundReturns.exchangeConditions}
              onChange={(e) =>
                update("refundReturns.exchangeConditions", e.target.value)
              }
            />
            <textarea
              rows={3}
              className={textareaClass}
              placeholder="Non-returnable items"
              value={form.refundReturns.nonReturnableItems}
              onChange={(e) =>
                update("refundReturns.nonReturnableItems", e.target.value)
              }
            />
            <input
              className={inputClass}
              placeholder="Support contact for returns/refunds"
              value={form.refundReturns.supportContact}
              onChange={(e) =>
                update("refundReturns.supportContact", e.target.value)
              }
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <h4 className="text-sm font-semibold text-slate-900">
            Legal pages preview
          </h4>
          <p className="mb-4 text-[11px] text-slate-500">
            Terms &amp; Conditions and Privacy Policy can be generated later
            based on store type and inputs. Read-only for now.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Terms &amp; Conditions
              </div>
              <div className="min-h-[120px] text-sm text-slate-500">
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

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Privacy Policy
              </div>
              <div className="min-h-[120px] text-sm text-slate-500">
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
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={saving || !isDirty}
            className={primaryBtnClass}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          {!isDirty && (
            <span className="text-xs text-emerald-600">All changes saved.</span>
          )}

          {isDirty && (
            <span className="text-xs text-amber-600">
              You have unsaved changes.
            </span>
          )}
        </div>
      </section>
    </>
  );
}