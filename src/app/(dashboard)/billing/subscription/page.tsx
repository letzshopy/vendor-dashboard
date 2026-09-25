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
  Globe2,
  ShieldCheck,
} from "lucide-react";

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
  PageHeader,
} from "@/components/ui/page-header";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

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
    <li className="flex items-start gap-2 text-xs leading-5 text-foreground md:text-sm">
      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
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
    <div className="min-w-0 rounded-xl border border-border bg-card p-3 md:rounded-2xl md:p-4">
      <div className="truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground md:text-[11px]">
        {label}
      </div>
      <div className="mt-1.5 break-words text-sm font-extrabold text-heading md:mt-2 md:text-base">
        {value}
      </div>
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

    if (!utr.trim()) {
      actionFeedback.warning({
        id: "subscription-payment-validation",
        title: "Enter UTR / transaction number",
        durationMs: 2800,
      });
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
        setError(
          apiError(
            data,
            "Failed to submit payment."
          )
        );
        return;
      }

      actionFeedback.success({
        id: "subscription-payment-submit",
        title: "Payment submitted",
        message:
          "LetzShopy will verify the transaction and update your subscription.",
        durationMs: 3200,
      });

      await loadSubscription();
    } catch (caught: unknown) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Failed to submit payment.";

      setError(message);

      actionFeedback.error({
        id: "subscription-payment-submit",
        title: "Could not submit payment",
        message,
        durationMs: 4200,
      });
    } finally {
      setSaving(false);
    }
  }

  async function submitDomainRenewalPayment() {
    setError(null);

    if (!domainUtr.trim()) {
      actionFeedback.warning({
        id: "domain-renewal-validation",
        title: "Enter domain renewal UTR",
        durationMs: 2800,
      });
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
        setError(
          apiError(
            data,
            "Failed to submit domain renewal payment."
          )
        );
        return;
      }

      actionFeedback.success({
        id: "domain-renewal-submit",
        title: "Domain renewal payment submitted",
        message:
          "LetzShopy will verify the transaction and update the renewal.",
        durationMs: 3200,
      });

      await loadDomainRenewal();
    } catch (caught: unknown) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Failed to submit domain renewal payment.";

      setError(message);

      actionFeedback.error({
        id: "domain-renewal-submit",
        title: "Could not submit domain renewal payment",
        message,
        durationMs: 4200,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
        <div className="space-y-3">
          <Skeleton className="hidden h-28 rounded-2xl md:block" />

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-6">
            {Array.from({
              length: 6,
            }).map(
              (
                _,
                index
              ) => (
                <Skeleton
                  key={
                    index
                  }
                  className="h-20 rounded-xl md:h-24 md:rounded-2xl"
                />
              )
            )}
          </div>

          <Skeleton className="h-48 rounded-xl md:rounded-2xl" />
          <Skeleton className="h-72 rounded-xl md:rounded-2xl" />
        </div>
      </main>
    );
  }

  const planOptions = [
    {
      key:
        "standard" as const,
      title:
        "Self-Managed Store",
      icon:
        ShieldCheck,
      price:
        billingCycle ===
        "yearly"
          ? "11,000"
          : "999",
      note:
        "Best for owners who manage daily store work through the dashboard.",
      description:
        "You manage products, orders, shipping and daily operations.",
      features: [
        "Branded ecommerce storefront",
        "One free .in domain, subject to availability",
        "Business-owner dashboard access",
        "Unlimited products and categories",
        "Cart, checkout and customer order flow",
        "Payment gateway support and manual UPI option",
        "SHIFT shipping integration, booking and labels",
        "Order, customer, media, invoice and report tools",
        "Basic product SEO and analytics foundation",
        "Hosting, SSL, security and uptime care",
        "Domain and DNS support",
        "Monthly health review and technical guidance",
      ],
    },
    {
      key:
        "premium" as const,
      title:
        "Fully-Managed Store",
      icon: Crown,
      price:
        billingCycle ===
        "yearly"
          ? "16,000"
          : "1,399",
      note:
        "Best for owners who want hands-on LetzShopy operational support.",
      description:
        "LetzShopy assists with catalogue, orders, shipping and daily operations.",
      features: [
        "Everything included in Self-Managed",
        "Product upload and categorisation support",
        "Product title, image order and description cleanup",
        "Advanced product SEO improvement support",
        "Order-processing workflow support",
        "SHIFT booking, pickup and label support",
        "Regular catalogue and store-operation support",
        "Instagram feed integration on the storefront",
        "Advanced SEO review and suggestions",
        "Priority operational and technical support",
      ],
    },
  ];

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
      <PageHeader
        className="hidden md:flex"
        eyebrow="Reports & Billing"
        icon={CreditCard}
        title="Subscription"
        description="Manage your LetzShopy plan, renewal and domain service."
        actions={
          <StatusBadge
            status={
              currentStatus
            }
          />
        }
      />

      <div className="space-y-4 md:mt-5">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700 md:rounded-2xl md:px-4"
          >
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-6">
          <SummaryStat
            label="Status"
            value={
              prettyStatus(
                currentStatus
              )
            }
          />

          <SummaryStat
            label="Plan"
            value={
              currentPlan ||
              "-"
            }
          />

          <SummaryStat
            label="Billing"
            value={
              currentCycle &&
              currentCycle !==
                "-"
                ? String(
                    currentCycle
                  )
                    .charAt(
                      0
                    )
                    .toUpperCase() +
                  String(
                    currentCycle
                  ).slice(
                    1
                  )
                : "-"
            }
          />

          <SummaryStat
            label="Amount"
            value={
              typeof currentAmount ===
              "number"
                ? `₹${Number(
                    currentAmount
                  ).toLocaleString(
                    "en-IN"
                  )}`
                : "-"
            }
          />

          <SummaryStat
            label="Next payment"
            value={
              formatDate(
                currentNextDate
              )
            }
          />

          <SummaryStat
            label="Last UTR"
            value={
              currentPaymentRef ||
              "-"
            }
          />
        </section>

        {domainEnabled ? (
          <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-3 md:px-5 md:py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground md:h-10 md:w-10 md:rounded-xl">
                  <Globe2 className="h-4 w-4" />
                </span>

                <div className="min-w-0">
                  <h2 className="text-sm font-extrabold text-heading md:text-base">
                    Domain Renewal
                  </h2>

                  <p className="mt-0.5 hidden text-xs text-muted-foreground md:block">
                    Separate yearly service payment for your custom domain.
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                {prettyDomainStatus(
                  domainStatus
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-4 md:gap-3 md:p-4">
              <SummaryStat
                label="Domain"
                value={
                  domain?.domain_name ||
                  "-"
                }
              />

              <SummaryStat
                label="Yearly amount"
                value={`₹${Number(
                  domainAmount ||
                    0
                ).toLocaleString(
                  "en-IN"
                )}`}
              />

              <SummaryStat
                label="Renewal"
                value={
                  formatDate(
                    domainRenewalDate
                  )
                }
              />

              <SummaryStat
                label="Grace ends"
                value={
                  formatDate(
                    domain?.grace_ends_at
                  )
                }
              />
            </div>

            {domain?.strong_message ? (
              <div className="mx-3 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 md:mx-4 md:mb-4 md:text-sm">
                {
                  domain.strong_message
                }
              </div>
            ) : null}

            {domainPending ? (
              <div className="mx-3 mb-3 rounded-xl bg-secondary px-3 py-2.5 text-xs leading-5 text-secondary-foreground md:mx-4 md:mb-4 md:text-sm">
                Payment submitted and awaiting verification.
                {domain?.payment_reference
                  ? ` Reference: ${domain.payment_reference}`
                  : ""}
              </div>
            ) : null}

            {domainActionNeeded &&
            !domainPending ? (
              <div className="border-t border-border p-3 md:p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
                  <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-xs leading-5 text-rose-800 md:text-sm">
                    <div className="font-extrabold">
                      Domain renewal is time-sensitive
                    </div>

                    <p className="mt-1">
                      A delayed renewal can interrupt the custom domain and domain email. Your LetzShopy subdomain remains separate.
                    </p>
                  </div>

                  <div className="rounded-xl bg-surface-soft p-3">
                    <div className="text-sm font-extrabold text-heading">
                      Pay ₹
                      {Number(
                        domainAmount ||
                          0
                      ).toLocaleString(
                        "en-IN"
                      )}{" "}
                      by UPI
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      {UPI_ID} ·{" "}
                      {PAYMENT_NUMBER}
                    </div>

                    <Input
                      className="mt-3"
                      value={
                        domainUtr
                      }
                      onChange={(
                        event
                      ) =>
                        setDomainUtr(
                          event.target
                            .value
                        )
                      }
                      placeholder="Domain renewal UTR"
                    />

                    <AsyncButton
                      type="button"
                      className="mt-2 w-full"
                      loading={
                        saving
                      }
                      loadingLabel="Submitting…"
                      onClick={() =>
                        void submitDomainRenewalPayment()
                      }
                    >
                      Submit Domain Payment
                    </AsyncButton>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-xl border border-border bg-card p-3 md:rounded-2xl md:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-heading md:text-base">
                Billing Period
              </h2>

              <p className="mt-0.5 hidden text-xs text-muted-foreground md:block">
                Choose monthly or yearly billing before selecting a plan.
              </p>
            </div>

            <div className="grid grid-cols-2 rounded-xl bg-surface-soft p-1 md:inline-flex md:w-auto">
              {(
                [
                  [
                    "monthly",
                    "Monthly",
                  ],
                  [
                    "yearly",
                    "Yearly",
                  ],
                ] as const
              ).map(
                ([
                  key,
                  label,
                ]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setBillingCycle(
                        key
                      )
                    }
                    className={[
                      "ls-focus-ring min-h-10 rounded-lg px-4 text-sm font-bold transition",
                      billingCycle ===
                      key
                        ? "bg-card text-heading shadow-sm"
                        : "text-muted-foreground hover:text-heading",
                    ].join(
                      " "
                    )}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
            {billingCycle ===
            "yearly"
              ? "Yearly plan: ₹5,000 setup fee is waived."
              : isFirstPayment
                ? "First monthly payment includes a one-time ₹5,000 setup fee."
                : "The one-time setup fee has already been completed."}
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-2">
          {planOptions.map(
            (plan) => {
              const Icon =
                plan.icon;

              const active =
                selectedPlan ===
                plan.key;

              return (
                <section
                  key={
                    plan.key
                  }
                  className={[
                    "rounded-xl border p-3 transition md:rounded-2xl md:p-5",
                    active
                      ? "border-primary bg-secondary/45"
                      : "border-border bg-card",
                  ].join(
                    " "
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPlan(
                        plan.key
                      )
                    }
                    className="ls-focus-ring w-full rounded-lg text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-card text-primary shadow-sm">
                            <Icon className="h-4 w-4" />
                          </span>

                          <div>
                            <h3 className="text-base font-extrabold text-heading md:text-lg">
                              {
                                plan.title
                              }
                            </h3>

                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {
                                plan.description
                              }
                            </div>
                          </div>
                        </div>
                      </div>

                      {active ? (
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-end gap-1">
                      <div className="text-3xl font-extrabold tracking-tight text-heading">
                        ₹
                        {
                          plan.price
                        }
                      </div>

                      <div className="pb-1 text-sm font-semibold text-muted-foreground">
                        /{" "}
                        {billingCycle ===
                        "yearly"
                          ? "year"
                          : "month"}
                      </div>
                    </div>

                    <div className="mt-2 rounded-lg bg-card/80 px-3 py-2 text-xs font-semibold text-secondary-foreground">
                      {
                        plan.note
                      }
                    </div>
                  </button>

                  <ul className="mt-4 grid gap-2 md:grid-cols-2">
                    {plan.features.map(
                      (
                        feature
                      ) => (
                        <PlanFeature
                          key={
                            feature
                          }
                        >
                          {
                            feature
                          }
                        </PlanFeature>
                      )
                    )}
                  </ul>

                  <Button
                    type="button"
                    variant={
                      active
                        ? "secondary"
                        : "outline"
                    }
                    className="mt-4 w-full"
                    onClick={() =>
                      setSelectedPlan(
                        plan.key
                      )
                    }
                  >
                    {active
                      ? "Selected Plan"
                      : "Choose This Plan"}
                  </Button>
                </section>
              );
            }
          )}
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-3 md:px-5 md:py-4">
            <div>
              <h2 className="text-sm font-extrabold text-heading md:text-base">
                Subscription Payment
              </h2>

              <p className="mt-0.5 hidden text-xs text-muted-foreground md:block">
                Pay by UPI and submit the transaction reference for verification.
              </p>
            </div>

            <div className="shrink-0 rounded-xl bg-surface-soft px-3 py-2 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Amount
              </div>

              <div className="mt-0.5 text-lg font-extrabold text-heading">
                ₹
                {selectedAmount.toLocaleString(
                  "en-IN"
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-3 md:p-4 lg:grid-cols-[1fr_180px]">
            <div className="space-y-3">
              <div className="rounded-xl bg-surface-soft p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  UPI Payment Number
                </div>

                <div className="mt-1 text-2xl font-extrabold tracking-wide text-heading">
                  {
                    PAYMENT_NUMBER
                  }
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  UPI ID:{" "}
                  <span className="font-bold text-foreground">
                    {
                      UPI_ID
                    }
                  </span>
                  {" · "}
                  Payee:{" "}
                  <span className="font-bold text-foreground">
                    {
                      PAYEE_NAME
                    }
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                <span className="font-bold text-heading">
                  {
                    selectedPlanLabel
                  }
                </span>
                {" · "}
                <span className="capitalize">
                  {
                    billingCycle
                  }
                </span>
                {setupFee >
                0
                  ? " · Includes ₹5,000 one-time setup fee"
                  : ""}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-heading">
                  UTR / Transaction Number
                </label>

                <Input
                  value={utr}
                  onChange={(
                    event
                  ) =>
                    setUtr(
                      event.target
                        .value
                    )
                  }
                  placeholder="Enter payment reference"
                />

                <p className="mt-1.5 text-xs text-muted-foreground">
                  Enter the UPI transaction reference after payment.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <Image
                src={QR_SRC}
                alt="Subscription payment QR"
                width={150}
                height={150}
                className="mx-auto h-auto w-full max-w-[140px] rounded-lg"
              />

              <p className="mt-2 text-[11px] text-muted-foreground">
                Scan with any UPI app
              </p>
            </div>
          </div>

          <div className="border-t border-border p-3 md:p-4">
            <AsyncButton
              type="button"
              className="w-full sm:w-auto"
              loading={saving}
              loadingLabel="Submitting…"
              onClick={() =>
                void submitPayment()
              }
            >
              Complete Payment
            </AsyncButton>
          </div>
        </section>
      </div>
    </main>
  );
}
