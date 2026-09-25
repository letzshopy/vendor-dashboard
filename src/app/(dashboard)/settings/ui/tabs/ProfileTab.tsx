"use client";

import { useEffect, useRef, useState } from "react";

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
import {
  Building2,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  UploadCloud,
  User,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
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
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoPreviewRef = useRef<string | null>(null);

  const clearLogoPreview = () => {
    if (logoPreviewRef.current) {
      URL.revokeObjectURL(logoPreviewRef.current);
      logoPreviewRef.current = null;
    }

    setLogoPreviewUrl(null);
  };

  const inputClass =
    "ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground";

  const selectClass =
    "ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground";

  const textareaClass =
    "ls-focus-ring w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground";

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
    return () => {
      if (logoPreviewRef.current) {
        URL.revokeObjectURL(logoPreviewRef.current);
      }
    };
  }, []);

  useUnsavedChanges({
    id:
      "settings-profile",
    dirty,
    label:
      "profile changes",
    save,
  });

  if (!data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
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
    clearLogoPreview();
    const localPreview = URL.createObjectURL(file);
    logoPreviewRef.current = localPreview;
    setLogoPreviewUrl(localPreview);
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
      clearLogoPreview();
      setLogoUploading(false);
    }
  };

  async function save(): Promise<boolean> {
    if (
      !data ||
      saving
    ) {
      return false;
    }

    const feedbackId =
      "profile-save";

    setSaving(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Saving profile…",
    });

    if (
      typeof window !==
      "undefined"
    ) {
      window.localStorage.setItem(
        LS_KEY,
        JSON.stringify(
          data
        )
      );
    }

    try {
      const res =
        await fetch(
          "/api/settings/profile",
          {
            method:
              "PATCH",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify(
                data
              ),
          }
        );

      if (!res.ok) {
        throw new Error(
          "Failed to save profile"
        );
      }

      setDirty(false);

      actionFeedback.success({
        id: feedbackId,
        title:
          "Profile saved",
        durationMs: 2200,
      });

      return true;
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save profile",
        message:
          error instanceof
            Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });

      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 md:px-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-heading">Personal</h3>
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

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 md:px-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-heading">
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

            <div className="rounded-2xl border border-border bg-surface-soft p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Tags className="h-4 w-4 text-muted-foreground" />
                <span>Business / product category</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {PRODUCT_CATEGORIES.map((category) => (
                  <label
                    key={category}
                    className="flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-indigo-500"
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

          <div className="rounded-2xl border border-dashed border-border bg-surface-soft p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-sm">
                <ImagePlus className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-heading">Logo</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Used in invoices, emails and store branding areas.
                </p>
              </div>
            </div>

            <div className="mt-4">
              {logoPreviewUrl || data.business.logoUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                    <img
                      src={logoPreviewUrl || data.business.logoUrl}
                      alt="Logo"
                      className="h-16 w-16 rounded-xl border border-border bg-card object-contain"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-heading">Current logo</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Recommended: square PNG or JPG under 1 MB
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <AsyncButton
                      type="button"
                      loading={
                        logoUploading
                      }
                      loadingLabel="Uploading…"
                      onClick={() =>
                        fileRef.current?.click()
                      }
                    >
                      <UploadCloud className="h-4 w-4" />
                      Replace logo
                    </AsyncButton>

                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        clearLogoPreview();
                        markDirtyChange(
                          "business.logoUrl",
                          ""
                        );
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-card px-4 py-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-muted-foreground">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-sm font-bold text-heading">No logo uploaded</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Upload your store logo for a more branded experience.
                    </div>
                  </div>

                  <AsyncButton
                    type="button"
                    className="w-full"
                    loading={
                      logoUploading
                    }
                    loadingLabel="Uploading…"
                    onClick={() =>
                      fileRef.current?.click()
                    }
                  >
                    <UploadCloud className="h-4 w-4" />
                    Upload logo
                  </AsyncButton>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";

                  if (file) {
                    void uploadLogo(file);
                  }
                }}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 md:px-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-heading">
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

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-soft px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-bold text-heading">
                Show WhatsApp button
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Show the floating WhatsApp shortcut on your storefront.
              </div>
            </div>

            <Switch
              checked={
                Boolean(
                  data.social.showWhatsAppIcon
                )
              }
              onCheckedChange={(
                checked
              ) =>
                markDirtyChange(
                  "social.showWhatsAppIcon",
                  Boolean(
                    checked
                  )
                )
              }
            />
          </div>
        </div>
      </section>

      <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 md:bottom-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-2.5 shadow-[0_14px_36px_rgba(38,51,95,0.14)] backdrop-blur">
          <div className="min-w-0 px-1">
            <div className="text-xs font-bold text-heading">
              {dirty
                ? "Unsaved changes"
                : "All changes saved"}
            </div>
          </div>

          <AsyncButton
            type="button"
            loading={saving}
            loadingLabel="Saving…"
            disabled={!dirty}
            onClick={() =>
              void save()
            }
          >
            Save
          </AsyncButton>
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
      <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-heading">
        <span className="text-muted-foreground">{icon}</span>
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}
