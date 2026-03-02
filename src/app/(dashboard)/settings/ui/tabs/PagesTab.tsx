"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ImageUploader from "@/components/ImageUploader";

type PagesForm = {
  homeBannerUrl: string;
  aboutText: string;
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

export default function PagesTab() {
  const [form, setForm] = useState<PagesForm>({
    homeBannerUrl: "",
    aboutText: "",
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [banner, setBanner] = useState<null | "saved">(null);

  const snapshotRef = useRef<string | null>(null);

  // load from API
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings/pages", { cache: "no-store" });
      const data = await res.json();
      const next: PagesForm = {
        homeBannerUrl: data?.homeBannerUrl || "",
        aboutText: data?.aboutText || "",
      };
      setForm(next);
      snapshotRef.current = JSON.stringify(next);
      setLoaded(true);
    })();
  }, []);

  const currentSnap = useMemo(() => JSON.stringify(form), [form]);
  const isDirty = useMemo(() => {
    if (!snapshotRef.current) return false;
    return snapshotRef.current !== currentSnap;
  }, [currentSnap]);

  // warn on refresh / close
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

  // warn on browser back
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (!isDirty) return;
      const leave = window.confirm(
        "You have unsaved page settings. Leave this page without saving?"
      );
      if (!leave) {
        e.preventDefault();
        window.history.go(1);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isDirty]);

  async function save() {
    setSaving(true);
    await fetch("/api/settings/pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);

    snapshotRef.current = JSON.stringify(form);
    // scroll + banner
    window.scrollTo({ top: 0, behavior: "smooth" });
    setBanner("saved");
    setTimeout(() => setBanner(null), 2600);
  }

  if (!loaded) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <>
      {/* top success pill */}
      {banner === "saved" && (
        <div className="fixed top-[72px] left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            Page settings saved successfully
          </div>
        </div>
      )}

      <section className="space-y-6 max-w-4xl">
        {/* Intro blurb */}
        <header className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900">
            Store pages
          </h3>
          <p className="text-xs text-slate-500">
            Control basic content used on your Home and About pages. Later we
            can add a full page builder.
          </p>
        </header>

        {/* Home section */}
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Home</h4>
              <p className="text-[11px] text-slate-500">
                Hero banner that appears at the top of your Home page.
              </p>
            </div>
          </div>

          <div className="text-xs font-medium text-slate-700 mb-1">
            Banner image
          </div>

          {form.homeBannerUrl ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-1">
                <img
                  src={form.homeBannerUrl}
                  alt="Home banner"
                  className="h-24 w-44 rounded-md object-cover"
                />
              </div>
              <div className="space-y-1 text-xs text-slate-500">
                <p>Preview of your current banner.</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={secondaryBtnClass}
                    onClick={() =>
                      setForm((f) => ({ ...f, homeBannerUrl: "" }))
                    }
                  >
                    Change banner
                  </button>
                </div>
                <p className="text-[11px]">
                  Recommended ~1600×500px JPG/PNG. We’ll insert this into your
                  Home page.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <ImageUploader
  onUploaded={(url) =>
    setForm((f) => ({
      ...f,
      homeBannerUrl: url ?? "",
    }))
  }
/>
              <p className="text-[11px] text-slate-500">
                Recommended ~1600×500px JPG/PNG. Try using a clean background
                with a short headline.
              </p>
            </div>
          )}
        </div>

        {/* About section */}
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">About</h4>
              <p className="text-[11px] text-slate-500">
                Short story about your brand that appears on the About page.
              </p>
            </div>
          </div>

          <label className="mb-1 block text-xs font-medium text-slate-700">
            About content
          </label>
          <textarea
            rows={8}
            className={textareaClass}
            placeholder="Write about your brand in 1–3 short paragraphs…"
            value={form.aboutText}
            onChange={(e) =>
              setForm((f) => ({ ...f, aboutText: e.target.value }))
            }
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Keep it simple and friendly. You can switch to a rich editor in a
            later version.
          </p>
        </div>

        {/* Actions */}
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
