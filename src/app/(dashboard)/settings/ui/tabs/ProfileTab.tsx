"use client";

import { useEffect, useRef, useState } from "react";

type ProfileData = {
  personal: { name: string; mobile: string; email: string; address: string };
  business: {
    name: string;
    phone: string;
    email: string;
    address: string;
    logoUrl?: string;
  };
    social: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    whatsappNumber?: string;
    showWhatsAppIcon?: boolean;
  };
};

const EMPTY_PROFILE: ProfileData = {
  personal: { name: "", mobile: "", email: "", address: "" },
  business: { name: "", phone: "", email: "", address: "", logoUrl: "" },
    social: {
    instagram: "",
    facebook: "",
    youtube: "",
    whatsappNumber: "",
    showWhatsAppIcon: false,
  },
};

const LS_KEY = "letz_profile_settings";

export default function ProfileTab() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
    "placeholder:text-slate-500 shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600";

  const apiHasUsefulData = (s: any): boolean => {
    if (!s || typeof s !== "object") return false;

    const p = s.personal || {};
    const b = s.business || {};
    const so = s.social || {};

    return Boolean(
      p.name ||
        p.mobile ||
        p.email ||
        b.name ||
        b.phone ||
        b.email ||
        b.address ||
        b.logoUrl ||
        so.instagram ||
        so.facebook ||
        so.youtube ||
        so.whatsappNumber
    );
  };

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let current: ProfileData | null = null;

      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(LS_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            current = {
              personal: { ...EMPTY_PROFILE.personal, ...(parsed.personal || {}) },
              business: { ...EMPTY_PROFILE.business, ...(parsed.business || {}) },
              social: { ...EMPTY_PROFILE.social, ...(parsed.social || {}) },
            };
          } catch {
            // ignore
          }
        }
      }

      if (!cancelled) {
        setData(current || EMPTY_PROFILE);
        setDirty(false);
      }

      try {
        const res = await fetch("/api/settings/profile", { cache: "no-store" });
        if (!res.ok) return;

        const s = await res.json();
        if (!apiHasUsefulData(s)) return;

        const merged: ProfileData = {
          personal: { ...EMPTY_PROFILE.personal, ...(s.personal || {}) },
          business: { ...EMPTY_PROFILE.business, ...(s.business || {}) },
          social: { ...EMPTY_PROFILE.social, ...(s.social || {}) },
        };

        if (!cancelled) {
          setData(merged);
          setDirty(false);

          if (typeof window !== "undefined") {
            window.localStorage.setItem(LS_KEY, JSON.stringify(merged));
          }
        }
      } catch {
        // ignore
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (!data) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  const markDirtyChange = (path: string, value: any) => {
    setDirty(true);
    setData((prev) => {
      if (!prev) return prev;
      const clone: any = structuredClone(prev);
      const segs = path.split(".");
      let ptr: any = clone;
      for (let i = 0; i < segs.length - 1; i++) ptr = ptr[segs[i]];
      ptr[segs.at(-1)!] = value;
      return clone;
    });
  };

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/settings/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");
      markDirtyChange("business.logoUrl", j.url);
    } finally {
      setLogoUploading(false);
    }
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_KEY, JSON.stringify(data));
    }

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      setDirty(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSaveBanner("Profile settings saved successfully.");
      setTimeout(() => setSaveBanner(null), 5000);
    } catch {
      setSaveBanner("Saved locally, but server could not be updated. Please try again.");
      setTimeout(() => setSaveBanner(null), 6000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-5">
      {saveBanner && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 shadow-sm">
          {saveBanner}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-slate-900">Personal</h3>
        <p className="mb-4 text-xs text-slate-500">
          Owner / contact person details. Used for internal communication only.
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          <input
            className={inputClass}
            placeholder="Owner / contact person"
            value={data.personal.name ?? ""}
            onChange={(e) => markDirtyChange("personal.name", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="+91…"
            value={data.personal.mobile ?? ""}
            onChange={(e) => markDirtyChange("personal.mobile", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Personal email"
            value={data.personal.email ?? ""}
            onChange={(e) => markDirtyChange("personal.email", e.target.value)}
          />
        </div>

        <textarea
          className={`${inputClass} mt-3`}
          rows={3}
          placeholder="Personal address (optional, for KYC or internal contact)"
          value={data.personal.address ?? ""}
          onChange={(e) => markDirtyChange("personal.address", e.target.value)}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-slate-900">
          Brand &amp; business identity
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          These details are used for invoices, emails, store branding and footer/contact sync.
        </p>

        <div className="grid items-start gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
          <div className="space-y-3">
            <input
              className={inputClass}
              placeholder="Business / store name"
              value={data.business.name ?? ""}
              onChange={(e) => markDirtyChange("business.name", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Business phone / WhatsApp number"
              value={data.business.phone ?? ""}
              onChange={(e) => markDirtyChange("business.phone", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Business email"
              value={data.business.email ?? ""}
              onChange={(e) => markDirtyChange("business.email", e.target.value)}
            />
            <textarea
              className={inputClass}
              rows={4}
              placeholder="Business address"
              value={data.business.address ?? ""}
              onChange={(e) => markDirtyChange("business.address", e.target.value)}
            />
          </div>

          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-900">Logo</div>
            <p className="mb-3 text-xs text-slate-500">
              This logo is used in invoices, emails and your store header/footer branding.
            </p>

            {data.business.logoUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={data.business.logoUrl}
                  alt="Logo"
                  className="h-16 w-16 rounded-md border border-slate-200 bg-white object-contain"
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                    onClick={() => fileRef.current?.click()}
                    disabled={logoUploading}
                  >
                    {logoUploading ? "Uploading…" : "Replace logo"}
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                    onClick={() => markDirtyChange("business.logoUrl", "")}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                onClick={() => fileRef.current?.click()}
                disabled={logoUploading}
              >
                {logoUploading ? "Uploading…" : "Upload logo"}
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              className="hidden"
            />

            <p className="mt-2 text-[11px] text-slate-500">
              Recommended: PNG/JPG, square logo, up to 1 MB.
            </p>
          </div>
        </div>
      </section>

            {/* Social */}
      <section className="rounded-xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-slate-900">
          Social &amp; WhatsApp
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          Add links that appear in your storefront top bar and communication areas.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Instagram URL"
            value={data.social.instagram ?? ""}
            onChange={(e) => markDirtyChange("social.instagram", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Facebook URL"
            value={data.social.facebook ?? ""}
            onChange={(e) => markDirtyChange("social.facebook", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="YouTube URL"
            value={data.social.youtube ?? ""}
            onChange={(e) => markDirtyChange("social.youtube", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Customer support WhatsApp number"
            value={data.social.whatsappNumber ?? ""}
            onChange={(e) =>
              markDirtyChange("social.whatsappNumber", e.target.value)
            }
          />
        </div>

        <div className="mt-3">
          <label className="inline-flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={!!data.social.showWhatsAppIcon}
              onChange={(e) =>
                markDirtyChange("social.showWhatsAppIcon", e.target.checked)
              }
            />
            Show floating WhatsApp button on storefront
          </label>
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}