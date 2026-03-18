import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import WhatsappFab from "@/components/WhatsappFab";
import LockedDashboardRedirect from "@/components/LockedDashboardRedirect";
import VendorAgreementGate from "@/components/VendorAgreementGate";
import DashboardShell from "@/components/dashboard-shell";
import {
  SubscriptionProvider,
  type DashboardSubscription,
} from "@/components/subscription/SubscriptionContext";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";
const TENANT_COOKIE_NAME = process.env.TENANT_COOKIE_NAME || "ls_tenant";
const ROLE_COOKIE_NAME = "ls_role";

function parseTenantCookie(raw: string | undefined) {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

async function getDashboardLockedFromMaster(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const tenantRaw = cookieStore.get(TENANT_COOKIE_NAME)?.value;
    const tenant = parseTenantCookie(tenantRaw);
    const blogId = Number(tenant?.blog_id || 0);

    if (!blogId) return false;

    const base = (process.env.MASTER_WP_URL || "").replace(/\/$/, "");
    const key = process.env.MASTER_API_KEY || "";

    if (!base || !key) return false;

    const res = await fetch(`${base}/wp-json/letz/v1/master-vendors/${blogId}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Letz-Master-Key": key,
      },
      cache: "no-store",
    });

    const text = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {}

    return !!json?.dashboard_access?.locked;
  } catch {
    return false;
  }
}

async function getDashboardSubscription(): Promise<DashboardSubscription | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (!base) return null;

    const res = await fetch(`${base}/api/settings/subscription`, {
      cache: "no-store",
      headers: {
        Cookie: cookieStore.toString(),
      },
    });

    if (!res.ok) return null;

    const data = await res.json();

    return {
      status: data?.billing_status || "",
      nextPaymentDate: data?.next_payment_date || data?.next_renewal_date || "",
    };
  } catch {
    return null;
  }
}

async function getVendorAgreementAccepted(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return false;

    const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (!base) return false;

    const res = await fetch(`${base}/api/account/agreement-status`, {
      cache: "no-store",
      headers: {
        Cookie: cookieStore.toString(),
      },
    });

    if (!res.ok) return false;

    const data = await res.json();
    return !!data?.legal?.vendorAgreementAccepted;
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
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const role = cookieStore.get(ROLE_COOKIE_NAME)?.value || "";

  if (!token) {
    redirect("/signin");
  }

  const [locked, subscription, agreementAccepted] = await Promise.all([
    getDashboardLockedFromMaster(),
    getDashboardSubscription(),
    role === "store_owner"
      ? getVendorAgreementAccepted()
      : Promise.resolve(true),
  ]);

  const showAgreementGate = role === "store_owner" && !agreementAccepted;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
          Loading dashboard…
        </div>
      }
    >
      <SubscriptionProvider subscription={subscription}>
        <>
          <LockedDashboardRedirect locked={locked} />

          <DashboardShell locked={locked}>
            {children}
            {showAgreementGate && <VendorAgreementGate />}
          </DashboardShell>

          <WhatsappFab />
        </>
      </SubscriptionProvider>
    </Suspense>
  );
}