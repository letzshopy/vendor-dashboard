"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DomainRenewalStatus =
  | "inactive"
  | "configuration_required"
  | "active"
  | "upcoming"
  | "payment_due"
  | "critical"
  | "overdue_grace"
  | "grace_expired"
  | "payment_submitted";

type DomainRenewalData = {
  enabled?: boolean;
  domain_name?: string;
  annual_amount?: number;
  amount?: number;
  renewal_date?: string;
  next_renewal_date?: string;
  invoice_date?: string;
  grace_ends_at?: string;
  status?: string;
  payment_status?: string;
  payment_reference?: string;
  payment_submitted_at?: string;
  last_paid_date?: string;
  days_to_renewal?: number | null;
  strong_message?: string;
  history?: Array<{
    id?: string;
    invoice_number?: string;
    domain_name?: string;
    amount?: number;
    paid_date?: string;
    renewal_date?: string;
    period_to?: string;
    payment_reference?: string;
  }>;
};

type Props = {
  blogid: number;
  storeUrl?: string;
};

function toIsoDate(value?: string) {
  if (!value) return "";
  const s = String(value).trim();
  if (!s) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function statusLabel(value?: string) {
  const status = String(value || "").toLowerCase();

  if (status === "payment_submitted") return "Payment Submitted";
  if (status === "configuration_required") return "Configuration Required";
  if (status === "payment_due") return "Payment Due";
  if (status === "overdue_grace") return "Overdue — Grace Active";
  if (status === "grace_expired") return "Grace Period Expired";
  if (status === "critical") return "Critical";
  if (status === "upcoming") return "Upcoming";
  if (status === "active") return "Active";
  return "Inactive";
}

function statusClass(value?: string) {
  const status = String(value || "").toLowerCase();

  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "upcoming") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (status === "payment_due" || status === "payment_submitted") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "critical" || status === "overdue_grace" || status === "grace_expired") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function money(value: number | undefined) {
  const amount = Number(value || 0);

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function safeError(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "error" in value) {
    const error = (value as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }

  return fallback;
}

export default function MasterDomainRenewalCard({ blogid, storeUrl }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [data, setData] = useState<DomainRenewalData | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [annualAmount, setAnnualAmount] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentStatus = (data?.status || "inactive") as DomainRenewalStatus;

  const pendingPayment = useMemo(() => {
    return String(data?.payment_status || data?.status || "").toLowerCase() ===
      "payment_submitted";
  }, [data]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/master/vendors/${blogid}/domain-renewal`,
        { cache: "no-store" }
      );

      const parsed: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(safeError(parsed, "Could not load domain renewal service."));
      }

      const value = parsed as DomainRenewalData;

      setData(value);
      setEnabled(value.enabled === true);
      setDomainName(value.domain_name || "");
      setAnnualAmount(String(value.annual_amount ?? value.amount ?? ""));
      setRenewalDate(toIsoDate(value.renewal_date || value.next_renewal_date));
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load domain renewal service."
      );
    } finally {
      setLoading(false);
    }
  }, [blogid]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveConfig() {
    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/master/vendors/${blogid}/domain-renewal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled,
            domain_name: domainName,
            annual_amount: Number(annualAmount || 0),
            renewal_date: renewalDate,
            storeUrl,
          }),
        }
      );

      const parsed: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(safeError(parsed, "Could not save domain renewal service."));
      }

      setMessage("Domain renewal service updated.");
      await load();
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save domain renewal service."
      );
    } finally {
      setSaving(false);
    }
  }

  async function reviewPayment(status: "active" | "rejected") {
    try {
      setReviewing(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/master/vendors/${blogid}/domain-renewal/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      const parsed: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(safeError(parsed, "Could not review domain renewal payment."));
      }

      setMessage(status === "active" ? "Domain renewal payment approved." : "Domain renewal payment rejected.");
      await load();
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not review domain renewal payment."
      );
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-900">Domain Renewal Service</div>
          <div className="text-xs text-slate-500">
            Separate yearly domain billing. It does not lock subscription access.
          </div>
        </div>

        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(currentStatus)}`}>
          {statusLabel(currentStatus)}
        </span>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Loading domain renewal service...
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Enable yearly domain renewal billing
        </label>

        <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800">
          Billing cycle: <span className="font-semibold">Yearly recurring</span>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Domain name
          </label>
          <input
            value={domainName}
            onChange={(event) => setDomainName(event.target.value)}
            placeholder="example.com"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Annual renewal amount
          </label>
          <input
            value={annualAmount}
            onChange={(event) => setAnnualAmount(event.target.value)}
            inputMode="decimal"
            placeholder="899"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Actual domain renewal / expiry date
          </label>
          <input
            type="date"
            value={renewalDate}
            onChange={(event) => setRenewalDate(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <div>Next invoice date: {data?.invoice_date || "-"}</div>
          <div>Grace ends: {data?.grace_ends_at || "-"}</div>
          <div>Last paid: {data?.last_paid_date || "-"}</div>
        </div>
      </div>

      {data?.strong_message ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {data.strong_message}
        </div>
      ) : null}

      {pendingPayment ? (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
          <div className="font-semibold">Payment awaiting verification</div>
          <div>Reference: {data?.payment_reference || "-"}</div>
          <div>Submitted: {data?.payment_submitted_at || "-"}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={reviewing}
              onClick={() => void reviewPayment("active")}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Approve payment
            </button>
            <button
              type="button"
              disabled={reviewing}
              onClick={() => void reviewPayment("rejected")}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Reject payment
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void saveConfig()}
          disabled={saving || reviewing}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save domain service"}
        </button>
      </div>

      {data?.history?.length ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Renewal history
          </div>
          <div className="divide-y divide-slate-100">
            {data.history.slice(-3).reverse().map((item) => (
              <div key={item.id || item.invoice_number} className="grid gap-1 px-3 py-2 text-xs text-slate-700 md:grid-cols-4">
                <span>{item.invoice_number || item.id}</span>
                <span>{money(item.amount)}</span>
                <span>Paid: {item.paid_date || "-"}</span>
                <span>Next: {item.period_to || "-"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
