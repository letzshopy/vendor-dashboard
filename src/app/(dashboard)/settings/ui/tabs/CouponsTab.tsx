"use client";

import {
  BadgePercent,
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  TicketPercent,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  ConfirmDialog,
} from "@/components/ui/confirm-dialog";
import {
  EmptyState,
} from "@/components/ui/empty-state";
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

export interface WCCoupon {
  id: number;
  code: string;
  discount_type: string;
  amount: string;
  date_expires?: string | null;
  description?: string;
  usage_limit?: number | null;
  usage_count?: number;
  minimum_amount?: string;
  status?: string;
  homepage_visible?: boolean;
  promotional_copy?: string;
}

type DiscountType =
  | "percent"
  | "fixed_cart"
  | "fixed_product";

type FormState = {
  id?: number;
  code: string;
  discount_type: DiscountType;
  amount: string;
  description: string;
  date_expires: string;
  minimum_amount: string;
  usage_limit: string;
  homepage_visible: boolean;
  promotional_copy: string;
};

function emptyForm(): FormState {
  return {
    code: "",
    discount_type:
      "percent",
    amount: "",
    description: "",
    date_expires: "",
    minimum_amount: "",
    usage_limit: "",
    homepage_visible:
      false,
    promotional_copy: "",
  };
}

function stableForm(
  form: FormState | null
) {
  return form
    ? JSON.stringify(form)
    : "";
}

