"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  Save,
  UploadCloud,
  User,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
  CheckCircle2,
  Tags,
  Store,
} from "lucide-react";

type ProfileData = {
  personal: { name: string; mobile: string; email: string; address: string };
  business: {
    name: string;
    phone: string;
    email: string;
    address: string;
    logoUrl?: string;
    businessType?: string;
    productCategories?: string[];
    productCategoryOther?: string;
    brandTagline?: string;
  };
  social: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    whatsappNumber?: string;
    showWhatsAppIcon?: boolean;
  };
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

const BUSINESS_TYPES = [
  { value: "", label: "Select business type" },
  { value: "INDIVIDUAL", label: "Individual / Home-based business" },
  { value: "PROPRIETORSHIP", label: "Proprietorship" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "LLP", label: "LLP" },
  { value: "PVT_LTD", label: "Private Limited" },
  { value: "OPC", label: "OPC" },
  { value: "OTHER", label: "Other" },
];

const PRODUCT_CATEGORIES = [
  "Fashion / Clothing",
  "Sarees",
  "Kurtis / Ethnic Wear",
  "Boutique / Designer Wear",
  "Jewellery / Accessories",
  "Bags / Footwear",
  "Home Decor",
  "Handicrafts",
  "Brass / Metal Decor",
  "Kitchenware",
  "Gifts / Return Gifts",
  "Kids Products",
  "Beauty / Personal Care",
  "Art / Stationery",
  "Spiritual / Pooja Products",
  "Organic / Eco-friendly Products",
  "Food Products",
  "Digital Products / Services",
  "Other",
];

