"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Clock3,
  ShieldCheck,
} from "lucide-react";

import {
  useDashboardSubscription,
} from "@/components/subscription/SubscriptionContext";
import {
  evaluateSubscriptionTimeline,
} from "@/lib/subscriptionPolicy";

export default function SubscriptionAccessNotice() {
  const { subscription } =
    useDashboardSubscription();

  if (!subscription) {
    return null;
  }

  const timeline =
    evaluateSubscriptionTimeline({
      status: subscription.status,
      trialEndsAt:
        subscription.trialEndsAt,
      nextPaymentDate:
        subscription.nextPaymentDate,
    });

  let title = "";
  let message = "";
  let tone =
    "border-amber-200 bg-amber-50 text-amber-900";
  let Icon = Clock3;

  if (
    timeline.phase === "trial" &&
    timeline.daysUntilDue !== null &&
    timeline.daysUntilDue <= 7
  ) {
    title = "Free trial";
    message =
      timeline.daysUntilDue === 0
        ? "Your free trial ends today. Complete KYC approval and submit your first subscription payment."
        : `Your free trial ends in ${timeline.daysUntilDue} day${timeline.daysUntilDue === 1 ? "" : "s"}. Complete KYC approval and your first subscription payment.`;
  } else if (
    timeline.phase ===
    "payment_pending"
  ) {
    title = "Payment under verification";
    message =
      "Your UPI payment was submitted and is awaiting LetzShopy verification.";
    tone =
      "border-blue-200 bg-blue-50 text-blue-900";
    Icon = ShieldCheck;
  } else if (
    timeline.phase ===
    "grace_period"
  ) {
    const remaining = Math.max(
      0,
      5 - timeline.daysOverdue
    );

    title = "Renewal payment overdue";
    message =
      `Your five-day grace period is active. Complete payment within ${remaining} day${remaining === 1 ? "" : "s"} to avoid dashboard and storefront suspension.`;
    tone =
      "border-rose-200 bg-rose-50 text-rose-900";
    Icon = AlertTriangle;
  } else if (
    timeline.daysUntilDue !== null &&
    timeline.daysUntilDue >= 0 &&
    timeline.daysUntilDue <= 7 &&
    (
      subscription.status ===
        "active" ||
      subscription.status ===
        "renewal_due"
    )
  ) {
    title = "Subscription renewal";
    message =
      timeline.daysUntilDue === 0
        ? "Your subscription renewal is due today."
        : `Your subscription renewal is due in ${timeline.daysUntilDue} day${timeline.daysUntilDue === 1 ? "" : "s"}.`;
  } else {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border px-4 py-3 shadow-sm ${tone}`}
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="text-sm font-semibold">
              {title}
            </div>
            <div className="mt-0.5 text-sm leading-5 opacity-90">
              {message}
            </div>
          </div>
        </div>

        <Link
          href="/billing/subscription"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white/85 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-black/5 transition hover:bg-white"
        >
          View subscription
        </Link>
      </div>
    </div>
  );
}
