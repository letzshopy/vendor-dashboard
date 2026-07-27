"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  Gift,
  MailCheck,
  RefreshCw,
  Save,
  Sparkles,
  Users,
} from "lucide-react";

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

const DEFAULT_SETTINGS: WelcomeSettings = {
  enabled: false,
  amount: 100,
  valid_days: 30,
  homepage_visible: true,
  promotional_copy: "",
};

const DEFAULT_STATS: WelcomeStats = {
  issued: 0,
  active: 0,
  redeemed: 0,
  expired: 0,
};

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildWelcomeCopy(
  amount: number,
  validDays: number,
  templateIndex: number
) {
  const money = formatMoney(amount);
  const days = `${validDays} day${validDays === 1 ? "" : "s"}`;

  const templates = [
    `WELCOME OFFER - Sign up today and enjoy ${money} off your first order. Place your order within ${days} of signup to claim the offer.`,
    `WELCOME OFFER - Create your account and get ${money} off your first order. This offer is valid for ${days} from your signup date.`,
    `WELCOME OFFER - Register now and enjoy ${money} off your first order when you shop within ${days} of signup.`,
  ];

  return templates[Math.abs(templateIndex) % templates.length];
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

export default function WelcomeOfferClient() {
  const [settings, setSettings] =
    useState<WelcomeSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<WelcomeStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [promoTemplateIndex, setPromoTemplateIndex] = useState(0);
  const [promoEdited, setPromoEdited] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/welcome-coupon", {
          cache: "no-store",
        });
        const payload =
          (await response.json().catch(() => ({}))) as WelcomeResponse;

        if (!response.ok) {
          throw new Error(
            payload.error || "Failed to load Welcome Offer"
          );
        }

        if (!cancelled) {
          const nextSettings: WelcomeSettings = {
            ...DEFAULT_SETTINGS,
            ...(payload.settings || {}),
          };
          const nextStats: WelcomeStats = {
            ...DEFAULT_STATS,
            ...(payload.stats || {}),
          };

          setSettings(nextSettings);
          setStats(nextStats);
          setPromoEdited(
            Boolean(nextSettings.promotional_copy.trim())
          );
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load Welcome Offer"
          );
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

  const generatedPromotionalCopy = useMemo(
    () =>
      buildWelcomeCopy(
        settings.amount,
        settings.valid_days,
        promoTemplateIndex
      ),
    [settings.amount, settings.valid_days, promoTemplateIndex]
  );

  useEffect(() => {
    if (promoEdited) return;

    setSettings((current) =>
      current.promotional_copy === generatedPromotionalCopy
        ? current
        : {
            ...current,
            promotional_copy: generatedPromotionalCopy,
          }
    );
  }, [generatedPromotionalCopy, promoEdited]);

  async function saveSettings(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !Number.isFinite(settings.amount) ||
      settings.amount <= 0
    ) {
      setError("Enter a discount amount greater than ₹0.");
      return;
    }

    if (
      !Number.isInteger(settings.valid_days) ||
      settings.valid_days < 1 ||
      settings.valid_days > 365
    ) {
      setError("Validity must be between 1 and 365 days.");
      return;
    }

    if (
      settings.homepage_visible &&
      !settings.promotional_copy.trim()
    ) {
      setError(
        "Promotional copy is required when homepage visibility is enabled."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/welcome-coupon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          promotional_copy: settings.promotional_copy.trim(),
        }),
      });
      const payload =
        (await response.json().catch(() => ({}))) as WelcomeResponse;

      if (!response.ok) {
        throw new Error(
          payload.error || "Failed to save Welcome Offer"
        );
      }

      setSettings((current) => ({
        ...current,
        ...(payload.settings || {}),
      }));
      setStats((current) => ({
        ...current,
        ...(payload.stats || {}),
      }));
      setSuccess(
        settings.enabled
          ? "Welcome Offer settings saved for new customer registrations."
          : "Welcome Offer is disabled for future registrations."
      );
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save Welcome Offer"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[26px] border border-slate-200 bg-white px-5 py-14 text-center text-sm text-slate-500 shadow-sm">
        Loading Welcome Offer…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="flex items-start gap-2 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Issued"
          value={stats.issued}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Available"
          value={stats.active}
          icon={<Gift className="h-4 w-4" />}
        />
        <StatCard
          label="Redeemed"
          value={stats.redeemed}
          icon={<MailCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Expired"
          value={stats.expired}
          icon={<Clock3 className="h-4 w-4" />}
        />
      </div>

      <form
        onSubmit={saveSettings}
        className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-indigo-50/60 to-sky-50/60 px-4 py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-sky-500 to-violet-500 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 md:text-xl">
                  New Customer Welcome Offer
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                  Issue one personal first-order benefit automatically
                  when a customer creates an account.
                </p>
              </div>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
                className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  {settings.enabled ? "Enabled" : "Disabled"}
                </span>
                <span className="block text-[11px] text-slate-500">
                  Future registrations
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="space-y-5 p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-800">
                Discount amount
              </label>
              <div className="relative mt-2">
                <BadgeIndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  step="0.01"
                  value={settings.amount}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      amount: Number(event.target.value),
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Applied automatically to the customer’s first eligible
                cart.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">
                Validity from signup
              </label>
              <div className="relative mt-2">
                <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  value={settings.valid_days}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      valid_days: Number.parseInt(
                        event.target.value || "0",
                        10
                      ),
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-16 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  days
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Each customer receives an individual expiry date from
                signup.
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <span className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
                <Eye className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Homepage Visibility
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Show this Welcome Offer inside the storefront Current
                  Offers section while it is enabled.
                </span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings.homepage_visible}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  homepage_visible: event.target.checked,
                }))
              }
              className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>

          <section className="rounded-[22px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-4 md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-800">
                  <Sparkles className="h-4 w-4" />
                  Promotional Copy
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Editable
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Generated from the discount amount and validity in simple
                  customer-facing language. You can edit the final wording.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPromoTemplateIndex(
                    (current) => (current + 1) % 3
                  );
                  setPromoEdited(false);
                }}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </button>
            </div>

            <textarea
              value={settings.promotional_copy}
              onChange={(event) => {
                setSettings((current) => ({
                  ...current,
                  promotional_copy: event.target.value,
                }));
                setPromoEdited(true);
              }}
              rows={5}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />

            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-white px-3 py-1.5 text-slate-600 shadow-sm">
                First order only
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-slate-600 shadow-sm">
                Auto-applied at checkout
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-slate-600 shadow-sm">
                Create Account link
              </span>
            </div>
          </section>

          <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            Disabling the offer stops new welcome benefits from being
            issued. Benefits already issued remain valid until their
            individual expiry date.
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Welcome Offer"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
