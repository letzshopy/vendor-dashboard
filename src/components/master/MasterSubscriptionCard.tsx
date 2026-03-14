"use client";

import { useMemo, useState } from "react";

type SubscriptionStatus =
  | "inactive"
  | "pending_payment"
  | "payment_submitted"
  | "active"
  | "suspended"
  | "expired";

type SubscriptionPlan = "standard" | "premium";
type SubscriptionPeriod = "monthly" | "yearly";

export type MasterSubscriptionData = {
  plan?: string;
  period?: string;
  status?: string;
  amount?: number | string;
  payment_mode?: string;
  payment_reference?: string;
  last_paid_date?: string;
  next_payment_date?: string;
  last_billed_at?: string;
  next_renewal_at?: string;
};

type Props = {
  blogid: number;
  initial: MasterSubscriptionData;
};

function toIsoDate(value?: string) {
  if (!value) return "";
  const s = String(value).trim();
  if (!s) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m1 = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return "";
}

function addMonths(iso: string, months: number) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function addYears(iso: string, years: number) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function prettyStatus(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending_payment") return "Pending Payment";
  if (s === "payment_submitted") return "Payment Submitted";
  if (s === "active") return "Active";
  if (s === "suspended") return "Suspended";
  if (s === "expired") return "Expired";
  return "Inactive";
}

function statusPillClass(status: string) {
  const s = (status || "").toLowerCase();

  if (s === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (s === "pending_payment" || s === "payment_submitted") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (s === "suspended" || s === "expired") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function MasterSubscriptionCard({
  blogid,
  initial,
}: Props) {
  const [plan, setPlan] = useState<SubscriptionPlan>(
    initial.plan === "premium" ? "premium" : "standard"
  );
  const [period, setPeriod] = useState<SubscriptionPeriod>(
    initial.period === "monthly" ? "monthly" : "yearly"
  );
  const [status, setStatus] = useState<SubscriptionStatus>(
    (initial.status as SubscriptionStatus) || "inactive"
  );
  const [amount, setAmount] = useState<string>(
    String(initial.amount ?? "")
  );
  const [paymentMode, setPaymentMode] = useState(
    initial.payment_mode || "UPI"
  );
  const [paymentReference, setPaymentReference] = useState(
    initial.payment_reference || ""
  );
  const [lastPaidDate, setLastPaidDate] = useState(
    toIsoDate(initial.last_paid_date || initial.last_billed_at)
  );
  const [nextPaymentDate, setNextPaymentDate] = useState(
    toIsoDate(initial.next_payment_date || initial.next_renewal_at)
  );

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const suggestedAmount = useMemo(() => {
    if (plan === "standard" && period === "monthly") return 625;
    if (plan === "standard" && period === "yearly") return 7500;
    if (plan === "premium" && period === "monthly") return 999;
    return 12000;
  }, [plan, period]);

  function applySuggestedAmount() {
    setAmount(String(suggestedAmount));
  }

  function handleActivate() {
    const today = new Date().toISOString().slice(0, 10);
    setStatus("active");
    setLastPaidDate(today);
    setNextPaymentDate(
      period === "monthly" ? addMonths(today, 1) : addYears(today, 1)
    );
    if (!amount) setAmount(String(suggestedAmount));
  }

  function handleSuspend() {
    setStatus("suspended");
  }

  async function handleSave() {
    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const payload = {
        subscription: {
          plan,
          period,
          status,
          amount: amount ? Number(amount) : 0,
          payment_mode: paymentMode,
          payment_reference: paymentReference,
          last_paid_date: lastPaidDate,
          next_payment_date: nextPaymentDate,
          // keep backward-compatible fields too
          last_billed_at: lastPaidDate,
          next_renewal_at: nextPaymentDate,
        },
      };

      const res = await fetch(`/api/master/vendors/${blogid}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to save subscription");
      }

      setMsg("Subscription updated.");
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Failed to save subscription");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-900">Subscription</div>
          <div className="text-xs text-slate-500">
            Master control for plan, status, billing dates and payment verification.
          </div>
        </div>

        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusPillClass(
            status
          )}`}
        >
          {prettyStatus(status)}
        </span>
      </div>

      {err && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {err}
        </div>
      )}

      {msg && (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {msg}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Plan
          </label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as SubscriptionPlan)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          >
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Billing Cycle
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as SubscriptionPeriod)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          >
            <option value="inactive">Inactive</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="payment_submitted">Payment Submitted</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Amount
          </label>
          <div className="flex gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="0"
            />
            <button
              type="button"
              onClick={applySuggestedAmount}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Use Plan
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Payment Mode
          </label>
          <input
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            placeholder="UPI"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Payment Reference / UTR
          </label>
          <input
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            placeholder="UTR / Transaction ID"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Last Paid Date
          </label>
          <input
            type="date"
            value={lastPaidDate}
            onChange={(e) => setLastPaidDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Next Payment Date
          </label>
          <input
            type="date"
            value={nextPaymentDate}
            onChange={(e) => setNextPaymentDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Suggested Amount</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            ₹{suggestedAmount.toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Based on {plan} / {period}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleActivate}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Activate Subscription
        </button>

        <button
          type="button"
          onClick={handleSuspend}
          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Suspend
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}