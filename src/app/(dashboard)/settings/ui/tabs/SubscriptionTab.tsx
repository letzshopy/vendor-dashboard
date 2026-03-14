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

const UPI_ID = "mosinboutiquebysindhiya-1@okicici";

function normalizePlan(raw?: string): PlanKey {
  const v = (raw || "").toLowerCase().trim();
  if (v.includes("premium")) return "premium";
  if (v === "premium") return "premium";
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
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");
}

function formatDate(raw?: string) {
  if (!raw) return "-";
  return raw;
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
      <span>{children}</span>
    </li>
  );
}

export default function SubscriptionTab() {
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
    return billingCycle === "yearly" ? 12000 : 999;
  }, [selectedPlan, billingCycle]);

  const selectedPlanLabel = useMemo(() => {
    return selectedPlan === "standard" ? "Standard Plan" : "Premium Plan";
  }, [selectedPlan]);

  const currentStatus = sub?.billing_status || sub?.status || "";
  const currentPlan = sub?.plan || sub?.current_plan || "-";
  const currentCycle = sub?.billing_cycle || sub?.period || "-";
  const currentAmount = sub?.amount ?? "-";
  const currentNextDate =
    sub?.next_payment_date || sub?.next_renewal_date || "";
  const currentPaymentRef = sub?.payment_reference || sub?.utr || "";

  function upiLink() {
    const note = encodeURIComponent(
      `LetzShopy ${selectedPlanLabel} ${billingCycle} subscription`
    );

    return `upi://pay?pa=${UPI_ID}&pn=LetzShopy&am=${selectedAmount}&cu=INR&tn=${note}`;
  }

  async function submitPayment() {
    setError(null);
    setSuccess(null);

    if (!utr.trim()) {
      setError("Enter UTR / Transaction number.");
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
    <div className="max-w-5xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Subscription</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose your LetzShopy plan, make payment via UPI, then submit the UTR
          so our team can verify and activate your subscription.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Current subscription */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">
          Current subscription
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">Status</div>
            <div className="font-medium text-slate-900">
              {prettyStatus(currentStatus)}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Current plan</div>
            <div className="font-medium text-slate-900">
              {currentPlan || "-"}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Billing period</div>
            <div className="font-medium text-slate-900">
              {currentCycle || "-"}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Amount</div>
            <div className="font-medium text-slate-900">
              {typeof currentAmount === "number" ? `₹${currentAmount}` : "-"}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Next payment date</div>
            <div className="font-medium text-slate-900">
              {formatDate(currentNextDate)}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Last submitted UTR</div>
            <div className="font-medium text-slate-900">
              {currentPaymentRef || "-"}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Once payment is verified, LetzShopy team will activate your plan and
          update your next payment date.
        </p>
      </div>

      {/* Billing cycle */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">
          Choose billing period
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            className={`rounded-lg border px-4 py-2 text-sm ${
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
            className={`rounded-lg border px-4 py-2 text-sm ${
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

      {/* Plans */}
      <div className="grid gap-4 md:grid-cols-2">
        <div
          className={`rounded-2xl border p-5 shadow-sm transition ${
            selectedPlan === "standard"
              ? "border-indigo-500 bg-indigo-50/40"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold text-slate-900">
                Standard Plan
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Self-managed online store with all essential business and
                technical features.
              </p>
            </div>
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
            <PlanFeature>Payment gateway integration support</PlanFeature>
            <PlanFeature>UPI payment option support</PlanFeature>
            <PlanFeature>Shipping settings and shipping aggregator integration support</PlanFeature>
            <PlanFeature>Shipment booking ready workflow</PlanFeature>
            <PlanFeature>Pack slip generation</PlanFeature>
            <PlanFeature>GST invoice generation</PlanFeature>
            <PlanFeature>Hosting and technical maintenance included</PlanFeature>
            <PlanFeature>Basic support for store setup and usage</PlanFeature>
          </ul>

          <button
            type="button"
            className={`mt-5 rounded-lg border px-4 py-2 text-sm font-medium ${
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
          className={`rounded-2xl border p-5 shadow-sm transition ${
            selectedPlan === "premium"
              ? "border-indigo-500 bg-indigo-50/40"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold text-slate-900">
                Premium Plan
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Fully managed store where LetzShopy handles your day-to-day store
                operations.
              </p>
            </div>
          </div>

          <div className="mt-4 text-4xl font-bold text-slate-900">
            ₹{billingCycle === "yearly" ? "12,000" : "999"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            / {billingCycle === "yearly" ? "year" : "month"}
          </div>

          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            <PlanFeature>Everything included in Standard Plan</PlanFeature>
            <PlanFeature>Dedicated online store website</PlanFeature>
            <PlanFeature>Vendor dashboard access</PlanFeature>
            <PlanFeature>Unlimited product listing and categories</PlanFeature>
            <PlanFeature>Mobile-friendly storefront</PlanFeature>
            <PlanFeature>Order dashboard, pack slip and GST invoice support</PlanFeature>
            <PlanFeature>Hosting and technical maintenance included</PlanFeature>
            <PlanFeature>Product upload handled by LetzShopy staff</PlanFeature>
            <PlanFeature>Product categorisation handled by LetzShopy</PlanFeature>
            <PlanFeature>Order management handled by LetzShopy team</PlanFeature>
            <PlanFeature>Order entry support for WhatsApp / Instagram orders</PlanFeature>
            <PlanFeature>Shipment booking handled by LetzShopy team</PlanFeature>
            <PlanFeature>Day-to-day store operations handled by us</PlanFeature>
            <PlanFeature>Dedicated operational support from LetzShopy staff</PlanFeature>
            <PlanFeature>Priority support for store running activities</PlanFeature>
          </ul>

          <button
            type="button"
            className={`mt-5 rounded-lg border px-4 py-2 text-sm font-medium ${
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

      {/* Payment */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Payment</div>

        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          UPI payments will show receiver name as <b>Sindhiya Srinivasan</b>.
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">Selected plan</div>
            <div className="font-medium text-slate-900">
              {selectedPlanLabel}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Billing period</div>
            <div className="font-medium text-slate-900">{billingCycle}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Amount to pay</div>
            <div className="font-medium text-slate-900">₹{selectedAmount}</div>
          </div>
        </div>

        <div>
          <a
            href={upiLink()}
            className="inline-flex rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Pay ₹{selectedAmount}
          </a>
        </div>

        <div className="text-xs text-slate-500">
          After payment, enter the UTR / transaction number below and click
          Complete Payment.
        </div>

        <input
          type="text"
          placeholder="Enter UTR / Transaction number"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
        />

        <button
          type="button"
          onClick={submitPayment}
          disabled={saving}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {saving ? "Submitting..." : "Complete Payment"}
        </button>
      </div>
    </div>
  );
}