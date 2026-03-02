"use client";

import { useEffect, useRef, useState } from "react";

type ProfileData = {
  personal: {
    name: string;
    mobile: string;
    email: string;
    address: string;
  };
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
    whatsappLink?: string;
    whatsappNumber?: string;
    showWhatsAppIcon?: boolean;
  };
};

export default function ProfileTab() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings/profile", { cache: "no-store" });
      const s = await res.json();
      setData(s);
    })();
  }, []);

  const onChange = (path: string, value: any) => {
    setData((prev) => {
      if (!prev) return prev;
      const clone: any = JSON.parse(JSON.stringify(prev));
      const segs = path.split(".");
      let ptr: any = clone;
      for (let i = 0; i < segs.length - 1; i++) {
        ptr = ptr[segs[i]];
      }
      ptr[segs[segs.length - 1]] = value;
      return clone as ProfileData;
    });
  };

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/settings/upload", {
        method: "POST",
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");
      onChange("business.logoUrl", j.url);
    } finally {
      setLogoUploading(false);
    }
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    // simple skeleton
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 rounded-md bg-slate-100 animate-pulse" />
        <div className="h-32 rounded-xl border border-slate-100 bg-slate-50 animate-pulse" />
        <div className="h-40 rounded-xl border border-slate-100 bg-slate-50 animate-pulse" />
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-900 " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400";

  const labelClass = "text-xs font-medium text-slate-700 mb-1";
  const sectionClass =
    "rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 md:p-5 space-y-4";

  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium " +
    "text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed";

  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs " +
    "font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed";

  const ghostButtonClass =
    "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50";

  return (
    <div className="space-y-6">
      {/* PERSONAL */}
      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Personal</h3>
            <p className="text-xs text-slate-500">
              Owner / primary contact details. Used internally and for support.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex flex-col">
            <span className={labelClass}>Your name</span>
            <input
              className={inputClass}
              placeholder="Owner / contact person"
              value={data.personal.name}
              onChange={(e) => onChange("personal.name", e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <span className={labelClass}>Mobile</span>
            <input
              className={inputClass}
              type="tel"
              placeholder="+91…"
              value={data.personal.mobile}
              onChange={(e) => onChange("personal.mobile", e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <span className={labelClass}>Personal email</span>
            <input
              className={inputClass}
              type="email"
              placeholder="you@example.com"
              value={data.personal.email}
              onChange={(e) => onChange("personal.email", e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <span className={labelClass}>Personal address (optional)</span>
          <textarea
            className={inputClass + " min-h-[70px] resize-none"}
            placeholder="Used only for KYC / internal reference"
            value={data.personal.address}
            onChange={(e) => onChange("personal.address", e.target.value)}
          />
        </div>
      </section>

      {/* BUSINESS */}
      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Business</h3>
            <p className="text-xs text-slate-500">
              These details show on invoices, emails and your storefront.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] items-start">
          {/* left form */}
          <div className="space-y-3">
            <div className="flex flex-col">
              <span className={labelClass}>Business name</span>
              <input
                className={inputClass}
                placeholder="Store / brand name"
                value={data.business.name}
                onChange={(e) => onChange("business.name", e.target.value)}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col">
                <span className={labelClass}>Business phone</span>
                <input
                  className={inputClass}
                  type="tel"
                  placeholder="For customer contact"
                  value={data.business.phone}
                  onChange={(e) => onChange("business.phone", e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <span className={labelClass}>Business email</span>
                <input
                  className={inputClass}
                  type="email"
                  placeholder="orders@yourstore.com"
                  value={data.business.email}
                  onChange={(e) => onChange("business.email", e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col">
              <span className={labelClass}>Billing / store address</span>
              <textarea
                className={inputClass + " min-h-[90px] resize-none"}
                placeholder="Shown on invoices and footer"
                value={data.business.address}
                onChange={(e) => onChange("business.address", e.target.value)}
              />
            </div>
          </div>

          {/* logo upload */}
          <div className="space-y-3">
            <div className="flex flex-col">
              <span className={labelClass}>Logo</span>
              <p className="text-[11px] text-slate-500 mb-2">
                PNG / JPG, up to 1 MB. Used in dashboard header, invoices and
                emails.
              </p>
            </div>

            {data.business.logoUrl ? (
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.business.logoUrl}
                    alt="Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => fileRef.current?.click()}
                    disabled={logoUploading}
                  >
                    {logoUploading ? "Uploading…" : "Replace logo"}
                  </button>
                  <button
                    type="button"
                    className={ghostButtonClass}
                    onClick={() => onChange("business.logoUrl", "")}
                    disabled={logoUploading}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={secondaryButtonClass}
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
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && uploadLogo(e.target.files[0])
              }
            />
          </div>
        </div>
      </section>

      {/* SOCIAL & WHATSAPP */}
      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Social & WhatsApp
            </h3>
            <p className="text-xs text-slate-500">
              Add links that appear on your store footer and contact sections.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col">
            <span className={labelClass}>Instagram</span>
            <input
              className={inputClass}
              placeholder="https://instagram.com/yourstore"
              value={data.social.instagram || ""}
              onChange={(e) => onChange("social.instagram", e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <span className={labelClass}>Facebook</span>
            <input
              className={inputClass}
              placeholder="https://facebook.com/yourstore"
              value={data.social.facebook || ""}
              onChange={(e) => onChange("social.facebook", e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <span className={labelClass}>YouTube</span>
            <input
              className={inputClass}
              placeholder="https://youtube.com/@yourstore"
              value={data.social.youtube || ""}
              onChange={(e) => onChange("social.youtube", e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <span className={labelClass}>WhatsApp deep link (optional)</span>
            <input
              className={inputClass}
              placeholder="https://wa.me/91XXXXXXXXXX?text=Hi"
              value={data.social.whatsappLink || ""}
              onChange={(e) => onChange("social.whatsappLink", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
          <div className="flex flex-col">
            <span className={labelClass}>WhatsApp number</span>
            <input
              className={inputClass}
              type="tel"
              placeholder="10-digit mobile used for WhatsApp"
              value={data.social.whatsappNumber || ""}
              onChange={(e) =>
                onChange("social.whatsappNumber", e.target.value)
              }
            />
          </div>

          <label className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={!!data.social.showWhatsAppIcon}
              onChange={(e) =>
                onChange("social.showWhatsAppIcon", e.target.checked)
              }
            />
            <span>Show floating WhatsApp icon on the storefront</span>
          </label>
        </div>
      </section>

      {/* SAVE BUTTON */}
      <div className="flex justify-end">
        <button
          type="button"
          className={primaryButtonClass}
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
