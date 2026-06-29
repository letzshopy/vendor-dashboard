"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  UserRound,
  Mail,
  Phone,
  Store,
  KeyRound,
  Save,
  CheckCircle2,
  AlertCircle,
  BadgeInfo,
} from "lucide-react";
import type { AccountSettings } from "@/types/account";

const emptySettings: AccountSettings = {
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

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 " +
  "placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

const readOnlyInputClass =
  "h-11 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600 " +
  "placeholder:text-slate-400 shadow-sm";

function firstFilled(...values: Array<unknown>) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-indigo-50/40 px-4 py-4 md:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            {icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-5">{children}</div>
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
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function AccountTab() {
  const [settings, setSettings] = useState<AccountSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/account/settings", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load account");

        const accountData = await res.json();

        let profileData: any = {};
        try {
          const profileRes = await fetch("/api/settings/profile", {
            cache: "no-store",
          });

          if (profileRes.ok) {
            profileData = await profileRes.json();
          }
        } catch {
          profileData = {};
        }

        const personal = profileData?.personal || {};
        const business = profileData?.business || {};
        const social = profileData?.social || {};

        if (!cancelled) {
          const merged: AccountSettings = {
            ...emptySettings,
            ...accountData,
            overview: {
              ...emptySettings.overview,
              ...(accountData.overview ?? {}),
            },
            contact: {
              contact_name: firstFilled(
                accountData?.contact?.contact_name,
                personal.name
              ),
              contact_email: firstFilled(
                accountData?.contact?.contact_email,
                personal.email,
                business.email
              ),
              contact_mobile: firstFilled(
                accountData?.contact?.contact_mobile,
                personal.mobile,
                business.phone,
                social.whatsappNumber
              ),
            },
            security: {
              login_email: firstFilled(
                accountData?.security?.login_email,
                personal.email,
                business.email
              ),
            },
          };

          setSettings(merged);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Could not load account details. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSavedMsg(null);

    try {
      const payload: AccountSettings = {
        ...settings,
        security: {
          ...settings.security,
          // Display only. Backend also preserves this value.
          login_email: settings.security.login_email,
        },
      };

      const res = await fetch("/api/account/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Save failed");
      }

      setSavedMsg("Account settings saved.");
      setSettings(payload);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSavedMsg(null), 3500);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to save.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPwError(null);
    setPwMsg(null);

    if (!pwNew || pwNew.length < 8) {
      setPwError("Password should be at least 8 characters.");
      return;
    }

    if (pwNew !== pwConfirm) {
      setPwError("Passwords do not match.");
      return;
    }

    setPwSaving(true);

    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: pwNew }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Password update failed");
      }

      setPwMsg("Password updated.");
      setPwNew("");
      setPwConfirm("");
      setShowPwNew(false);
      setShowPwConfirm(false);
      setTimeout(() => setPwMsg(null), 3500);
    } catch (e: any) {
      console.error(e);
      setPwError(e?.message || "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  }

  const s = settings;

  if (loading) {
    return (
      <div className="p-4 md:p-5">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading account details...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 md:space-y-5 md:p-5">
      {savedMsg && (
        <div className="pointer-events-none fixed left-0 right-0 top-[72px] z-40 flex justify-center">
          <div className="pointer-events-auto rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            {savedMsg}
          </div>
        </div>
      )}

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold text-slate-900">
              Account & Security
            </div>
            <div className="mt-1 text-xs text-slate-500 md:text-sm">
              View your store account details, update support contact
              information and manage dashboard password.
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
          {error}
        </div>
      )}

      <SectionCard
        icon={<Store className="h-5 w-5" />}
        title="Account overview"
        description="Basic store account details managed by the LetzShopy team."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="Account ID"
            hint="Generated when your store is created."
          >
            <input
              className={`${readOnlyInputClass}`}
              value={s.overview.account_id}
              readOnly
            />
          </Field>

          <Field label="Store URL">
            <input
              className={`${readOnlyInputClass}`}
              value={s.overview.store_url}
              readOnly
            />
          </Field>

          <Field label="Created on">
            <input
              type="date"
              className={`${readOnlyInputClass}`}
              value={s.overview.created_on || ""}
              readOnly
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        icon={<UserRound className="h-5 w-5" />}
        title="Contact person"
        description="These details are used for LetzShopy communication and support contact."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Contact name">
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                className={`${inputClass} pl-11`}
                value={s.contact.contact_name}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    contact: {
                      ...prev.contact,
                      contact_name: e.target.value,
                    },
                  }))
                }
                placeholder="Enter contact name"
              />
            </div>
          </Field>

          <Field label="Contact email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                className={`${inputClass} pl-11`}
                value={s.contact.contact_email}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    contact: {
                      ...prev.contact,
                      contact_email: e.target.value,
                    },
                  }))
                }
                placeholder="Enter contact email"
              />
            </div>
          </Field>

          <Field
            label="Contact mobile / WhatsApp"
            hint="Auto-filled from Profile when Account contact mobile is empty."
          >
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                className={`${inputClass} pl-11`}
                value={s.contact.contact_mobile}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    contact: {
                      ...prev.contact,
                      contact_mobile: e.target.value,
                    },
                  }))
                }
                placeholder="Enter mobile number"
              />
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        icon={<KeyRound className="h-5 w-5" />}
        title="Access & security"
        description="View login email and update your dashboard password."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Login email"
            hint="Login email is linked to the WordPress dashboard user and cannot be changed here."
          >
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                className={`${readOnlyInputClass} pl-11`}
                value={s.security.login_email}
                readOnly
                aria-readonly="true"
                tabIndex={-1}
                placeholder="Login email"
              />
            </div>
          </Field>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
          <div className="flex items-start gap-2">
            <BadgeInfo className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            <p className="text-xs leading-5 text-indigo-800">
              Login email is created during vendor onboarding. To change it,
              LetzShopy support must update the linked WordPress user account.
            </p>
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-4">
            <div className="text-sm font-semibold text-slate-900">
              Change password
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Use at least 8 characters for a stronger dashboard password.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="New password">
              <div className="relative">
                <input
                  type={showPwNew ? "text" : "password"}
                  className={`${inputClass} pr-11`}
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwNew((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-700"
                  aria-label={showPwNew ? "Hide password" : "Show password"}
                >
                  {showPwNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Field label="Confirm new password">
              <div className="relative">
                <input
                  type={showPwConfirm ? "text" : "password"}
                  className={`${inputClass} pr-11`}
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwConfirm((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-700"
                  aria-label={showPwConfirm ? "Hide password" : "Show password"}
                >
                  {showPwConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={pwSaving}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-black disabled:opacity-60"
            >
              {pwSaving ? "Updating..." : "Update password"}
            </button>

            {pwError && (
              <span className="inline-flex items-center gap-1 text-sm text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {pwError}
              </span>
            )}

            {pwMsg && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {pwMsg}
              </span>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            This updates your LetzShopy dashboard login password.
          </p>
        </div>
      </SectionCard>

      <div className="sticky bottom-3 z-10 md:bottom-4">
        <div className="rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                Save account changes
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Save updated contact information. Login email is managed by
                LetzShopy support.
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
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