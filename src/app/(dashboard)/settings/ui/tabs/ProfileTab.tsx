"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Building2,
  Check,
  Facebook,
  ImagePlus,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Store,
  Tags,
  UploadCloud,
  User,
  Youtube,
} from "lucide-react";

import {
  useUnsavedChanges,
} from "@/components/navigation/UnsavedChangesGuard";
import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  BottomSheet,
} from "@/components/ui/bottom-sheet";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  Switch,
} from "@/components/ui/switch";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

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

type JsonRecord =
  Record<string, unknown>;

const BUSINESS_TYPES = [
  {
    value: "",
    label:
      "Select business type",
  },
  {
    value: "INDIVIDUAL",
    label:
      "Individual / Home-based business",
  },
  {
    value:
      "PROPRIETORSHIP",
    label:
      "Proprietorship",
  },
  {
    value: "PARTNERSHIP",
    label: "Partnership",
  },
  {
    value: "LLP",
    label: "LLP",
  },
  {
    value: "PVT_LTD",
    label:
      "Private Limited",
  },
  {
    value: "OPC",
    label: "OPC",
  },
  {
    value: "OTHER",
    label: "Other",
  },
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

const EMPTY_PROFILE:
  ProfileData = {
  personal: {
    name: "",
    mobile: "",
    email: "",
    address: "",
  },
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
    showWhatsAppIcon:
      false,
  },
};

const LS_KEY =
  "letz_profile_settings";

const textareaClass =
  "ls-focus-ring w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground";

function isRecord(
  value: unknown
): value is JsonRecord {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
  );
}

function normalizeProfile(
  raw: unknown
): ProfileData {
  const root =
    isRecord(raw)
      ? raw
      : {};

  const personal =
    isRecord(
      root.personal
    )
      ? root.personal
      : {};

  const business =
    isRecord(
      root.business
    )
      ? root.business
      : {};

  const social =
    isRecord(
      root.social
    )
      ? root.social
      : {};

  return {
    personal: {
      ...EMPTY_PROFILE.personal,
      ...personal,
    } as ProfileData["personal"],
    business: {
      ...EMPTY_PROFILE.business,
      ...business,
      productCategories:
        Array.isArray(
          business.productCategories
        )
          ? business.productCategories.filter(
              (
                category
              ): category is string =>
                typeof category ===
                "string"
            )
          : [],
    } as ProfileData["business"],
    social: {
      ...EMPTY_PROFILE.social,
      ...social,
    } as ProfileData["social"],
  };
}