function formatMoney(
  value: string | number
) {
  const amount =
    Number(value || 0);

  return `₹${amount.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits:
        Number.isInteger(
          amount
        )
          ? 0
          : 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatExpiry(
  value: string
) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    ).format(
      new Date(
        `${value}T00:00:00`
      )
    );
  } catch {
    return value;
  }
}

function discountLabel(
  type: DiscountType,
  amount: string
) {
  if (
    type === "percent"
  ) {
    return `${Number(
      amount || 0
    )}%`;
  }

  return formatMoney(
    amount
  );
}

function promotionalTitle(
  description: string
) {
  const title =
    description
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  return (
    title ||
    "SPECIAL OFFER"
  )
    .slice(0, 120)
    .replace(
      /[\s:;,.-–—]+$/,
      ""
    );
}

function buildPromotionalCopy(
  form: FormState,
  templateIndex: number
) {
  const title =
    promotionalTitle(
      form.description
    );

  const offer =
    discountLabel(
      form.discount_type,
      form.amount
    );

  const minimum =
    Number(
      form.minimum_amount ||
        0
    );

  const expiry =
    formatExpiry(
      form.date_expires
    );

  const expiryText =
    expiry
      ? ` Offer valid until ${expiry}.`
      : "";

  let messages: string[];

  if (
    form.discount_type ===
    "fixed_product"
  ) {
    messages = [
      `Get ${offer} off selected products at checkout.`,
      `Enjoy ${offer} off selected products when you shop.`,
      `Shop selected products and get ${offer} off at checkout.`,
    ];
  } else if (
    minimum > 0
  ) {
    messages = [
      `Shop for ${formatMoney(minimum)} or more and get ${offer} off at checkout.`,
      `Spend ${formatMoney(minimum)} or more and enjoy ${offer} off your order.`,
      `Get ${offer} off when your order reaches ${formatMoney(minimum)}.`,
    ];
  } else {
    messages = [
      `Get ${offer} off your order at checkout.`,
      `Enjoy ${offer} off your order when you shop.`,
      `Shop now and get ${offer} off at checkout.`,
    ];
  }

  const message =
    messages[
      Math.abs(
        templateIndex
      ) %
        messages.length
    ];

  return `${title} - ${message}${expiryText}`;
}

function statusLabel(
  coupon: WCCoupon
) {
  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  if (
    coupon.status ===
    "trash"
  ) {
    return "Trash";
  }

  if (
    coupon.date_expires &&
    coupon.date_expires.slice(
      0,
      10
    ) < today
  ) {
    return "Expired";
  }

  return "Active";
}

function usageSummary(
  coupon: WCCoupon
) {
  const used =
    coupon.usage_count ||
    0;

  const limit =
    typeof coupon.usage_limit ===
      "number" &&
    !Number.isNaN(
      coupon.usage_limit
    )
      ? coupon.usage_limit
      : null;

  return limit
    ? `${used} of ${limit}`
    : `${used} used`;
}

function typeLabel(
  type: string
) {
  if (
    type === "percent"
  ) {
    return "Percentage";
  }

  if (
    type === "fixed_cart"
  ) {
    return "Cart amount";
  }

  if (
    type === "fixed_product"
  ) {
    return "Product amount";
  }

  return type;
}

function FormSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

export default function CouponsTab() {
  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    coupons,
    setCoupons,
  ] =
    useState<WCCoupon[]>(
      []
    );

  const [
    form,
    setForm,
  ] =
    useState<FormState | null>(
      null
    );

  const initialFormRef =
    useRef("");

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    promoTemplateIndex,
    setPromoTemplateIndex,
  ] =
    useState(0);

  const [
    promoEdited,
    setPromoEdited,
  ] =
    useState(false);

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<WCCoupon | null>(
      null
    );

  const editing =
    Boolean(form?.id);

  const dirty =
    Boolean(form) &&
    stableForm(form) !==
      initialFormRef.current;

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      setLoading(true);

      try {
        const response =
          await fetch(
            "/api/coupons",
            {
              cache:
                "no-store",
            }
          );

        const payload =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              "Failed to load coupons"
          );
        }

        if (!cancelled) {
          setCoupons(
            Array.isArray(
              payload.data
            )
              ? payload.data
              : []
          );
        }
      } catch (
        error: unknown
      ) {
        if (!cancelled) {
          actionFeedback.error({
            id:
              "coupons-load",
            title:
              "Could not load coupons",
            message:
              error instanceof
                Error
                ? error.message
                : "Please try again.",
            durationMs: 4200,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const generatedPromotionalCopy =
    useMemo(() => {
      if (!form) {
        return "";
      }

      return buildPromotionalCopy(
        form,
        promoTemplateIndex
      );
    }, [
      form,
      promoTemplateIndex,
    ]);

  useEffect(() => {
    if (
      !form ||
      promoEdited ||
      !form.homepage_visible
    ) {
      return;
    }

    setForm(
      (current) =>
        current &&
        current.promotional_copy !==
          generatedPromotionalCopy
          ? {
              ...current,
              promotional_copy:
                generatedPromotionalCopy,
            }
          : current
    );
  }, [
    generatedPromotionalCopy,
    promoEdited,
    form,
  ]);

  const stats =
    useMemo(() => {
      const active =
        coupons.filter(
          (coupon) =>
            statusLabel(
              coupon
            ) === "Active"
        ).length;

      const publicOffers =
        coupons.filter(
          (coupon) =>
            statusLabel(
              coupon
            ) === "Active" &&
            coupon.homepage_visible
        ).length;

      return {
        total:
          coupons.length,
        active,
        publicOffers,
      };
    }, [coupons]);

  function openCreate() {
    const next =
      emptyForm();

    initialFormRef.current =
      stableForm(next);

    setForm(next);
    setPromoTemplateIndex(
      0
    );
    setPromoEdited(false);
  }

  function openEdit(
    coupon: WCCoupon
  ) {
    const next:
      FormState = {
      id: coupon.id,
      code:
        coupon.code || "",
      discount_type:
        (
          coupon.discount_type as DiscountType
        ) || "percent",
      amount:
        coupon.amount || "",
      description:
        coupon.description ||
        "",
      date_expires:
        coupon.date_expires
          ? coupon.date_expires.slice(
              0,
              10
            )
          : "",
      minimum_amount:
        coupon.minimum_amount ||
        "",
      usage_limit:
        typeof coupon.usage_limit ===
        "number"
          ? String(
              coupon.usage_limit
            )
          : "",
      homepage_visible:
        Boolean(
          coupon.homepage_visible
        ),
      promotional_copy:
        coupon.promotional_copy ||
        "",
    };

    initialFormRef.current =
      stableForm(next);

    setForm(next);
    setPromoTemplateIndex(
      0
    );
    setPromoEdited(
      Boolean(
        next.promotional_copy.trim()
      )
    );
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setForm(null);
    setPromoEdited(false);
    initialFormRef.current =
      "";
  }

  async function saveForm():
    Promise<boolean> {
    if (
      !form ||
      saving
    ) {
      return false;
    }

    if (!form.code.trim()) {
      actionFeedback.warning({
        id:
          "coupon-save",
        title:
          "Coupon code is required",
        durationMs: 2600,
      });

      return false;
    }

    if (
      !form.amount.trim() ||
      Number(form.amount) <=
        0
    ) {
      actionFeedback.warning({
        id:
          "coupon-save",
        title:
          "Enter a discount amount",
        durationMs: 2600,
      });

      return false;
    }

    if (
      form.homepage_visible &&
      !form.promotional_copy.trim()
    ) {
      actionFeedback.warning({
        id:
          "coupon-save",
        title:
          "Add promotional copy",
        durationMs: 2600,
      });

      return false;
    }

    const feedbackId =
      "coupon-save";

    setSaving(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        editing
          ? "Saving coupon…"
          : "Creating coupon…",
    });

    try {
      const payload = {
        code:
          form.code.trim(),
        discount_type:
          form.discount_type,
        amount:
          form.amount.trim(),
        description:
          form.description.trim(),
        date_expires:
          form.date_expires ||
          null,
        minimum_amount:
          form.minimum_amount.trim(),
        usage_limit:
          form.usage_limit
            ? Number.parseInt(
                form.usage_limit,
                10
              )
            : null,
        homepage_visible:
          form.homepage_visible,
        promotional_copy:
          form.promotional_copy.trim(),
      };

      const response =
        editing && form.id
          ? await fetch(
              `/api/coupons/${form.id}`,
              {
                method:
                  "PUT",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body:
                  JSON.stringify(
                    payload
                  ),
              }
            )
          : await fetch(
              "/api/coupons",
              {
                method:
                  "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body:
                  JSON.stringify(
                    payload
                  ),
              }
            );

      const result =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Save failed"
        );
      }

      const saved =
        result.data as WCCoupon;

      setCoupons(
        (current) => {
          const index =
            current.findIndex(
              (coupon) =>
                coupon.id ===
                saved.id
            );

          if (index < 0) {
            return [
              saved,
              ...current,
            ];
          }

          const next = [
            ...current,
          ];

          next[index] =
            saved;

          return next;
        }
      );

      setForm(null);
      initialFormRef.current =
        "";
      setPromoEdited(false);

      actionFeedback.success({
        id: feedbackId,
        title:
          editing
            ? "Coupon updated"
            : "Coupon created",
        durationMs: 2200,
      });

      return true;
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save coupon",
        message:
          error instanceof
            Error
            ? error.message
            : "Save failed.",
        durationMs: 4200,
      });

      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteCoupon() {
    const coupon =
      deleteTarget;

    if (!coupon) {
      return;
    }

    const feedbackId =
      `coupon-delete-${coupon.id}`;

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Deleting coupon…",
      message:
        coupon.code,
    });

    try {
      const response =
        await fetch(
          `/api/coupons/${coupon.id}`,
          {
            method:
              "DELETE",
          }
        );

      const result =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Delete failed"
        );
      }

      setCoupons(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              coupon.id
          )
      );

      setDeleteTarget(
        null
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Coupon deleted",
        durationMs: 2000,
      });
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not delete coupon",
        message:
          error instanceof
            Error
            ? error.message
            : "Delete failed.",
        durationMs: 4200,
      });
    }
  }

  useUnsavedChanges({
    id:
      "coupon-editor",
    dirty,
    label:
      "coupon changes",
    save: saveForm,
  });

  return (
    <>
      <div className="flex items-center justify-between gap-3 py-0.5">
        <div>
          <span className="text-[21px] font-extrabold tracking-tight text-heading md:text-base">
            {stats.total}
          </span>
          <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
            coupons
          </span>
        </div>

        <Button
          type="button"
          onClick={
            openCreate
          }
        >
          <Plus className="h-4 w-4" />
          Add coupon
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-bold text-secondary-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {stats.active} active
        </span>

        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-bold text-secondary-foreground">
          <Eye className="h-3.5 w-3.5" />
          {stats.publicOffers} on homepage
        </span>
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({
              length: 5,
            }).map(
              (
                _,
                index
              ) => (
                <div
                  key={index}
                  className="flex items-center gap-3"
                >
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                </div>
              )
            )}
          </div>
        ) : coupons.length ===
          0 ? (
          <EmptyState
            icon={TicketPercent}
            title="No coupons yet"
            description="Create your first customer discount."
            action={
              <Button
                onClick={
                  openCreate
                }
              >
                <Plus className="h-4 w-4" />
                Add coupon
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {coupons.map(
              (
                coupon
              ) => {
                const status =
                  statusLabel(
                    coupon
                  );

                return (
                  <article
                    key={
                      coupon.id
                    }
                    className="flex min-w-0 items-center gap-3 px-4 py-3 md:px-5"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                      <TicketPercent className="h-4.5 w-4.5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-extrabold uppercase tracking-wide text-heading">
                          {
                            coupon.code
                          }
                        </span>

                        <span
                          className={[
                            "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold",
                            status ===
                            "Active"
                              ? "bg-emerald-50 text-emerald-700"
                              : status ===
                                  "Expired"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600",
                          ].join(
                            " "
                          )}
                        >
                          {
                            status
                          }
                        </span>
                      </div>

                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-bold text-heading">
                          {discountLabel(
                            coupon.discount_type as DiscountType,
                            coupon.amount
                          )}
                        </span>

                        <span>
                          {typeLabel(
                            coupon.discount_type
                          )}
                        </span>

                        <span>
                          {usageSummary(
                            coupon
                          )}
                        </span>

                        {coupon.date_expires ? (
                          <span>
                            Ends{" "}
                            {formatExpiry(
                              coupon.date_expires.slice(
                                0,
                                10
                              )
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        openEdit(
                          coupon
                        )
                      }
                      aria-label={
                        `Edit ${coupon.code}`
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() =>
                        setDeleteTarget(
                          coupon
                        )
                      }
                      aria-label={
                        `Delete ${coupon.code}`
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      <BottomSheet
        open={
          form !== null
        }
        onOpenChange={(
          open
        ) => {
          if (!open) {
            closeForm();
          }
        }}
        title={
          editing
            ? "Edit coupon"
            : "Add coupon"
        }
        description="Set the discount, expiry and storefront visibility."
        popupClassName="md:mx-auto md:max-w-3xl"
      >
        {form ? (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-heading">
                Coupon code
              </label>

              <Input
                value={
                  form.code
                }
                disabled={
                  saving
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    code:
                      event.target.value,
                  })
                }
                placeholder="AASHADA500"
                className="uppercase tracking-wide"
              />
            </div>

            <div>
              <div className="mb-1.5 text-xs font-bold text-heading">
                Discount type
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      value:
                        "percent",
                      label: "%",
                      sub:
                        "Percentage",
                    },
                    {
                      value:
                        "fixed_cart",
                      label: "₹",
                      sub:
                        "Cart",
                    },
                    {
                      value:
                        "fixed_product",
                      label: "₹",
                      sub:
                        "Product",
                    },
                  ] as const
                ).map(
                  (
                    option
                  ) => {
                    const active =
                      form.discount_type ===
                      option.value;

                    return (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          setForm({
                            ...form,
                            discount_type:
                              option.value,
                          })
                        }
                        className={[
                          "ls-focus-ring min-h-16 rounded-xl border text-center",
                          active
                            ? "border-primary bg-secondary text-secondary-foreground"
                            : "border-border bg-card text-muted-foreground",
                        ].join(
                          " "
                        )}
                      >
                        <span className="block text-lg font-extrabold">
                          {
                            option.label
                          }
                        </span>
                        <span className="mt-0.5 block text-[11px] font-bold">
                          {
                            option.sub
                          }
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-heading">
                  Discount amount
                </label>

                <Input
                  inputMode="decimal"
                  value={
                    form.amount
                  }
                  disabled={
                    saving
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      amount:
                        event.target.value,
                    })
                  }
                  placeholder={
                    form.discount_type ===
                    "percent"
                      ? "20"
                      : "500"
                  }
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-heading">
                  Expiry date
                </label>

                <Input
                  type="date"
                  value={
                    form.date_expires
                  }
                  disabled={
                    saving
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      date_expires:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-heading">
                  Minimum order
                </label>

                <Input
                  inputMode="decimal"
                  value={
                    form.minimum_amount
                  }
                  disabled={
                    saving
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      minimum_amount:
                        event.target.value,
                    })
                  }
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-heading">
                  Usage limit
                </label>

                <Input
                  inputMode="numeric"
                  value={
                    form.usage_limit
                  }
                  disabled={
                    saving
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      usage_limit:
                        event.target.value,
                    })
                  }
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-heading">
                Internal description
              </label>

              <textarea
                value={
                  form.description
                }
                disabled={
                  saving
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    description:
                      event.target.value,
                  })
                }
                rows={3}
                className="ls-focus-ring w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground"
                placeholder="Optional reference note"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-soft px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-bold text-heading">
                  Show on homepage
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Show this offer in the storefront Current Offers area.
                </div>
              </div>

              <Switch
                checked={
                  form.homepage_visible
                }
                disabled={
                  saving
                }
                onCheckedChange={(
                  checked
                ) =>
                  setForm({
                    ...form,
                    homepage_visible:
                      Boolean(
                        checked
                      ),
                  })
                }
              />
            </div>

            {form.homepage_visible ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-bold text-heading">
                    Promotional copy
                  </label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPromoTemplateIndex(
                        (
                          current
                        ) =>
                          (
                            current +
                            1
                          ) % 3
                      );
                      setPromoEdited(
                        false
                      );
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerate
                  </Button>
                </div>

                <textarea
                  value={
                    form.promotional_copy
                  }
                  disabled={
                    saving
                  }
                  onChange={(
                    event
                  ) => {
                    setForm({
                      ...form,
                      promotional_copy:
                        event.target.value,
                    });
                    setPromoEdited(
                      true
                    );
                  }}
                  rows={4}
                  className="ls-focus-ring mt-2 w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm leading-6 text-foreground"
                />
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={
                  saving
                }
                onClick={
                  closeForm
                }
              >
                Cancel
              </Button>

              <AsyncButton
                type="button"
                loading={
                  saving
                }
                loadingLabel="Saving…"
                disabled={
                  !dirty
                }
                onClick={() =>
                  void saveForm()
                }
              >
                {editing
                  ? "Save changes"
                  : "Create coupon"}
              </AsyncButton>
            </div>
          </div>
        ) : (
          <FormSkeleton />
        )}
      </BottomSheet>

      <ConfirmDialog
        open={
          deleteTarget !==
          null
        }
        onOpenChange={(
          open
        ) => {
          if (!open) {
            setDeleteTarget(
              null
            );
          }
        }}
        title="Delete coupon?"
        description={
          deleteTarget
            ? `Delete “${deleteTarget.code}”? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete coupon"
        destructive
        onConfirm={
          deleteCoupon
        }
      />
    </>
  );
}
