"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Check,
  Crown,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

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
  last_paid_date?: string;
  last_billed_at?: string;
};

type DomainRenewal = {
  enabled?: boolean;
  service_type?: string;
  service_label?: string;
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
  days_to_renewal?: number | null;
  strong_message?: string;
};

type PlanKey = "standard" | "premium";
type BillingCycle = "monthly" | "yearly";
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function apiError(
  value: unknown,
  fallback: string
): string {
  return isRecord(value) &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}

const UPI_ID = "sindhiya4@ybl";
const PAYEE_NAME = "Sindhiya Srinivasan";
const PAYMENT_NUMBER = "9611621621";
const QR_SRC = "/upi-qr.jpeg";

function normalizePlan(raw?: string): PlanKey {
  const v = (raw || "").toLowerCase().trim();
  if (
    v.includes("premium") ||
    v.includes("fully") ||
    v.includes("managed")
  ) {
    return "premium";
  }
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
  if (v === "trial") return "Trial";
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");
}

function prettyDomainStatus(raw?: string) {
  const v = (raw || "").toLowerCase().trim();
  if (!v) return "-";
  if (v === "payment_submitted") return "Payment Submitted";
  if (v === "configuration_required") return "Configuration Required";
  if (v === "payment_due") return "Payment Due";
  if (v === "overdue_grace") return "Overdue — Grace Active";
  if (v === "grace_expired") return "Grace Period Expired";
  if (v === "critical") return "Critical";
  if (v === "upcoming") return "Upcoming";
  if (v === "active") return "Active";
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");
}

function formatDate(raw?: string) {
  if (!raw) return "-";
  return raw;
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-700">
      <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
        <Check className="h-3 w-3" />
      </span>
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
    <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const v = (status || "").toLowerCase().trim();

  let cls =
    "border-slate-200 bg-slate-100 text-slate-700";
  if (v === "active") cls = "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (v === "payment_submitted")
    cls = "border-amber-200 bg-amber-50 text-amber-700";
  if (v === "pending_payment")
    cls = "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {prettyStatus(status)}
    </span>
  );
}

