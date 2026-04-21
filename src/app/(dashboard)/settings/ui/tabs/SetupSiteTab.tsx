"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ImageUploader from "@/components/ImageUploader";

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
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600";

const textareaClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600";

const primaryBtnClass =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 " +
  "text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60";

const secondaryBtnClass =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 " +
  "text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50";

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </section>
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
    return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  }

  return (
    <>
      {banner === "saved" && (
        <div className="fixed left-0 right-0 top-[72px] z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            Setup Site saved successfully
          </div>
        </div>
      )}

      {banner === "error" && (
        <div className="fixed left-0 right-0 top-[72px] z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto rounded-full bg-rose-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            Failed to save Setup Site
          </div>
        </div>
      )}

      <section className="space-y-6 max-w-5xl p-4 md:p-5">
        <header className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900">Setup Site</h3>
          <p className="text-xs text-slate-500">
            Control storefront branding, hero banner content and return/refund inputs.
          </p>
        </header>

        <SectionCard
          title="Branding & Hero Banner"
          hint="These fields control the top bar message and homepage hero section."
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Top bar notification message
                </label>
                <input
                  className={inputClass}
                  placeholder="Example: Free shipping on every order!"
                  value={form.branding.topbarMessage}
                  onChange={(e) =>
                    patch("branding.topbarMessage", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Hero top text
                </label>
                <input
                  className={inputClass}
                  placeholder="Small text above heading"
                  value={form.branding.heroTopText}
                  onChange={(e) => patch("branding.heroTopText", e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Hero heading
                </label>
                <input
                  className={inputClass}
                  placeholder="Main banner heading"
                  value={form.branding.heroHeading}
                  onChange={(e) => patch("branding.heroHeading", e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Hero bottom text
                </label>
                <textarea
                  rows={3}
                  className={textareaClass}
                  placeholder="Small text below heading"
                  value={form.branding.heroBottomText}
                  onChange={(e) =>
                    patch("branding.heroBottomText", e.target.value)
                  }
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Hero button text
                  </label>
                  <input
                    className={inputClass}
                    placeholder="Shop Now"
                    value={form.branding.heroButtonText}
                    onChange={(e) =>
                      patch("branding.heroButtonText", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Hero button link
                  </label>
                  <input
                    className={inputClass}
                    placeholder="/shop"
                    value={form.branding.heroButtonLink}
                    onChange={(e) =>
                      patch("branding.heroButtonLink", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-4">
              <div>
                <div className="mb-1 text-sm font-semibold text-slate-900">
                  Hero banner image
                </div>
                <p className="text-xs text-slate-500">
                  Upload banner image used on the storefront home page.
                </p>
              </div>

              {form.branding.heroBannerUrl ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-1">
                    <img
                      src={form.branding.heroBannerUrl}
                      alt="Hero banner"
                      className="h-36 w-full rounded-md object-cover"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={secondaryBtnClass}
                      onClick={() => patch("branding.heroBannerUrl", "")}
                    >
                      Change banner
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <ImageUploader
                    onUploaded={(url) =>
                      patch("branding.heroBannerUrl", url ?? "")
                    }
                  />
                  <p className="text-[11px] text-slate-500">
                    Recommended ~1600×600px JPG/PNG.
                  </p>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Returns & Refund Inputs"
          hint="Collect structured answers first. Later these can be used to generate refund policy content."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className={inputClass}
              placeholder="Returns accepted? (Yes / No / Only damaged items)"
              value={form.policies.returnsAccepted}
              onChange={(e) =>
                patch("policies.returnsAccepted", e.target.value)
              }
            />
            <input
              className={inputClass}
              placeholder="Return window in days"
              value={form.policies.returnWindowDays}
              onChange={(e) =>
                patch("policies.returnWindowDays", e.target.value)
              }
            />
            <input
              className={inputClass}
              placeholder="Refund processing days"
              value={form.policies.refundProcessingDays}
              onChange={(e) =>
                patch("policies.refundProcessingDays", e.target.value)
              }
            />
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.policies.returnAddressSame}
                onChange={(e) =>
                  patch("policies.returnAddressSame", e.target.checked)
                }
              />
              Return address same as store address
            </label>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Return conditions / notes
            </label>
            <textarea
              rows={4}
              className={textareaClass}
              placeholder="Example: Product must be unused and returned with original packaging"
              value={form.policies.returnConditionNotes}
              onChange={(e) =>
                patch("policies.returnConditionNotes", e.target.value)
              }
            />
          </div>

          {!form.policies.returnAddressSame && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Return address
              </label>
              <textarea
                rows={3}
                className={textareaClass}
                placeholder="Enter return address"
                value={form.policies.returnAddress}
                onChange={(e) =>
                  patch("policies.returnAddress", e.target.value)
                }
              />
            </div>
          )}
        </SectionCard>

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