const EMPTY_PROFILE: ProfileData = {
  personal: { name: "", mobile: "", email: "", address: "" },
  business: {
    name: "",
    phone: "",
    email: "",
    address: "",
    logoUrl: "",
    businessType: "",
    productCategories: [],
    productCategoryOther: "",
    brandTagline: "",
  },
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
    "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 " +
    "placeholder:text-slate-400 shadow-sm transition " +
    "focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

  const selectClass =
    "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 " +
    "shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

  const textareaClass =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 " +
    "placeholder:text-slate-400 shadow-sm transition resize-none " +
    "focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

  const apiHasUsefulData = (value: unknown): boolean => {
    const profile = normalizeProfile(value);
    const p = profile.personal;
    const b = profile.business;
    const so = profile.social;

    return Boolean(
      p.name ||
        p.mobile ||
        p.email ||
        b.name ||
        b.phone ||
        b.email ||
        b.address ||
        b.logoUrl ||
        b.businessType ||
        b.brandTagline ||
        b.productCategoryOther ||
        (Array.isArray(b.productCategories) && b.productCategories.length) ||
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
            current = normalizeProfile(parsed);
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

        const merged = normalizeProfile(s);

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
    return (
      <div className="p-4 md:p-5">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading...
        </div>
      </div>
    );
  }

  const markDirtyChange = (path: string, value: unknown) => {
    setDirty(true);
    setData((prev) => {
      if (!prev) return prev;
      const clone = structuredClone(prev);
      const segs = path.split(".");
      let ptr = clone as unknown as JsonRecord;

      for (let i = 0; i < segs.length - 1; i++) {
        const next = ptr[segs[i]];

        if (!isRecord(next)) return prev;

        ptr = next;
      }

      const last = segs.at(-1);

      if (!last) return prev;

      ptr[last] = value;
      return clone;
    });
  };

  const toggleCategory = (category: string) => {
    const current = data.business.productCategories || [];
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];

    markDirtyChange("business.productCategories", next);
  };

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "profile_logo");
      const r = await fetch("/api/media/upload", {
        method: "POST",
        body: fd,
      });
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
    <div className="space-y-4 p-3 md:space-y-5 md:p-5">
      {saveBanner && (
        <div className="flex items-start gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{saveBanner}</span>
        </div>
      )}

      <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-indigo-50/50 px-4 py-4 md:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Personal</h3>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 md:p-5">
          <Field label="Owner / contact person" icon={<User className="h-4 w-4" />}>
            <input
              className={inputClass}
              placeholder="Enter owner / contact name"
              value={data.personal.name ?? ""}
              onChange={(e) => markDirtyChange("personal.name", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Mobile number" icon={<Phone className="h-4 w-4" />}>
              <input
                className={inputClass}
                placeholder="+91..."
                value={data.personal.mobile ?? ""}
                onChange={(e) => markDirtyChange("personal.mobile", e.target.value)}
              />
            </Field>

            <Field label="Personal email" icon={<Mail className="h-4 w-4" />}>
              <input
                className={inputClass}
                placeholder="name@example.com"
                value={data.personal.email ?? ""}
                onChange={(e) => markDirtyChange("personal.email", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Personal address" icon={<MapPin className="h-4 w-4" />}>
            <textarea
              className={textareaClass}
              rows={4}
              placeholder="Personal address (optional, for KYC or internal contact)"
              value={data.personal.address ?? ""}
              onChange={(e) => markDirtyChange("personal.address", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-sky-50/50 px-4 py-4 md:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Brand &amp; business identity
              </h3>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.8fr)] md:p-5">
          <div className="space-y-4">
            <Field label="Business / store name" icon={<Building2 className="h-4 w-4" />}>
              <input
                className={inputClass}
                placeholder="Enter business / store name"
                value={data.business.name ?? ""}
                onChange={(e) => markDirtyChange("business.name", e.target.value)}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Business phone" icon={<Phone className="h-4 w-4" />}>
                <input
                  className={inputClass}
                  placeholder="Business phone / WhatsApp"
                  value={data.business.phone ?? ""}
                  onChange={(e) => markDirtyChange("business.phone", e.target.value)}
                />
              </Field>

              <Field label="Business email" icon={<Mail className="h-4 w-4" />}>
                <input
                  className={inputClass}
                  placeholder="business@example.com"
                  value={data.business.email ?? ""}
                  onChange={(e) => markDirtyChange("business.email", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Business address" icon={<MapPin className="h-4 w-4" />}>
              <textarea
                className={textareaClass}
                rows={4}
                placeholder="Business address"
                value={data.business.address ?? ""}
                onChange={(e) => markDirtyChange("business.address", e.target.value)}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Business type" icon={<Store className="h-4 w-4" />}>
                <select
                  className={selectClass}
                  value={data.business.businessType || ""}
                  onChange={(e) => markDirtyChange("business.businessType", e.target.value)}
                >
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Brand tagline" icon={<Tags className="h-4 w-4" />}>
                <input
                  className={inputClass}
                  placeholder="Example: Handpicked collections for every occasion"
                  value={data.business.brandTagline ?? ""}
                  onChange={(e) => markDirtyChange("business.brandTagline", e.target.value)}
                />
              </Field>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Tags className="h-4 w-4 text-slate-400" />
                <span>Business / product category</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {PRODUCT_CATEGORIES.map((category) => (
                  <label
                    key={category}
                    className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={(data.business.productCategories || []).includes(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    <span>{category}</span>
                  </label>
                ))}
              </div>

              {(data.business.productCategories || []).includes("Other") && (
                <div className="mt-3">
                  <input
                    className={inputClass}
                    placeholder="If Other, mention category"
                    value={data.business.productCategoryOther ?? ""}
                    onChange={(e) =>
                      markDirtyChange("business.productCategoryOther", e.target.value)
                    }
                  />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm">
                <ImagePlus className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Logo</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Used in invoices, emails and store branding areas.
                </p>
              </div>
            </div>

            <div className="mt-4">
              {data.business.logoUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                    <img
                      src={data.business.logoUrl}
                      alt="Logo"
                      className="h-16 w-16 rounded-xl border border-slate-200 bg-white object-contain"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">Current logo</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Recommended: square PNG or JPG under 1 MB
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                      onClick={() => fileRef.current?.click()}
                      disabled={logoUploading}
                    >
                      <UploadCloud className="h-4 w-4" />
                      {logoUploading ? "Uploading..." : "Replace logo"}
                    </button>

                    <button
                      type="button"
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                      onClick={() => markDirtyChange("business.logoUrl", "")}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-sm font-medium text-slate-900">No logo uploaded</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Upload your store logo for a more branded experience.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                    onClick={() => fileRef.current?.click()}
                    disabled={logoUploading}
                  >
                    <UploadCloud className="h-4 w-4" />
                    {logoUploading ? "Uploading..." : "Upload logo"}
                  </button>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-violet-50/50 px-4 py-4 md:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Social &amp; WhatsApp
              </h3>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Instagram URL" icon={<Instagram className="h-4 w-4" />}>
              <input
                className={inputClass}
                placeholder="https://instagram.com/yourstore"
                value={data.social.instagram ?? ""}
                onChange={(e) => markDirtyChange("social.instagram", e.target.value)}
              />
            </Field>

            <Field label="Facebook URL" icon={<Facebook className="h-4 w-4" />}>
              <input
                className={inputClass}
                placeholder="https://facebook.com/yourstore"
                value={data.social.facebook ?? ""}
                onChange={(e) => markDirtyChange("social.facebook", e.target.value)}
              />
            </Field>

            <Field label="YouTube URL" icon={<Youtube className="h-4 w-4" />}>
              <input
                className={inputClass}
                placeholder="https://youtube.com/yourchannel"
                value={data.social.youtube ?? ""}
                onChange={(e) => markDirtyChange("social.youtube", e.target.value)}
              />
            </Field>

            <Field label="Customer WhatsApp number" icon={<MessageCircle className="h-4 w-4" />}>
              <input
                className={inputClass}
                placeholder="WhatsApp support number"
                value={data.social.whatsappNumber ?? ""}
                onChange={(e) =>
                  markDirtyChange("social.whatsappNumber", e.target.value)
                }
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={!!data.social.showWhatsAppIcon}
                onChange={(e) =>
                  markDirtyChange("social.showWhatsAppIcon", e.target.checked)
                }
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Show floating WhatsApp button
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Enable a floating WhatsApp support button on the storefront.
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      <div className="sticky bottom-3 z-10 md:bottom-4">
        <div className="rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                {dirty ? "Unsaved changes" : "All changes saved"}
              </div>
            </div>

            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              onClick={save}
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeProfile(raw: unknown): ProfileData {
  const root = isRecord(raw) ? raw : {};
  const personal = isRecord(root.personal) ? root.personal : {};
  const business = isRecord(root.business) ? root.business : {};
  const social = isRecord(root.social) ? root.social : {};

  return {
    personal: {
      ...EMPTY_PROFILE.personal,
      ...personal,
    } as ProfileData["personal"],
    business: {
      ...EMPTY_PROFILE.business,
      ...business,
      productCategories: Array.isArray(business.productCategories)
        ? business.productCategories.filter(
            (category): category is string =>
              typeof category === "string"
          )
        : [],
    } as ProfileData["business"],
    social: {
      ...EMPTY_PROFILE.social,
      ...social,
    } as ProfileData["social"],
  };
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-slate-400">{icon}</span>
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}