function profileHasUsefulData(
  value: unknown
) {
  const profile =
    normalizeProfile(value);

  return Boolean(
    profile.personal.name ||
      profile.personal.mobile ||
      profile.personal.email ||
      profile.business.name ||
      profile.business.phone ||
      profile.business.email ||
      profile.business.address ||
      profile.business.logoUrl ||
      profile.business.businessType ||
      profile.business.brandTagline ||
      profile.business.productCategoryOther ||
      (
        profile.business
          .productCategories ||
        []
      ).length ||
      profile.social.instagram ||
      profile.social.facebook ||
      profile.social.youtube ||
      profile.social.whatsappNumber
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon:
    React.ReactNode;
  title: string;
  description?: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border px-3 py-3 md:px-5 md:py-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg md:h-10 md:w-10 md:rounded-xl bg-secondary text-secondary-foreground">
          {icon}
        </span>

        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-heading">
            {title}
          </h2>

          {description ? (
            <p className="mt-0.5 hidden text-xs leading-5 text-muted-foreground md:block">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="p-3 md:p-5">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?:
    React.ReactNode;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-heading">
        {icon ? (
          <span className="text-muted-foreground">
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
      </div>

      {children}
    </div>
  );
}

export default function ProfileTab() {
  const [
    data,
    setData,
  ] =
    useState<ProfileData | null>(
      null
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    dirty,
    setDirty,
  ] =
    useState(false);

  const [
    logoUploading,
    setLogoUploading,
  ] =
    useState(false);

  const [
    logoPreviewUrl,
    setLogoPreviewUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    categoryPickerOpen,
    setCategoryPickerOpen,
  ] =
    useState(false);

  const [
    categoryQuery,
    setCategoryQuery,
  ] =
    useState("");

  const fileRef =
    useRef<HTMLInputElement>(
      null
    );

  const logoPreviewRef =
    useRef<string | null>(
      null
    );

  function clearLogoPreview() {
    if (
      logoPreviewRef.current
    ) {
      URL.revokeObjectURL(
        logoPreviewRef.current
      );

      logoPreviewRef.current =
        null;
    }

    setLogoPreviewUrl(
      null
    );
  }

  useEffect(() => {
    let cancelled =
      false;

    async function init() {
      let current:
        ProfileData | null =
        null;

      if (
        typeof window !==
        "undefined"
      ) {
        const raw =
          window.localStorage.getItem(
            LS_KEY
          );

        if (raw) {
          try {
            current =
              normalizeProfile(
                JSON.parse(raw)
              );
          } catch {
            current =
              null;
          }
        }
      }

      if (!cancelled) {
        setData(
          current ||
            EMPTY_PROFILE
        );
        setDirty(false);
      }

      try {
        const response =
          await fetch(
            "/api/settings/profile",
            {
              cache:
                "no-store",
            }
          );

        if (
          !response.ok
        ) {
          return;
        }

        const payload =
          await response.json();

        if (
          !profileHasUsefulData(
            payload
          )
        ) {
          return;
        }

        const normalized =
          normalizeProfile(
            payload
          );

        if (!cancelled) {
          setData(
            normalized
          );
          setDirty(false);

          if (
            typeof window !==
            "undefined"
          ) {
            window.localStorage.setItem(
              LS_KEY,
              JSON.stringify(
                normalized
              )
            );
          }
        }
      } catch {
        // Keep local profile data when the API is temporarily unavailable.
      }
    }

    void init();

    return () => {
      cancelled =
        true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (
        logoPreviewRef.current
      ) {
        URL.revokeObjectURL(
          logoPreviewRef.current
        );
      }
    };
  }, []);

  function markDirtyChange(
    path: string,
    value: unknown
  ) {
    setDirty(true);

    setData(
      (current) => {
        if (!current) {
          return current;
        }

        const next =
          structuredClone(
            current
          );

        const segments =
          path.split(".");

        let pointer =
          next as unknown as
            JsonRecord;

        for (
          let index = 0;
          index <
          segments.length - 1;
          index += 1
        ) {
          const segment =
            pointer[
              segments[index]
            ];

          if (
            !isRecord(
              segment
            )
          ) {
            return current;
          }

          pointer =
            segment;
        }

        const last =
          segments.at(-1);

        if (!last) {
          return current;
        }

        pointer[last] =
          value;

        return next;
      }
    );
  }

  function toggleCategory(
    category: string
  ) {
    if (!data) {
      return;
    }

    const current =
      data.business
        .productCategories ||
      [];

    const next =
      current.includes(
        category
      )
        ? current.filter(
            (item) =>
              item !==
              category
          )
        : [
            ...current,
            category,
          ];

    markDirtyChange(
      "business.productCategories",
      next
    );
  }

  async function uploadLogo(
    file: File
  ) {
    clearLogoPreview();

    const localPreview =
      URL.createObjectURL(
        file
      );

    logoPreviewRef.current =
      localPreview;

    setLogoPreviewUrl(
      localPreview
    );

    setLogoUploading(
      true
    );

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "purpose",
        "profile_logo"
      );

      const response =
        await fetch(
          "/api/media/upload",
          {
            method:
              "POST",
            body: formData,
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok
      ) {
        throw new Error(
          payload?.error ||
            "Logo upload failed"
        );
      }

      markDirtyChange(
        "business.logoUrl",
        payload.url
      );

      actionFeedback.success({
        id:
          "profile-logo-upload",
        title:
          "Logo ready",
        message:
          "Save Profile to apply it.",
        durationMs: 2200,
      });
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id:
          "profile-logo-upload",
        title:
          "Could not upload logo",
        message:
          error instanceof
            Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });
    } finally {
      clearLogoPreview();
      setLogoUploading(
        false
      );
    }
  }

  async function save():
    Promise<boolean> {
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

    try {
      const response =
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

      if (
        !response.ok
      ) {
        throw new Error(
          "Failed to save profile"
        );
      }

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
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-52 w-full rounded-2xl" />
      </div>
    );
  }

  const selectedCategories =
    data.business
      .productCategories ||
    [];

  const filteredCategories =
    PRODUCT_CATEGORIES.filter(
      (category) =>
        category
          .toLowerCase()
          .includes(
            categoryQuery
              .trim()
              .toLowerCase()
          )
    );

  const logoSrc =
    logoPreviewUrl ||
    data.business.logoUrl ||
    "";

  return (
    <>
      <div className="space-y-4">
        <Section
          icon={
            <User className="h-4.5 w-4.5" />
          }
          title="Personal contact"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field
              label="Owner / contact person"
              icon={
                <User className="h-3.5 w-3.5" />
              }
            >
              <Input
                value={
                  data.personal
                    .name
                }
                onChange={(
                  event
                ) =>
                  markDirtyChange(
                    "personal.name",
                    event.target
                      .value
                  )
                }
                placeholder="Contact name"
              />
            </Field>

            <Field
              label="Mobile number"
              icon={
                <Phone className="h-3.5 w-3.5" />
              }
            >
              <Input
                value={
                  data.personal
                    .mobile
                }
                onChange={(
                  event
                ) =>
                  markDirtyChange(
                    "personal.mobile",
                    event.target
                      .value
                  )
                }
                placeholder="+91"
                inputMode="tel"
              />
            </Field>

            <Field
              label="Personal email"
              icon={
                <Mail className="h-3.5 w-3.5" />
              }
            >
              <Input
                type="email"
                value={
                  data.personal
                    .email
                }
                onChange={(
                  event
                ) =>
                  markDirtyChange(
                    "personal.email",
                    event.target
                      .value
                  )
                }
                placeholder="name@example.com"
              />
            </Field>

            <Field
              label="Personal address"
              icon={
                <MapPin className="h-3.5 w-3.5" />
              }
            >
              <textarea
                rows={3}
                className={
                  textareaClass
                }
                value={
                  data.personal
                    .address
                }
                onChange={(
                  event
                ) =>
                  markDirtyChange(
                    "personal.address",
                    event.target
                      .value
                  )
                }
                placeholder="Address"
              />
            </Field>
          </div>
        </Section>

        <Section
          icon={
            <Building2 className="h-4.5 w-4.5" />
          }
          title="Business profile"
          description="Store identity and customer-facing business information."
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <Field
                  label="Business / store name"
                  icon={
                    <Store className="h-3.5 w-3.5" />
                  }
                >
                  <Input
                    value={
                      data.business
                        .name
                    }
                    onChange={(
                      event
                    ) =>
                      markDirtyChange(
                        "business.name",
                        event.target
                          .value
                      )
                    }
                    placeholder="Store name"
                  />
                </Field>
              </div>

              <Field
                label="Business phone"
                icon={
                  <Phone className="h-3.5 w-3.5" />
                }
              >
                <Input
                  value={
                    data.business
                      .phone
                  }
                  onChange={(
                    event
                  ) =>
                    markDirtyChange(
                      "business.phone",
                      event.target
                        .value
                    )
                  }
                  inputMode="tel"
                  placeholder="Business phone"
                />
              </Field>

              <Field
                label="Business email"
                icon={
                  <Mail className="h-3.5 w-3.5" />
                }
              >
                <Input
                  type="email"
                  value={
                    data.business
                      .email
                  }
                  onChange={(
                    event
                  ) =>
                    markDirtyChange(
                      "business.email",
                      event.target
                        .value
                    )
                  }
                  placeholder="business@example.com"
                />
              </Field>

              <div className="lg:col-span-2">
                <Field
                  label="Business address"
                  icon={
                    <MapPin className="h-3.5 w-3.5" />
                  }
                >
                  <textarea
                    rows={3}
                    className={
                      textareaClass
                    }
                    value={
                      data.business
                        .address
                    }
                    onChange={(
                      event
                    ) =>
                      markDirtyChange(
                        "business.address",
                        event.target
                          .value
                      )
                    }
                    placeholder="Business address"
                  />
                </Field>
              </div>

              <Field
                label="Business type"
                icon={
                  <Building2 className="h-3.5 w-3.5" />
                }
              >
                <select
                  value={
                    data.business
                      .businessType ||
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    markDirtyChange(
                      "business.businessType",
                      event.target
                        .value
                    )
                  }
                  className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
                >
                  {BUSINESS_TYPES.map(
                    (
                      type
                    ) => (
                      <option
                        key={
                          type.value
                        }
                        value={
                          type.value
                        }
                      >
                        {
                          type.label
                        }
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Brand tagline"
                icon={
                  <Tags className="h-3.5 w-3.5" />
                }
              >
                <Input
                  value={
                    data.business
                      .brandTagline ||
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    markDirtyChange(
                      "business.brandTagline",
                      event.target
                        .value
                    )
                  }
                  placeholder="Short brand line"
                />
              </Field>

              <div className="lg:col-span-2">
                <div className="mb-1.5 text-xs font-bold text-heading">
                  Product categories
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCategoryQuery(
                      ""
                    );
                    setCategoryPickerOpen(
                      true
                    );
                  }}
                  className="ls-focus-ring flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-input bg-card px-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {selectedCategories.length
                        ? `${selectedCategories.length} selected`
                        : "Choose categories"}
                    </span>

                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {selectedCategories.length
                        ? selectedCategories.join(
                            ", "
                          )
                        : "Add the main categories your business sells."}
                    </span>
                  </span>

                  <Tags className="h-4 w-4 shrink-0 text-primary" />
                </button>

                {selectedCategories.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedCategories
                      .slice(
                        0,
                        5
                      )
                      .map(
                        (
                          category
                        ) => (
                          <span
                            key={
                              category
                            }
                            className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground"
                          >
                            {
                              category
                            }
                          </span>
                        )
                      )}

                    {selectedCategories.length >
                    5 ? (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                        +
                        {selectedCategories.length -
                          5}{" "}
                        more
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {selectedCategories.includes(
                  "Other"
                ) ? (
                  <div className="mt-3">
                    <Input
                      value={
                        data.business
                          .productCategoryOther ||
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        markDirtyChange(
                          "business.productCategoryOther",
                          event.target
                            .value
                        )
                      }
                      placeholder="Other category"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl bg-surface-soft p-4">
              <div className="text-xs font-bold text-heading">
                Store logo
              </div>

              <div className="mt-3 grid place-items-center rounded-2xl border border-dashed border-border bg-card p-4">
                {logoSrc ? (
                  // Remote WordPress media URL.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      logoSrc
                    }
                    alt="Store logo"
                    className="h-24 w-24 rounded-2xl border border-border bg-card object-contain"
                  />
                ) : (
                  <span className="grid h-24 w-24 place-items-center rounded-2xl bg-muted text-muted-foreground">
                    <ImagePlus className="h-7 w-7" />
                  </span>
                )}

                <div className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">
                  Square PNG or JPG recommended.
                </div>
              </div>

              <div className="mt-3 grid gap-2">
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
                  {logoSrc
                    ? "Replace logo"
                    : "Upload logo"}
                </AsyncButton>

                {logoSrc ? (
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
                    Remove logo
                  </Button>
                ) : null}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(
                  event
                ) => {
                  const file =
                    event.target
                      .files?.[0];

                  event.target.value =
                    "";

                  if (file) {
                    void uploadLogo(
                      file
                    );
                  }
                }}
              />
            </div>
          </div>
        </Section>

        <Section
          icon={
            <MessageCircle className="h-4.5 w-4.5" />
          }
          title="Customer contact & social"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field
              label="Instagram"
              icon={
                <Instagram className="h-3.5 w-3.5" />
              }
            >
              <Input
                value={
                  data.social
                    .instagram ||
                  ""
                }
                onChange={(
                  event
                ) =>
                  markDirtyChange(
                    "social.instagram",
                    event.target
                      .value
                  )
                }
                placeholder="Instagram profile URL"
              />
            </Field>

            <Field
              label="Facebook"
              icon={
                <Facebook className="h-3.5 w-3.5" />
              }
            >
              <Input
                value={
                  data.social
                    .facebook ||
                  ""
                }
                onChange={(
                  event
                ) =>
                  markDirtyChange(
                    "social.facebook",
                    event.target
                      .value
                  )
                }
                placeholder="Facebook page URL"
              />
            </Field>

            <Field
              label="YouTube"
              icon={
                <Youtube className="h-3.5 w-3.5" />
              }
            >
              <Input
                value={
                  data.social
                    .youtube ||
                  ""
                }
                onChange={(
                  event
                ) =>
                  markDirtyChange(
                    "social.youtube",
                    event.target
                      .value
                  )
                }
                placeholder="YouTube channel URL"
              />
            </Field>

            <Field
              label="Customer WhatsApp"
              icon={
                <MessageCircle className="h-3.5 w-3.5" />
              }
            >
              <Input
                value={
                  data.social
                    .whatsappNumber ||
                  ""
                }
                onChange={(
                  event
                ) =>
                  markDirtyChange(
                    "social.whatsappNumber",
                    event.target
                      .value
                  )
                }
                inputMode="tel"
                placeholder="WhatsApp number"
              />
            </Field>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-surface-soft px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-bold text-heading">
                Show WhatsApp button
              </div>

              <div className="mt-0.5 text-xs text-muted-foreground">
                Display the floating WhatsApp shortcut on your storefront.
              </div>
            </div>

            <Switch
              checked={
                Boolean(
                  data.social
                    .showWhatsAppIcon
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
        </Section>

        <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 md:bottom-4">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-[0_12px_28px_rgba(38,51,95,0.12)] backdrop-blur md:gap-3 md:rounded-2xl md:p-2.5">
            <div className="hidden min-w-0 px-1 sm:block">
              <div className="text-xs font-bold text-heading">
                {dirty
                  ? "Unsaved changes"
                  : "All changes saved"}
              </div>
            </div>

            <AsyncButton
              type="button"
              loading={
                saving
              }
              loadingLabel="Saving…"
              className="w-full sm:w-auto"
              disabled={
                !dirty
              }
              onClick={() =>
                void save()
              }
            >
              Save Profile
            </AsyncButton>
          </div>
        </div>
      </div>

      <BottomSheet
        open={
          categoryPickerOpen
        }
        onOpenChange={
          setCategoryPickerOpen
        }
        title="Product categories"
        description="Choose the categories that best describe this business."
        popupClassName="md:mx-auto md:max-w-2xl"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={
              categoryQuery
            }
            onChange={(
              event
            ) =>
              setCategoryQuery(
                event.target.value
              )
            }
            placeholder="Search categories"
            className="pl-10"
          />
        </div>

        <div className="mt-3 grid max-h-[52dvh] gap-2 overflow-y-auto sm:grid-cols-2">
          {filteredCategories.map(
            (
              category
            ) => {
              const active =
                selectedCategories.includes(
                  category
                );

              return (
                <button
                  key={
                    category
                  }
                  type="button"
                  onClick={() =>
                    toggleCategory(
                      category
                    )
                  }
                  className={[
                    "ls-focus-ring flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 text-left",
                    active
                      ? "border-primary bg-secondary"
                      : "border-border bg-card hover:bg-muted",
                  ].join(
                    " "
                  )}
                >
                  <span className="text-sm font-semibold text-foreground">
                    {
                      category
                    }
                  </span>

                  <span
                    className={[
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-transparent",
                    ].join(
                      " "
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            }
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-muted-foreground">
            {
              selectedCategories.length
            }{" "}
            selected
          </span>

          <Button
            type="button"
            onClick={() =>
              setCategoryPickerOpen(
                false
              )
            }
          >
            Done
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
