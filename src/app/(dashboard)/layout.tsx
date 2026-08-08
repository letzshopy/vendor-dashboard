import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import WhatsappFab from "@/components/WhatsappFab";
import ActionFeedbackHost from "@/components/feedback/ActionFeedbackHost";
import {
  evaluateAccessPolicy,
} from "@/lib/accessPolicy";
import LockedDashboardRedirect from "@/components/LockedDashboardRedirect";
import VendorAgreementGate from "@/components/VendorAgreementGate";
import DashboardShell from "@/components/dashboard-shell";
import {
  SubscriptionProvider,
  type DashboardSubscription,
} from "@/components/subscription/SubscriptionContext";
import {
  findAuthorizedStore,
  verifySessionToken,
} from "@/lib/session";

const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

const TENANT_COOKIE_NAME =
  process.env.TENANT_COOKIE_NAME || "ls_tenant";

const SESSION_SIGNING_SECRET =
  process.env.DASHBOARD_SECRET || "";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function parseTenantCookie(
  rawValue: string | undefined
): JsonRecord | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      decodeURIComponent(rawValue)
    );

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function getDashboardLockedFromMaster(
  blogId: number
): Promise<boolean> {
  try {
    const base = (
      process.env.MASTER_WP_URL || ""
    ).replace(/\/$/, "");

    const key = process.env.MASTER_API_KEY || "";

    if (!base || !key || !blogId) {
      return false;
    }

    const response = await fetch(
      `${base}/wp-json/letz/v1/master-vendors/${blogId}`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          "X-Letz-Master-Key": key,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return false;
    }

    const parsed: unknown = await response
      .json()
      .catch(() => null);

    if (!isRecord(parsed)) {
      return false;
    }

    const dashboardAccess = parsed.dashboard_access;

    return (
      isRecord(dashboardAccess) &&
      dashboardAccess.locked === true
    );
  } catch {
    return false;
  }
}

async function getDashboardSubscription(
  cookieHeader: string
): Promise<DashboardSubscription | null> {
  try {
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(
        /\/$/,
        ""
      );

    if (!base) {
      return null;
    }

    const response = await fetch(
      `${base}/api/settings/subscription`,
      {
        cache: "no-store",
        headers: {
          Cookie: cookieHeader,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const parsed: unknown = await response
      .json()
      .catch(() => null);

    if (!isRecord(parsed)) {
      return null;
    }

    const status =
      typeof parsed.billing_status === "string"
        ? parsed.billing_status
        : "";

    const nextPaymentDate =
      typeof parsed.next_payment_date === "string"
        ? parsed.next_payment_date
        : typeof parsed.next_renewal_date === "string"
          ? parsed.next_renewal_date
          : "";

    const trialEndsAt =
      typeof parsed.trial_ends_at === "string"
        ? parsed.trial_ends_at
        : "";

    return {
      status,
      nextPaymentDate,
      trialEndsAt,
    };
  } catch {
    return null;
  }
}

async function getVendorAgreementAccepted(
  cookieHeader: string
): Promise<boolean> {
  try {
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(
        /\/$/,
        ""
      );

    if (!base) {
      return false;
    }

    const response = await fetch(
      `${base}/api/account/agreement-status`,
      {
        cache: "no-store",
        headers: {
          Cookie: cookieHeader,
        },
      }
    );

    if (!response.ok) {
      return false;
    }

    const parsed: unknown = await response
      .json()
      .catch(() => null);

    if (!isRecord(parsed)) {
      return false;
    }

    const legal = parsed.legal;

    if (!isRecord(legal)) {
      return false;
    }

    const accepted =
      legal.vendorAgreementAccepted;

    return (
      accepted === true ||
      accepted === 1 ||
      accepted === "1"
    );
  } catch {
    return false;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const authToken =
    cookieStore.get(AUTH_COOKIE_NAME)?.value || "";

  if (!SESSION_SIGNING_SECRET) {
    redirect("/signin");
  }

  const session = await verifySessionToken(
    authToken,
    SESSION_SIGNING_SECRET
  );

  if (!session) {
    redirect("/signin");
  }

  if (session.saas_role === "master_admin") {
    redirect("/master");
  }

  const tenant = parseTenantCookie(
    cookieStore.get(TENANT_COOKIE_NAME)?.value
  );

  const authorizedStore = tenant
    ? findAuthorizedStore(session, {
        blog_id: tenant.blog_id,
        store_url: tenant.store_url,
      })
    : null;

  if (!authorizedStore) {
    redirect("/select-store");
  }

  const cookieHeader = cookieStore.toString();

  const requiresAgreement =
    session.saas_role === "store_owner";

  const [
    locked,
    subscription,
    agreementAccepted,
  ] = await Promise.all([
    getDashboardLockedFromMaster(
      authorizedStore.blog_id
    ),
    authorizedStore.store_type === "standalone"
      ? Promise.resolve(null)
      : getDashboardSubscription(cookieHeader),
    requiresAgreement
      ? getVendorAgreementAccepted(cookieHeader)
      : Promise.resolve(true),
  ]);

  const access = evaluateAccessPolicy({
    role: session.saas_role,
    agreementAccepted,
    kycStatus: "not_started",
    subscriptionStatus:
      subscription?.status || "inactive",
    trialEndsAt:
      subscription?.trialEndsAt,
    nextPaymentDate:
      subscription?.nextPaymentDate,
    manuallyLocked: locked,
  });

  const dashboardLocked =
    access.dashboardMode ===
    "restricted";

  const showAgreementGate =
    access.dashboardMode ===
    "agreement_required";

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
          Loading dashboard…
        </div>
      }
    >
      <SubscriptionProvider
        subscription={subscription}
      >
        <>
          <LockedDashboardRedirect
            locked={dashboardLocked}
          />

          <DashboardShell
            locked={dashboardLocked}
            storeType={authorizedStore.store_type || "multisite"}
          >
            {children}
            {showAgreementGate && (
              <VendorAgreementGate />
            )}
          </DashboardShell>

          <WhatsappFab />
          <ActionFeedbackHost />
        </>
      </SubscriptionProvider>
    </Suspense>
  );
}
