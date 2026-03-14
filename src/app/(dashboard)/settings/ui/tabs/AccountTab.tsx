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
    security: {
    login_email: "",
  },
};

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
            overview: {
              ...emptySettings.overview,
              ...(data.overview ?? {}),
            },
            contact: {
              ...emptySettings.contact,
              ...(data.contact ?? {}),
            },
            security: {
              ...emptySettings.security,
              ...(data.security ?? {}),
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
      // Save only account/contact/security.
      
      const payload: AccountSettings = {
        ...settings,
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

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Account</h2>
            <p className="text-xs text-slate-500">
              View your LetzShopy account details and login security.
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
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">
                Account overview
              </h3>
              <p className="text-[11px] text-slate-500">
                Basic account ID and store URL. These are set by the LetzShopy
                team.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
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
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Store URL
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                  value={s.overview.store_url}
                  disabled
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
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

            <div className="space-y-3 border-t border-slate-100 pt-3">
              <h4 className="text-xs font-semibold text-slate-800">
                Contact person
              </h4>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
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
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
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
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
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

          {/* Access & security */}
          <section className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
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
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
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

            <div className="space-y-3 border-t border-slate-100 pt-3">
              <h4 className="text-xs font-semibold text-slate-800">
                Change password
              </h4>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
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
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
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