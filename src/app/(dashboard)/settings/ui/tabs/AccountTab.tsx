"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BadgeInfo,
  CalendarDays,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";

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
  actionFeedback,
} from "@/lib/actionFeedback";
import type {
  AccountSettings,
} from "@/types/account";

const emptySettings:
  AccountSettings = {
  overview: {
    account_id: "",
    store_url: "",
    created_on: "",
  },
  contact: {
    contact_name: "",
    contact_email: "",
    contact_mobile: "",
  },
  security: {
    login_email: "",
  },
};

function firstFilled(
  ...values:
    Array<unknown>
) {
  for (
    const value of
    values
  ) {
    const text =
      String(
        value ?? ""
      ).trim();

    if (text) {
      return text;
    }
  }

  return "";
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
      <div className="flex items-start gap-3 border-b border-border px-4 py-3.5 md:px-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          {icon}
        </span>

        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-heading">
            {title}
          </h2>

          {description ? (
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="p-4 md:p-5">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-heading">
        {label}
      </label>

      {children}

      {hint ? (
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ReadOnlyValue({
  icon,
  label,
  value,
}: {
  icon:
    React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-soft px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
        {icon}
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-bold text-heading">
        {value || "—"}
      </div>
    </div>
  );
}

export default function AccountTab() {
  const [
    settings,
    setSettings,
  ] =
    useState<AccountSettings>(
      emptySettings
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
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    savedSnapshot,
    setSavedSnapshot,
  ] =
    useState("");

  const [
    pwNew,
    setPwNew,
  ] =
    useState("");

  const [
    pwConfirm,
    setPwConfirm,
  ] =
    useState("");

  const [
    pwSaving,
    setPwSaving,
  ] =
    useState(false);

  const [
    showPwNew,
    setShowPwNew,
  ] =
    useState(false);

  const [
    showPwConfirm,
    setShowPwConfirm,
  ] =
    useState(false);

  const currentSnapshot =
    useMemo(
      () =>
        JSON.stringify(
          settings
        ),
      [settings]
    );

  const isDirty =
    Boolean(
      savedSnapshot
    ) &&
    currentSnapshot !==
      savedSnapshot;

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            "/api/account/settings",
            {
              cache:
                "no-store",
            }
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load account"
          );
        }

        const accountData =
          await response.json();

        let profileData:
          Record<
            string,
            any
          > = {};

        try {
          const profileResponse =
            await fetch(
              "/api/settings/profile",
              {
                cache:
                  "no-store",
              }
            );

          if (
            profileResponse.ok
          ) {
            profileData =
              await profileResponse.json();
          }
        } catch {
          profileData = {};
        }

        const personal =
          profileData?.personal ||
          {};

        const business =
          profileData?.business ||
          {};

        const social =
          profileData?.social ||
          {};

        const merged:
          AccountSettings = {
          ...emptySettings,
          ...accountData,
          overview: {
            ...emptySettings.overview,
            ...(
              accountData.overview ||
              {}
            ),
          },
          contact: {
            contact_name:
              firstFilled(
                accountData
                  ?.contact
                  ?.contact_name,
                personal.name
              ),
            contact_email:
              firstFilled(
                accountData
                  ?.contact
                  ?.contact_email,
                personal.email,
                business.email
              ),
            contact_mobile:
              firstFilled(
                accountData
                  ?.contact
                  ?.contact_mobile,
                personal.mobile,
                business.phone,
                social.whatsappNumber
              ),
          },
          security: {
            login_email:
              firstFilled(
                accountData
                  ?.security
                  ?.login_email,
                personal.email,
                business.email
              ),
          },
        };

        if (!cancelled) {
          setSettings(
            merged
          );

          setSavedSnapshot(
            JSON.stringify(
              merged
            )
          );
        }
      } catch (
        error: unknown
      ) {
        if (!cancelled) {
          const message =
            error instanceof
              Error
              ? error.message
              : "Could not load account details.";

          setError(
            message
          );

          actionFeedback.error({
            id:
              "account-load",
            title:
              "Could not load account",
            message,
            durationMs: 4200,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function save():
    Promise<boolean> {
    if (
      saving ||
      loading
    ) {
      return false;
    }

    const feedbackId =
      "account-save";

    setSaving(true);
    setError(null);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Saving account…",
    });

    try {
      const payload:
        AccountSettings = {
        ...settings,
        security: {
          ...settings.security,
          login_email:
            settings.security
              .login_email,
        },
      };

      const response =
        await fetch(
          "/api/account/settings",
          {
            method: "PUT",
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

      const parsed =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          parsed?.error ||
            "Save failed"
        );
      }

      const next =
        (
          parsed?.settings ||
          payload
        ) as AccountSettings;

      setSettings(next);
      setSavedSnapshot(
        JSON.stringify(
          next
        )
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Account saved",
        durationMs: 2200,
      });

      return true;
    } catch (
      error: unknown
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Failed to save account.";

      setError(message);

      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save account",
        message,
        durationMs: 4200,
      });

      return false;
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (
      !pwNew ||
      pwNew.length < 8
    ) {
      actionFeedback.warning({
        id:
          "account-password",
        title:
          "Password is too short",
        message:
          "Use at least 8 characters.",
        durationMs: 3200,
      });
      return;
    }

    if (
      pwNew !==
      pwConfirm
    ) {
      actionFeedback.warning({
        id:
          "account-password",
        title:
          "Passwords do not match",
        durationMs: 3200,
      });
      return;
    }

    setPwSaving(true);

    actionFeedback.loading({
      id:
        "account-password",
      title:
        "Updating password…",
    });

    try {
      const response =
        await fetch(
          "/api/account/password",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                new_password:
                  pwNew,
              }),
          }
        );

      const parsed =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          parsed?.error ||
            "Password update failed"
        );
      }

      setPwNew("");
      setPwConfirm("");
      setShowPwNew(false);
      setShowPwConfirm(false);

      actionFeedback.success({
        id:
          "account-password",
        title:
          "Password updated",
        durationMs: 2200,
      });
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id:
          "account-password",
        title:
          "Could not update password",
        message:
          error instanceof
            Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });
    } finally {
      setPwSaving(false);
    }
  }

  useUnsavedChanges({
    id:
      "settings-account",
    dirty: isDirty,
    label:
      "account changes",
    save,
  });

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const s =
    settings;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Section
        icon={
          <Store className="h-4.5 w-4.5" />
        }
        title="Account overview"
        description="Core store account information managed by LetzShopy."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <ReadOnlyValue
            icon={
              <ShieldCheck className="h-3.5 w-3.5" />
            }
            label="Account ID"
            value={
              s.overview
                .account_id
            }
          />

          <ReadOnlyValue
            icon={
              <Store className="h-3.5 w-3.5" />
            }
            label="Store URL"
            value={
              s.overview
                .store_url
            }
          />

          <ReadOnlyValue
            icon={
              <CalendarDays className="h-3.5 w-3.5" />
            }
            label="Created on"
            value={
              s.overview
                .created_on
            }
          />
        </div>
      </Section>

      <Section
        icon={
          <UserRound className="h-4.5 w-4.5" />
        }
        title="Support contact"
        description="Used for LetzShopy communication about this store."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="Contact name">
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                className="pl-10"
                value={
                  s.contact
                    .contact_name
                }
                onChange={(
                  event
                ) =>
                  setSettings(
                    (
                      current
                    ) => ({
                      ...current,
                      contact: {
                        ...current.contact,
                        contact_name:
                          event.target
                            .value,
                      },
                    })
                  )
                }
                placeholder="Contact name"
              />
            </div>
          </Field>

          <Field label="Contact email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                type="email"
                className="pl-10"
                value={
                  s.contact
                    .contact_email
                }
                onChange={(
                  event
                ) =>
                  setSettings(
                    (
                      current
                    ) => ({
                      ...current,
                      contact: {
                        ...current.contact,
                        contact_email:
                          event.target
                            .value,
                      },
                    })
                  )
                }
                placeholder="Contact email"
              />
            </div>
          </Field>

          <Field
            label="Contact mobile / WhatsApp"
            hint="Uses Profile contact when this field is empty."
          >
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                className="pl-10"
                inputMode="tel"
                value={
                  s.contact
                    .contact_mobile
                }
                onChange={(
                  event
                ) =>
                  setSettings(
                    (
                      current
                    ) => ({
                      ...current,
                      contact: {
                        ...current.contact,
                        contact_mobile:
                          event.target
                            .value,
                      },
                    })
                  )
                }
                placeholder="Mobile number"
              />
            </div>
          </Field>
        </div>
      </Section>

      <Section
        icon={
          <KeyRound className="h-4.5 w-4.5" />
        }
        title="Access & security"
        description="Login identity and dashboard password."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div className="space-y-3">
            <Field
              label="Login email"
              hint="Login email is managed by LetzShopy support."
            >
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  type="email"
                  className="cursor-not-allowed bg-surface-soft pl-10"
                  value={
                    s.security
                      .login_email
                  }
                  readOnly
                  aria-readonly="true"
                  tabIndex={-1}
                />
              </div>
            </Field>

            <div className="flex items-start gap-2 rounded-2xl bg-surface-soft px-4 py-3">
              <BadgeInfo className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

              <p className="text-xs leading-5 text-muted-foreground">
                To change the login email, contact LetzShopy support so the linked dashboard account can be updated safely.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-soft p-4">
            <div className="text-sm font-extrabold text-heading">
              Change password
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Use at least 8 characters.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="New password">
                <div className="relative">
                  <Input
                    type={
                      showPwNew
                        ? "text"
                        : "password"
                    }
                    className="pr-11"
                    value={
                      pwNew
                    }
                    onChange={(
                      event
                    ) =>
                      setPwNew(
                        event.target
                          .value
                      )
                    }
                    placeholder="New password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPwNew(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                    className="ls-focus-ring absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-xl text-muted-foreground hover:text-heading"
                    aria-label={
                      showPwNew
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPwNew ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>

              <Field label="Confirm password">
                <div className="relative">
                  <Input
                    type={
                      showPwConfirm
                        ? "text"
                        : "password"
                    }
                    className="pr-11"
                    value={
                      pwConfirm
                    }
                    onChange={(
                      event
                    ) =>
                      setPwConfirm(
                        event.target
                          .value
                      )
                    }
                    placeholder="Confirm password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPwConfirm(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                    className="ls-focus-ring absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-xl text-muted-foreground hover:text-heading"
                    aria-label={
                      showPwConfirm
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPwConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>
            </div>

            <div className="mt-4">
              <AsyncButton
                type="button"
                variant="secondary"
                loading={
                  pwSaving
                }
                loadingLabel="Updating…"
                disabled={
                  !pwNew ||
                  !pwConfirm
                }
                onClick={() =>
                  void changePassword()
                }
              >
                <KeyRound className="h-4 w-4" />
                Update password
              </AsyncButton>
            </div>
          </div>
        </div>
      </Section>

      <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 md:bottom-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-2.5 shadow-[0_14px_36px_rgba(38,51,95,0.14)] backdrop-blur">
          <div className="min-w-0 px-1">
            <div className="text-xs font-bold text-heading">
              {isDirty
                ? "Unsaved account changes"
                : "All changes saved"}
            </div>
          </div>

          <AsyncButton
            type="button"
            loading={saving}
            loadingLabel="Saving…"
            disabled={
              !isDirty
            }
            onClick={() =>
              void save()
            }
          >
            Save Account
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}
