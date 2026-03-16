"use client";

import { useEffect, useMemo, useState } from "react";

type Subscription = {
  plan?: string;
  current_plan?: string;
  billing_cycle?: string;
  period?: string;
  billing_status?: string;
  status?: string;
  amount?: number;
  next_renewal_date?: string;
  next_payment_date?: string;
  created_on?: string;
  utr?: string;
  payment_reference?: string;
  payment_mode?: string;
};

type PlanKey = "standard" | "premium";
type BillingCycle = "monthly" | "yearly";

const UPI_ID = "sindhiya4@ybl";
const PAYEE_NAME = "Sindhiya Srinivasan";
const PAYMENT_NUMBER = "9611621621";
const QR_SRC = "/upi-qr.jpeg"; // replace with your actual public QR image path if different

function normalizePlan(raw?: string): PlanKey {
  const v = (raw || "").toLowerCase().trim();
  if (v.includes("premium")) return "premium";
  return "standard";
}

function normalizeCycle(raw?: string): BillingCycle {
  const v = (raw || "").toLowerCase().trim();
  if (v === "monthly" || v === "month") return "monthly";
  return "yearly";
}

function prettyStatus(raw?: string) {
  const v = (raw || "").toLowerCase().trim();
  if (!v) return "-";
  if (v === "payment_submitted") return "Payment Submitted";
  if (v === "pending_payment") return "Pending Payment";
  if (v === "inactive") return "Inactive";
  if (v === "active") return "Active";
  if (v === "expired") return "Expired";
  if (v === "suspended") return "Suspended";
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");
}

