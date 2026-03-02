// src/app/settings/ui/tabs/AccountTab.tsx
"use client";

import { useEffect, useState } from "react";
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
  subscription: {
    current_plan: "Trial",
    billing_cycle: "Yearly",
    amount_label: "",
    billing_status: "",
    next_renewal_date: "",
    gstin: "",
    billing_name: "",
    business_name: "",
    billing_address: "",
    autopay_enabled: true, // default ON; backend can override
  },
  security: {
    login_email: "",
  },
};

// --- helpers for billing status / plan --- //
function getServerStatus(
  s: AccountSettings
): "trial" | "active" | "cancelled" | "expired" | "" {
  const server = (s.subscription.billing_status || "").toLowerCase();

  if (server === "trial") return "trial";
  if (server === "active") return "active";
  if (server === "cancelled") return "cancelled";
  if (server === "expired") return "expired";

  return "";
}

function labelForStatus(status: string): string {
  if (!status) return "";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AccountTab() {
  const [settings, setSettings] = useState<AccountSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // change-password local state
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  // Load from /api/account/settings
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/account/settings", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load account");
        const data = await res.json();

        if (!cancelled) {
          const merged: AccountSettings = {
            ...emptySettings,
            ...data,
            subscription: {
              ...emptySettings.subscription,
              ...(data.subscription ?? {}),
            },
          };

          // Force cycle to Yearly in UI
          merged.subscription.billing_cycle = "Yearly";

          // If backend didn’t send autopay flag, default to true
          if (typeof merged.subscription.autopay_enabled !== "boolean") {
            merged.subscription.autopay_enabled = true;
          }

          setSettings(merged);
        }
      } catch (e: any) {
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
      const serverStatus = getServerStatus(settings);
      const effectiveStatus =
        serverStatus || settings.subscription.billing_status || "";

      // Plan label derived only from status:
      const planLabel = effectiveStatus === "trial" ? "Trial" : "Paid";

      const payload: AccountSettings = {
        ...settings,
        subscription: {
          ...settings.subscription,
          billing_cycle: "Yearly",
          billing_status: effectiveStatus,
          current_plan: planLabel,
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
    } catch (e: any) {
      console.error(e);
      setPwError(e?.message || "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  }

  const s = settings;

  const serverStatus = getServerStatus(s);
  const effectiveStatus = serverStatus || s.subscription.billing_status || "";
  const statusLabel = labelForStatus(effectiveStatus);
  const planLabel = effectiveStatus === "trial" ? "Trial" : "Paid";

  const autopayLabel = s.subscription.autopay_enabled
    ? "AutoPay ON"
    : "AutoPay OFF";
  const autopayPillClass = s.subscription.autopay_enabled
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Account & Subscription
            </h2>
            <p className="text-xs text-slate-500">
              View your LetzShopy account details, subscription status and
              login security.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </div>
        )}
        {savedMsg && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {savedMsg}
          </div>
        )}
      </header>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
          Loading account details…
        </div>
      ) : (
        <>
          {/* Account overview */}
          <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900">
                  Account overview
                </h3>
                <p className="text-[11px] text-slate-500">
                  Basic account ID and store URL. These are set by the LetzShopy
                  team.
                </p>
              </div>
              {planLabel && (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-[2px] text-[10px] font-medium text-indigo-700">
                  Plan: {planLabel}
                </span>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Account ID
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                  value={s.overview.account_id}
                  disabled
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Generated when we create your store (e.g. LS-00023).
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Store URL
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                  value={s.overview.store_url}
                  disabled
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Created on
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                  value={s.overview.created_on || ""}
                  disabled
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-semibold text-slate-800">
                Contact person
              </h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Contact name
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white"
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
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Contact email
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white"
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
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Contact mobile / WhatsApp
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white"
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
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Subscription & billing */}
          <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900">
                  Subscription & billing
                </h3>
                <p className="text-[11px] text-slate-500">
                  Your LetzShopy SaaS plan, renewal date and GST invoice
                  details.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {statusLabel && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-[2px] text-[10px] font-medium text-slate-700">
                    Status: {statusLabel}
                  </span>
                )}
                {s.subscription.amount_label && (
                  <span className="text-[11px] text-slate-500">
                    {s.subscription.amount_label} / year
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Current plan
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                  value={planLabel}
                  disabled
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Billing cycle
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                  value={`Yearly${
                    s.subscription.amount_label
                      ? ` • ${s.subscription.amount_label}`
                      : ""
                  }`}
                  disabled
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Billing status
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                  value={statusLabel || "-"}
                  disabled
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Next renewal date
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white"
                  value={s.subscription.next_renewal_date || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      subscription: {
                        ...prev.subscription,
                        next_renewal_date: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Billing / invoice name
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white"
                  value={s.subscription.billing_name}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      subscription: {
                        ...prev.subscription,
                        billing_name: e.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Business / trade name
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white"
                  value={s.subscription.business_name}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      subscription: {
                        ...prev.subscription,
                        business_name: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  GSTIN (optional)
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white"
                  value={s.subscription.gstin}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      subscription: {
                        ...prev.subscription,
                        gstin: e.target.value.toUpperCase(),
                      },
                    }))
                  }
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Billing address
              </label>
              <textarea
                className="w-full min-h-[72px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white"
                value={s.subscription.billing_address}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    subscription: {
                      ...prev.subscription,
                      billing_address: e.target.value,
                    },
                  }))
                }
              />
            </div>

            {/* Autopay toggle */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-800">
                    AutoPay (Easebuzz)
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Enable AutoPay so your subscription renews automatically
                    every year via Easebuzz mandate.
                  </p>
                </div>

                {/* toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      subscription: {
                        ...prev.subscription,
                        autopay_enabled: !prev.subscription.autopay_enabled,
                      },
                    }))
                  }
                  className={`relative flex h-6 w-11 items-center rounded-full border transition-colors ${
                    s.subscription.autopay_enabled
                      ? "border-emerald-500 bg-emerald-500/90"
                      : "border-slate-300 bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      s.subscription.autopay_enabled
                        ? "translate-x-[18px]"
                        : "translate-x-[2px]"
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-[11px] text-slate-600">
                <div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-[2px] text-[10px] font-medium ${autopayPillClass}`}
                  >
                    {autopayLabel}
                  </span>
                  <p className="mt-2">
                    AutoPay runs through Easebuzz. To pause, resume or cancel
                    your subscription, please raise a support ticket. Our team
                    will update your mandate and subscription status.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/support/tickets?reason=pause-autopay"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] hover:bg-slate-50"
                  >
                    Pause / Resume AutoPay (Ticket)
                  </a>
                  <a
                    href="/support/tickets?reason=cancel-subscription"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] text-rose-700 hover:bg-rose-50"
                  >
                    Request Cancellation (Ticket)
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Access & security */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">
                Access & security
              </h3>
              <p className="text-[11px] text-slate-500">
                Update your dashboard login email and password.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Login email for this dashboard
                </label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white"
                  value={s.security.login_email}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        login_email: e.target.value,
                      },
                    }))
                  }
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  This will be kept in sync with your WordPress user email on
                  the server.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-semibold text-slate-800">
                Change password
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    New password
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white"
                    value={pwNew}
                    onChange={(e) => setPwNew(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-black disabled:opacity-60"
                >
                  {pwSaving ? "Updating…" : "Update password"}
                </button>
                {pwError && (
                  <span className="text-[11px] text-rose-600">{pwError}</span>
                )}
                {pwMsg && (
                  <span className="text-[11px] text-emerald-600">{pwMsg}</span>
                )}
              </div>

              <p className="text-[10px] text-slate-500">
                This updates your LetzShopy dashboard password. We’ll map this
                to the WordPress user on the backend.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
