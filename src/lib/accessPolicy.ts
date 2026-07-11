import {
  evaluateSubscriptionTimeline,
  type SubscriptionTimeline,
} from "@/lib/subscriptionPolicy";
import type { SessionRole } from "@/lib/session";

export type KycStatus =
  | "not_started"
  | "draft"
  | "in_review"
  | "approved"
  | "rejected";

export type DashboardAccessMode =
  | "full"
  | "agreement_required"
  | "restricted";

export type StorefrontMode =
  | "live"
  | "suspended";

export type AccessReason =
  | "none"
  | "agreement_required"
  | "manual_lock"
  | "subscription_expired"
  | "subscription_suspended";

export type AccessPolicyResult = {
  dashboardMode: DashboardAccessMode;
  storefrontMode: StorefrontMode;
  checkoutEnabled: boolean;
  reason: AccessReason;
  kycApproved: boolean;
  firstActivationAllowed: boolean;
  subscription: SubscriptionTimeline;
};

export function normalizeKycStatus(
  value: unknown
): KycStatus {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  const allowed: KycStatus[] = [
    "not_started",
    "draft",
    "in_review",
    "approved",
    "rejected",
  ];

  return allowed.includes(status as KycStatus)
    ? (status as KycStatus)
    : "not_started";
}

export function evaluateAccessPolicy(input: {
  role: SessionRole;
  agreementAccepted: boolean;
  kycStatus: unknown;
  subscriptionStatus: unknown;
  trialEndsAt?: unknown;
  nextPaymentDate?: unknown;
  manuallyLocked: boolean;
  now?: Date;
}): AccessPolicyResult {
  const kycStatus = normalizeKycStatus(
    input.kycStatus
  );

  const subscription =
    evaluateSubscriptionTimeline({
      status: input.subscriptionStatus,
      trialEndsAt: input.trialEndsAt,
      nextPaymentDate: input.nextPaymentDate,
      now: input.now,
    });

  const kycApproved =
    kycStatus === "approved";

  const firstActivationAllowed =
    kycApproved &&
    subscription.phase === "payment_pending";

  if (
    input.role === "store_owner" &&
    !input.agreementAccepted
  ) {
    return {
      dashboardMode: "agreement_required",
      storefrontMode: "live",
      checkoutEnabled: true,
      reason: "agreement_required",
      kycApproved,
      firstActivationAllowed,
      subscription,
    };
  }

  if (input.manuallyLocked) {
    return {
      dashboardMode: "restricted",
      storefrontMode: "suspended",
      checkoutEnabled: false,
      reason: "manual_lock",
      kycApproved,
      firstActivationAllowed,
      subscription,
    };
  }

  if (subscription.phase === "suspended") {
    return {
      dashboardMode: "restricted",
      storefrontMode: "suspended",
      checkoutEnabled: false,
      reason: "subscription_suspended",
      kycApproved,
      firstActivationAllowed,
      subscription,
    };
  }

  if (subscription.phase === "expired") {
    return {
      dashboardMode: "restricted",
      storefrontMode: "suspended",
      checkoutEnabled: false,
      reason: "subscription_expired",
      kycApproved,
      firstActivationAllowed,
      subscription,
    };
  }

  return {
    dashboardMode: "full",
    storefrontMode: "live",
    checkoutEnabled: true,
    reason: "none",
    kycApproved,
    firstActivationAllowed,
    subscription,
  };
}