export default function BillingSubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [domain, setDomain] = useState<DomainRenewal | null>(null);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("standard");
  const [utr, setUtr] = useState("");
  const [domainUtr, setDomainUtr] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "/api/settings/subscription",
        {
          cache: "no-store",
        }
      );

      const value: unknown = await response
        .json()
        .catch(() => null);

      if (!response.ok || !isRecord(value)) {
        throw new Error(
          apiError(
            value,
            "Failed to load subscription"
          )
        );
      }

      const data = value as Subscription;

      setSub(data);

      const existingPlan =
        data.plan ||
        data.current_plan ||
        "";

      const existingCycle =
        data.billing_cycle ||
        data.period ||
        "";

      const existingReference =
        data.payment_reference ||
        data.utr ||
        "";

      setSelectedPlan(
        normalizePlan(existingPlan)
      );

      setBillingCycle(
        normalizeCycle(existingCycle)
      );

      setUtr(existingReference);
    } catch (caught: unknown) {
      console.error(
        caught instanceof Error
          ? caught.message
          : "Subscription load failed"
      );

      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load subscription details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDomainRenewal = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/settings/domain-renewal",
        { cache: "no-store" }
      );

      const value: unknown = await response
        .json()
        .catch(() => null);

      if (!response.ok || !isRecord(value)) {
        setDomain(null);
        return;
      }

      const data = value as DomainRenewal;
      setDomain(data);

      if (data.payment_reference) {
        setDomainUtr(data.payment_reference);
      }
    } catch (caught: unknown) {
      console.error(
        caught instanceof Error
          ? caught.message
          : "Domain renewal load failed"
      );
      setDomain(null);
    }
  }, []);

  useEffect(() => {
    void loadSubscription();
    void loadDomainRenewal();
  }, [loadSubscription, loadDomainRenewal]);

  const isFirstPayment =
    !sub?.last_paid_date &&
    !sub?.last_billed_at;

  const setupFee =
    billingCycle === "monthly" &&
    isFirstPayment
      ? 5_000
      : 0;

  const selectedAmount = useMemo(() => {
    const planAmount =
      selectedPlan === "standard"
        ? billingCycle === "yearly"
          ? 11_000
          : 999
        : billingCycle === "yearly"
          ? 16_000
          : 1_399;

    return planAmount + setupFee;
  }, [
    selectedPlan,
    billingCycle,
    setupFee,
  ]);

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
  const domainEnabled = domain?.enabled === true;
  const domainStatus = domain?.status || domain?.payment_status || "";
  const domainAmount = domain?.annual_amount || domain?.amount || 0;
  const domainRenewalDate =
    domain?.renewal_date || domain?.next_renewal_date || "";
  const domainPending =
    String(domainStatus).toLowerCase() === "payment_submitted";
  const domainActionNeeded = [
    "upcoming",
    "payment_due",
    "critical",
    "overdue_grace",
    "grace_expired",
  ].includes(String(domainStatus).toLowerCase());

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
        billing_cycle: billingCycle,
        period: billingCycle,
        amount: selectedAmount,
        payment_reference: utr.trim(),
        utr: utr.trim(),
        payment_mode: "upi",
      };

      const res = await fetch("/api/settings/subscription/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: unknown = await res
        .json()
        .catch(() => null);

      if (!res.ok) {
        throw new Error(
          apiError(
            data,
            "Failed to submit payment."
          )
        );
      }

      setSuccess(
        "Payment submitted successfully. LetzShopy team will verify and activate your subscription."
      );

      await loadSubscription();
    } catch (caught: unknown) {
      console.error(
        caught instanceof Error
          ? caught.message
          : "Payment submission failed"
      );
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to submit payment."
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitDomainRenewalPayment() {
    setError(null);
    setSuccess(null);

    if (!domainUtr.trim()) {
      setError("Enter UTR / transaction number for domain renewal.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/settings/domain-renewal/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_reference: domainUtr.trim(),
          utr: domainUtr.trim(),
          payment_mode: "upi",
        }),
      });

      const data: unknown = await res
        .json()
        .catch(() => null);

      if (!res.ok) {
        throw new Error(
          apiError(
            data,
            "Failed to submit domain renewal payment."
          )
        );
      }

      setSuccess(
        "Domain renewal payment submitted successfully. LetzShopy team will verify and update the renewal."
      );

      await loadDomainRenewal();
    } catch (caught: unknown) {
      console.error(
        caught instanceof Error
          ? caught.message
          : "Domain renewal payment submission failed"
      );
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to submit domain renewal payment."
      );
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
    <div className="space-y-5 p-3 pb-24 md:space-y-6 md:p-6 md:pb-6">
      {/* Header */}
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#f7f8ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
              <CreditCard className="h-3.5 w-3.5" />
              Billing & Subscription
            </div>

            <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
              Billing & Subscription
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your LetzShopy plan and submit renewal payment.
            </p>
          </div>

          <div className="shrink-0">
            <StatusBadge status={currentStatus} />
          </div>
        </div>
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

      {/* Current subscription summary */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStat label="Status" value={prettyStatus(currentStatus)} />
        <SummaryStat label="Current Plan" value={currentPlan || "-"} />
        <SummaryStat
          label="Billing Period"
          value={
            currentCycle && currentCycle !== "-"
              ? String(currentCycle).charAt(0).toUpperCase() +
                String(currentCycle).slice(1)
              : "-"
          }
        />
        <SummaryStat
          label="Amount"
          value={typeof currentAmount === "number" ? `₹${currentAmount}` : "-"}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SummaryStat
          label="Next Payment Date"
          value={formatDate(currentNextDate)}
        />
        <SummaryStat
          label="Last Submitted UTR"
          value={currentPaymentRef || "-"}
        />
      </div>

      {domainEnabled ? (
        <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#fff7ed] to-[#fff1f2] px-4 py-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-slate-900">
                  Domain Renewal Service
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Separate yearly service payment for your custom domain renewal.
                </p>
              </div>

              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                {prettyDomainStatus(domainStatus)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryStat
              label="Domain"
              value={domain?.domain_name || "-"}
            />
            <SummaryStat
              label="Yearly Amount"
              value={`₹${Number(domainAmount || 0).toLocaleString("en-IN")}`}
            />
            <SummaryStat
              label="Renewal Date"
              value={formatDate(domainRenewalDate)}
            />
            <SummaryStat
              label="Grace Ends"
              value={formatDate(domain?.grace_ends_at)}
            />
          </div>

          {domain?.strong_message ? (
            <div className="mx-4 mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {domain.strong_message}
            </div>
          ) : null}

          {domainPending ? (
            <div className="mx-4 mb-4 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
              Domain renewal payment is submitted and awaiting LetzShopy verification.
              Reference: {domain?.payment_reference || "-"}
            </div>
          ) : null}

          {domainActionNeeded && !domainPending ? (
            <div className="border-t border-slate-100 p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  <div className="font-semibold">
                    Important: custom domain renewal is time-sensitive
                  </div>
                  <p className="mt-1">
                    If the renewal payment is delayed, your custom domain and domain email may stop working.
                    Your LetzShopy subdomain access will remain separate from this service.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-3 text-sm text-slate-800">
                    <div className="font-semibold text-slate-950">
                      Pay ₹{Number(domainAmount || 0).toLocaleString("en-IN")} by UPI
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      UPI ID: <span className="font-semibold text-slate-900">{UPI_ID}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Payment number: <span className="font-semibold text-slate-900">{PAYMENT_NUMBER}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Payee: <span className="font-semibold text-slate-900">{PAYEE_NAME}</span>
                    </div>
                  </div>

                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Domain renewal UTR / transaction number
                  </label>
                  <input
                    value={domainUtr}
                    onChange={(event) => setDomainUtr(event.target.value)}
                    placeholder="Enter UPI reference"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => void submitDomainRenewalPayment()}
                    disabled={saving}
                    className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Submitting..." : "Submit domain renewal payment"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Billing cycle */}
      <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4">
          <h2 className="text-[16px] font-semibold text-slate-900">
            Choose billing period
          </h2>
        </div>

        <div className="flex flex-wrap gap-3 p-4">
          <button
            type="button"
            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
              billingCycle === "monthly"
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly
          </button>

          <button
            type="button"
            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
              billingCycle === "yearly"
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setBillingCycle("yearly")}
          >
            Yearly
          </button>
        </div>

        <div className="border-t border-slate-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {billingCycle === "yearly"
            ? "Yearly offer: the ₹5,000 setup fee is fully waived."
            : isFirstPayment
              ? "First monthly payment includes a one-time ₹5,000 store setup fee."
              : "The setup fee applies only to the first monthly payment and has already been completed."}
        </div>
      </section>

      {/* Plans */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Self managed */}
        <section
          className={`rounded-[28px] border p-5 shadow-sm transition ${
            selectedPlan === "standard"
              ? "border-indigo-500 bg-indigo-50/40"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold text-slate-900">
                Self-Managed Store
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Vendor manages products, categories, orders, shipping and daily operations.
              </p>
            </div>

            <div className="rounded-full bg-white/80 p-2 text-indigo-600 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 text-4xl font-bold tracking-tight text-slate-900">
            ₹{billingCycle === "yearly" ? "11,000" : "999"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            / {billingCycle === "yearly" ? "year" : "month"}
          </div>

          <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs font-medium text-indigo-700">
            Best for owners who manage daily store work through the dashboard.
          </div>

          <ul className="mt-5 space-y-2.5">
            <PlanFeature>Branded ecommerce storefront</PlanFeature>
            <PlanFeature>One free .in domain, subject to availability</PlanFeature>
            <PlanFeature>Business-owner dashboard access</PlanFeature>
            <PlanFeature>Unlimited products and categories</PlanFeature>
            <PlanFeature>Cart, checkout and customer order flow</PlanFeature>
            <PlanFeature>Payment gateway support and manual UPI option</PlanFeature>
            <PlanFeature>SHIFT shipping integration, booking and labels</PlanFeature>
            <PlanFeature>Order, customer, media, invoice and report tools</PlanFeature>
            <PlanFeature>Basic product SEO and analytics foundation</PlanFeature>
            <PlanFeature>Hosting, SSL, security and uptime care</PlanFeature>
            <PlanFeature>Domain and DNS support</PlanFeature>
            <PlanFeature>Monthly health review and technical guidance</PlanFeature>
          </ul>

          <button
            type="button"
            className={`mt-5 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
              selectedPlan === "standard"
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setSelectedPlan("standard")}
          >
            {selectedPlan === "standard" ? "Selected plan" : "Choose this plan"}
          </button>
        </section>

        {/* Fully managed */}
        <section
          className={`rounded-[28px] border p-5 shadow-sm transition ${
            selectedPlan === "premium"
              ? "border-indigo-500 bg-indigo-50/40"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold text-slate-900">
                Fully-Managed Store
              </div>
              <p className="mt-1 text-sm text-slate-500">
                LetzShopy team manages listing, categorisation, orders, shipping and daily operations.
              </p>
            </div>

            <div className="rounded-full bg-white/80 p-2 text-indigo-600 shadow-sm">
              <Crown className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 text-4xl font-bold tracking-tight text-slate-900">
            ₹{billingCycle === "yearly" ? "16,000" : "1,399"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            / {billingCycle === "yearly" ? "year" : "month"}
          </div>

          <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs font-medium text-indigo-700">
            Best for owners who want hands-on LetzShopy operational support.
          </div>

          <ul className="mt-5 space-y-2.5">
            <PlanFeature>Everything included in Self-Managed</PlanFeature>
            <PlanFeature>Product upload and categorisation support</PlanFeature>
            <PlanFeature>Product title, image order and description cleanup</PlanFeature>
            <PlanFeature>Advanced product SEO improvement support</PlanFeature>
            <PlanFeature>Order-processing workflow support</PlanFeature>
            <PlanFeature>SHIFT booking, pickup and label support</PlanFeature>
            <PlanFeature>Regular catalogue and store-operation support</PlanFeature>
            <PlanFeature>Instagram feed integration on the storefront</PlanFeature>
            <PlanFeature>Advanced SEO review and suggestions</PlanFeature>
            <PlanFeature>Priority operational and technical support</PlanFeature>
          </ul>

          <button
            type="button"
            className={`mt-5 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
              selectedPlan === "premium"
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setSelectedPlan("premium")}
          >
            {selectedPlan === "premium" ? "Selected plan" : "Choose this plan"}
          </button>
        </section>
      </div>

      {/* Payment section */}
      <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-slate-900">
                Subscription Payment
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Make payment using UPI and submit your transaction reference for review.
              </p>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Amount to pay
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                ₹{selectedAmount.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_180px]">
          <div className="space-y-4">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                UPI Payment Number
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
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  UPI ID
                </div>
                <div className="mt-2 break-all text-base font-semibold text-slate-900">
                  {UPI_ID}
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Payee Name
                </div>
                <div className="mt-2 text-base font-semibold text-slate-900">
                  {PAYEE_NAME}
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Selected plan:{" "}
              <span className="font-semibold text-slate-900">
                {selectedPlanLabel}
              </span>{" "}
              · Billing period:{" "}
              <span className="font-semibold capitalize text-slate-900">
                {billingCycle}
              </span>
              {setupFee > 0 ? (
                <span className="mt-2 block text-xs font-medium text-amber-700">
                  Includes one-time setup fee: ₹5,000
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center">
            <Image
              src={QR_SRC}
              alt="Subscription payment QR"
              width={150}
              height={150}
              className="mx-auto h-auto w-full max-w-[150px] rounded-lg"
            />
            <p className="mt-3 text-xs text-slate-500">
              Scan this QR in any UPI app
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              UTR / Transaction Number
            </label>

            <input
              type="text"
              placeholder="Enter UTR / Transaction number"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
            />

            <p className="text-xs text-slate-500">
              After payment, enter your UTR / transaction number and submit it for verification.
            </p>

            <button
              type="button"
              onClick={submitPayment}
              disabled={saving}
              className="inline-flex rounded-2xl bg-green-600 px-5 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? "Submitting..." : "Complete Payment"}
            </button>
          </div>
        </div>
      </section>

      {/* Small note */}
      <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Domain, email, hosting, dashboard access, storefront tools and operational features are included based on your selected plan.
      </div>
    </div>
  );
}