function formatDate(raw?: string) {
  if (!raw) return "-";
  return raw;
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
      <span>{children}</span>
    </li>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function BillingSubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sub, setSub] = useState<Subscription | null>(null);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("standard");
  const [utr, setUtr] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/settings/subscription", {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to load subscription");

        const data = (await res.json()) as Subscription;
        if (cancelled) return;

        setSub(data);

        const existingPlan = data.plan || data.current_plan || "";
        const existingCycle = data.billing_cycle || data.period || "";
        const existingRef = data.payment_reference || data.utr || "";

        setSelectedPlan(normalizePlan(existingPlan));
        setBillingCycle(normalizeCycle(existingCycle));
        setUtr(existingRef);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Could not load subscription details. Please try again.");
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

  const selectedAmount = useMemo(() => {
    if (selectedPlan === "standard") {
      return billingCycle === "yearly" ? 7500 : 625;
    }
    return billingCycle === "yearly" ? 9000 : 750;
  }, [selectedPlan, billingCycle]);

  const selectedPlanLabel = useMemo(() => {
    return selectedPlan === "standard"
      ? "Self-Managed Store"
      : "Fully-Managed Store";
  }, [selectedPlan]);

  const currentStatus = sub?.billing_status || sub?.status || "";
  const currentPlan = sub?.plan || sub?.current_plan || "-";
  const currentCycle = sub?.billing_cycle || sub?.period || "-";
  const currentAmount = sub?.amount ?? "-";
  const currentNextDate =
    sub?.next_payment_date || sub?.next_renewal_date || "";
  const currentPaymentRef = sub?.payment_reference || sub?.utr || "";

  async function submitPayment() {
    setError(null);
    setSuccess(null);

    if (!utr.trim()) {
      setError("Enter UTR / transaction number.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        plan: selectedPlan,
        current_plan: selectedPlan,
        billing_cycle: billingCycle,
        period: billingCycle,
        billing_status: "payment_submitted",
        status: "payment_submitted",
        amount: selectedAmount,
        utr: utr.trim(),
        payment_reference: utr.trim(),
        payment_mode: "upi",
      };

      const res = await fetch("/api/settings/subscription", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit payment.");
      }

      const merged: Subscription = {
        ...(sub || {}),
        ...data,
        plan: data?.plan ?? selectedPlan,
        current_plan: data?.current_plan ?? selectedPlan,
        billing_cycle: data?.billing_cycle ?? billingCycle,
        period: data?.period ?? billingCycle,
        billing_status: data?.billing_status ?? "payment_submitted",
        status: data?.status ?? "payment_submitted",
        amount: data?.amount ?? selectedAmount,
        utr: data?.utr ?? utr.trim(),
        payment_reference: data?.payment_reference ?? utr.trim(),
        payment_mode: data?.payment_mode ?? "upi",
      };

      setSub(merged);
      setSuccess(
        "Payment submitted successfully. LetzShopy team will verify and activate your subscription."
      );
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to submit payment.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-600">
        Loading subscription details...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Billing & Subscription
        </h1>
        <p className="text-sm text-slate-600">
          Manage your LetzShopy plan, billing cycle and renewal payment.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryStat label="Status" value={prettyStatus(currentStatus)} />
        <SummaryStat label="Current Plan" value={currentPlan || "-"} />
        <SummaryStat label="Billing Period" value={currentCycle || "-"} />
        <SummaryStat
          label="Amount"
          value={typeof currentAmount === "number" ? `₹${currentAmount}` : "-"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SummaryStat
          label="Next Payment Date"
          value={formatDate(currentNextDate)}
        />
        <SummaryStat
          label="Last Submitted UTR"
          value={currentPaymentRef || "-"}
        />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="text-sm font-semibold text-slate-900">
          Choose billing period
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className={`rounded-xl border px-4 py-2 text-sm font-medium ${
              billingCycle === "monthly"
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly
          </button>

          <button
            type="button"
            className={`rounded-xl border px-4 py-2 text-sm font-medium ${
              billingCycle === "yearly"
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
            onClick={() => setBillingCycle("yearly")}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div
          className={`rounded-3xl border p-5 shadow-sm transition ${
            selectedPlan === "standard"
              ? "border-indigo-500 bg-indigo-50/40"
              : "border-slate-200 bg-white"
          }`}
        >
          <div>
            <div className="text-2xl font-semibold text-slate-900">
              Self-Managed Store
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Vendor manages products, categories, orders, shipping and daily
              operations.
            </p>
          </div>

          <div className="mt-4 text-4xl font-bold text-slate-900">
            ₹{billingCycle === "yearly" ? "7,500" : "625"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            / {billingCycle === "yearly" ? "year" : "month"}
          </div>

          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            <PlanFeature>Dedicated online store website</PlanFeature>
            <PlanFeature>Vendor dashboard access</PlanFeature>
            <PlanFeature>Unlimited product listing</PlanFeature>
            <PlanFeature>Unlimited category creation</PlanFeature>
            <PlanFeature>Mobile-friendly storefront</PlanFeature>
            <PlanFeature>Cart, checkout and customer order flow</PlanFeature>
            <PlanFeature>Order management dashboard</PlanFeature>
            <PlanFeature>UPI payment support</PlanFeature>
            <PlanFeature>Shipping settings and shipment workflow</PlanFeature>
            <PlanFeature>Pack slip generation</PlanFeature>
            <PlanFeature>GST invoice generation</PlanFeature>
            <PlanFeature>Hosting and technical maintenance</PlanFeature>
          </ul>

          <button
            type="button"
            className={`mt-5 rounded-xl border px-4 py-2 text-sm font-medium ${
              selectedPlan === "standard"
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
            onClick={() => setSelectedPlan("standard")}
          >
            {selectedPlan === "standard" ? "Selected plan" : "Choose this plan"}
          </button>
        </div>

        <div
          className={`rounded-3xl border p-5 shadow-sm transition ${
            selectedPlan === "premium"
              ? "border-indigo-500 bg-indigo-50/40"
              : "border-slate-200 bg-white"
          }`}
        >
          <div>
            <div className="text-2xl font-semibold text-slate-900">
              Fully-Managed Store
            </div>
            <p className="mt-1 text-sm text-slate-500">
              LetzShopy team manages product listing, order entry, shipment
              booking and day-to-day operations.
            </p>
          </div>

          <div className="mt-4 text-4xl font-bold text-slate-900">
            ₹{billingCycle === "yearly" ? "9,000" : "750"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            / {billingCycle === "yearly" ? "year" : "month"}
          </div>

          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            <PlanFeature>Everything in Self-Managed plan</PlanFeature>
            <PlanFeature>Product upload by LetzShopy</PlanFeature>
            <PlanFeature>Product categorisation by LetzShopy</PlanFeature>
            <PlanFeature>WhatsApp / Instagram order entry support</PlanFeature>
            <PlanFeature>Shipment booking by LetzShopy team</PlanFeature>
            <PlanFeature>Daily store operations handled by us</PlanFeature>
            <PlanFeature>Priority operational support</PlanFeature>
          </ul>

          <button
            type="button"
            className={`mt-5 rounded-xl border px-4 py-2 text-sm font-medium ${
              selectedPlan === "premium"
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
            onClick={() => setSelectedPlan("premium")}
          >
            {selectedPlan === "premium" ? "Selected plan" : "Choose this plan"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Subscription Payment
            </h2>
            <p className="text-sm text-slate-500">
              Choose your plan and continue with secure online payment.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Amount to pay
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              ₹{selectedAmount}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                GPay / PhonePe / UPI Payment Number
              </div>
              <div className="mt-2 text-3xl font-bold tracking-wide text-slate-900">
                {PAYMENT_NUMBER}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  GPay
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  PhonePe
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  Paytm
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  Any UPI App
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  UPI ID
                </div>
                <div className="mt-2 break-all text-base font-semibold text-slate-900">
                  {UPI_ID}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Payee Name
                </div>
                <div className="mt-2 text-base font-semibold text-slate-900">
                  {PAYEE_NAME}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Selected plan:{" "}
              <span className="font-semibold text-slate-900">
                {selectedPlanLabel}
              </span>{" "}
              · Billing period:{" "}
              <span className="font-semibold capitalize text-slate-900">
                {billingCycle}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
            <img
              src={QR_SRC}
              alt="Subscription payment QR"
              className="mx-auto h-auto w-full max-w-[150px] rounded-lg"
            />
            <p className="mt-3 text-xs text-slate-500">
              Scan this QR in any UPI app
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            UTR / Transaction Number
          </label>
          <input
            type="text"
            placeholder="Enter UTR / Transaction number"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
          />

          <p className="text-xs text-slate-500">
            By proceeding with payment, you agree to our Terms & Conditions and
            Refund Policy.
          </p>

          <button
            type="button"
            onClick={submitPayment}
            disabled={saving}
            className="inline-flex rounded-xl bg-green-600 px-5 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {saving ? "Submitting..." : "Complete Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}