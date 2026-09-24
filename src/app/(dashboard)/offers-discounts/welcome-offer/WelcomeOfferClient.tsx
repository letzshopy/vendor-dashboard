"use client";

import {
  Clock3,
  Gift,
  MailCheck,
  RefreshCw,
  Users,
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

type WelcomeSettings = {
  enabled: boolean;
  amount: number;
  valid_days: number;
  homepage_visible: boolean;
  promotional_copy: string;
};

type WelcomeStats = {
  issued: number;
  active: number;
  redeemed: number;
  expired: number;
};

type WelcomeResponse = {
  settings?: Partial<WelcomeSettings>;
  stats?: Partial<WelcomeStats>;
  error?: string;
};

const DEFAULT_SETTINGS:
  WelcomeSettings = {
  enabled: false,
  amount: 100,
  valid_days: 30,
  homepage_visible: true,
  promotional_copy: "",
};

const DEFAULT_STATS:
  WelcomeStats = {
  issued: 0,
  active: 0,
  redeemed: 0,
  expired: 0,
};

function formatMoney(
  value: number
) {
  return `₹${Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits:
        Number.isInteger(
          value
        )
          ? 0
          : 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function buildWelcomeCopy(
  amount: number,
  validDays: number,
  templateIndex: number
) {
  const money =
    formatMoney(amount);

  const days =
    `${validDays} day${validDays === 1 ? "" : "s"}`;

  const templates = [
    `WELCOME OFFER - Sign up today and enjoy ${money} off your first order. Place your order within ${days} of signup to claim the offer.`,
    `WELCOME OFFER - Create your account and get ${money} off your first order. This offer is valid for ${days} from your signup date.`,
    `WELCOME OFFER - Register now and enjoy ${money} off your first order when you shop within ${days} of signup.`,
  ];

  return templates[
    Math.abs(
      templateIndex
    ) %
      templates.length
  ];
}

function stableSettings(
  settings: WelcomeSettings
) {
  return JSON.stringify(
    settings
  );
}

export default function WelcomeOfferClient() {
  const [
    settings,
    setSettings,
  ] =
    useState<WelcomeSettings>(
      DEFAULT_SETTINGS
    );

  const initialRef =
    useRef(
      stableSettings(
        DEFAULT_SETTINGS
      )
    );

  const [
    stats,
    setStats,
  ] =
    useState<WelcomeStats>(
      DEFAULT_STATS
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

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

  const dirty =
    !loading &&
    stableSettings(
      settings
    ) !==
      initialRef.current;

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      setLoading(true);

      try {
        const response =
          await fetch(
            "/api/welcome-coupon",
            {
              cache:
                "no-store",
            }
          );

        const payload =
          (
            await response
              .json()
              .catch(
                () => ({})
              )
          ) as WelcomeResponse;

        if (!response.ok) {
          throw new Error(
            payload.error ||
              "Failed to load Welcome Offer"
          );
        }

        if (!cancelled) {
          const nextSettings:
            WelcomeSettings = {
            ...DEFAULT_SETTINGS,
            ...(
              payload.settings ||
              {}
            ),
          };

          const nextStats:
            WelcomeStats = {
            ...DEFAULT_STATS,
            ...(
              payload.stats ||
              {}
            ),
          };

          setSettings(
            nextSettings
          );
          initialRef.current =
            stableSettings(
              nextSettings
            );
          setStats(nextStats);
          setPromoEdited(
            Boolean(
              nextSettings.promotional_copy.trim()
            )
          );
        }
      } catch (
        error: unknown
      ) {
        if (!cancelled) {
          actionFeedback.error({
            id:
              "welcome-offer-load",
            title:
              "Could not load Welcome Offer",
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
    useMemo(
      () =>
        buildWelcomeCopy(
          settings.amount,
          settings.valid_days,
          promoTemplateIndex
        ),
      [
        settings.amount,
        settings.valid_days,
        promoTemplateIndex,
      ]
    );

  useEffect(() => {
    if (
      promoEdited ||
      !settings.enabled ||
      !settings.homepage_visible
    ) {
      return;
    }

    setSettings(
      (current) =>
        current.promotional_copy ===
        generatedPromotionalCopy
          ? current
          : {
              ...current,
              promotional_copy:
                generatedPromotionalCopy,
            }
    );
  }, [
    generatedPromotionalCopy,
    promoEdited,
  ]);

  async function saveSettings():
    Promise<boolean> {
    if (
      saving ||
      loading
    ) {
      return false;
    }

    if (
      !Number.isFinite(
        settings.amount
      ) ||
      settings.amount <= 0
    ) {
      actionFeedback.warning({
        id:
          "welcome-offer-save",
        title:
          "Enter a valid discount amount",
        durationMs: 2800,
      });

      return false;
    }

    if (
      !Number.isInteger(
        settings.valid_days
      ) ||
      settings.valid_days <
        1 ||
      settings.valid_days >
        365
    ) {
      actionFeedback.warning({
        id:
          "welcome-offer-save",
        title:
          "Validity must be 1–365 days",
        durationMs: 2800,
      });

      return false;
    }

    if (
      settings.homepage_visible &&
      !settings.promotional_copy.trim()
    ) {
      actionFeedback.warning({
        id:
          "welcome-offer-save",
        title:
          "Add promotional copy",
        durationMs: 2800,
      });

      return false;
    }

    const feedbackId =
      "welcome-offer-save";

    setSaving(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Saving Welcome Offer…",
    });

    try {
      const response =
        await fetch(
          "/api/welcome-coupon",
          {
            method:
              "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                ...settings,
                promotional_copy:
                  settings.promotional_copy.trim(),
              }),
          }
        );

      const payload =
        (
          await response
            .json()
            .catch(
              () => ({})
            )
        ) as WelcomeResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ||
            "Failed to save Welcome Offer"
        );
      }

      const nextSettings:
        WelcomeSettings = {
        ...settings,
        ...(
          payload.settings ||
          {}
        ),
      };

      setSettings(
        nextSettings
      );
      initialRef.current =
        stableSettings(
          nextSettings
        );

      setStats(
        (current) => ({
          ...current,
          ...(
            payload.stats ||
            {}
          ),
        })
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          settings.enabled
            ? "Welcome Offer saved"
            : "Welcome Offer disabled",
        durationMs: 2200,
      });

      return true;
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save Welcome Offer",
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

  useUnsavedChanges({
    id:
      "welcome-offer",
    dirty,
    label:
      "Welcome Offer changes",
    save: saveSettings,
  });

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Gift className="h-4.5 w-4.5" />
              </span>

              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-heading">
                  New Customer Offer
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Automatically reward eligible new customers.
                </p>
              </div>
            </div>
          </div>

          <Switch
            checked={
              settings.enabled
            }
            disabled={saving}
            onCheckedChange={(
              checked
            ) =>
              setSettings(
                (
                  current
                ) => ({
                  ...current,
                  enabled:
                    Boolean(
                      checked
                    ),
                })
              )
            }
          />
        </div>

        <div className="grid grid-cols-2 border-t border-border md:grid-cols-4">
          {[
            {
              label:
                "Issued",
              value:
                stats.issued,
              icon: Users,
            },
            {
              label:
                "Available",
              value:
                stats.active,
              icon: Gift,
            },
            {
              label:
                "Redeemed",
              value:
                stats.redeemed,
              icon:
                MailCheck,
            },
            {
              label:
                "Expired",
              value:
                stats.expired,
              icon: Clock3,
            },
          ].map(
            (
              stat,
              index
            ) => {
              const Icon =
                stat.icon;

              return (
                <div
                  key={
                    stat.label
                  }
                  className={[
                    "px-4 py-3 md:px-5",
                    index % 2 ===
                    1
                      ? "border-l border-border"
                      : "",
                    index >= 2
                      ? "border-t border-border md:border-t-0"
                      : "",
                    index > 0
                      ? "md:border-l md:border-border"
                      : "",
                  ].join(
                    " "
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {
                      stat.label
                    }
                  </div>

                  <div className="mt-1 text-lg font-extrabold text-heading">
                    {
                      stat.value
                    }
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-heading">
              Discount amount
            </label>

            <Input
              type="number"
              min="1"
              step="0.01"
              value={
                settings.amount
              }
              disabled={saving}
              onChange={(
                event
              ) =>
                setSettings(
                  (
                    current
                  ) => ({
                    ...current,
                    amount:
                      Number(
                        event.target.value
                      ),
                  })
                )
              }
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-heading">
              Valid for
            </label>

            <div className="relative">
              <Input
                type="number"
                min="1"
                max="365"
                step="1"
                value={
                  settings.valid_days
                }
                disabled={
                  saving
                }
                onChange={(
                  event
                ) =>
                  setSettings(
                    (
                      current
                    ) => ({
                      ...current,
                      valid_days:
                        Number.parseInt(
                          event.target.value ||
                            "0",
                          10
                        ),
                    })
                  )
                }
                className="pr-14"
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                days
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-surface-soft px-4 py-3">
          <div>
            <div className="text-sm font-bold text-heading">
              Show on homepage
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Show this offer in Current Offers while enabled.
            </div>
          </div>

          <Switch
            checked={
              settings.homepage_visible
            }
            disabled={saving}
            onCheckedChange={(
              checked
            ) =>
              setSettings(
                (
                  current
                ) => ({
                  ...current,
                  homepage_visible:
                    Boolean(
                      checked
                    ),
                })
              )
            }
          />
        </div>

        {settings.homepage_visible ? (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-bold text-heading">
                Promotional copy
              </label>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
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
                settings.promotional_copy
              }
              disabled={saving}
              onChange={(
                event
              ) => {
                setSettings(
                  (
                    current
                  ) => ({
                    ...current,
                    promotional_copy:
                      event.target.value,
                  })
                );
                setPromoEdited(
                  true
                );
              }}
              rows={4}
              className="ls-focus-ring mt-2 w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm leading-6 text-foreground"
            />
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-end border-t border-border pt-4">
          <AsyncButton
            type="button"
            loading={saving}
            loadingLabel="Saving…"
            disabled={!dirty}
            onClick={() =>
              void saveSettings()
            }
          >
            Save Welcome Offer
          </AsyncButton>
        </div>
      </section>
    </div>
  );
}
