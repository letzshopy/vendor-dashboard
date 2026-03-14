"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type KycStatus = "not_started" | "in_review" | "approved" | "rejected";
type SubscriptionStatus =
  | "inactive"
  | "payment_submitted"
  | "active"
  | "suspended"
  | "expired";

type Status = {
  ok?: boolean;
  kyc_status?: KycStatus;
  subscription_status?: SubscriptionStatus;
};

function prettyKycStatus(status?: KycStatus) {
  switch (status) {
    case "approved":
      return "approved";
    case "in_review":
      return "in review";
    case "rejected":
      return "rejected";
    case "not_started":
    default:
      return "not started";
  }
}

function prettySubscriptionStatus(status?: SubscriptionStatus) {
  switch (status) {
    case "active":
      return "active";
    case "payment_submitted":
      return "payment submitted";
    case "suspended":
      return "suspended";
    case "expired":
      return "expired";
    case "inactive":
    default:
      return "inactive";
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextPath = sp.get("next") || "/orders";

  const [status, setStatus] = useState<Status>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);

      const r = await fetch("/api/onboarding/status", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));

      setStatus(j || {});

      if (j?.kyc_status === "approved" && j?.subscription_status === "active") {
        router.replace(nextPath);
        router.refresh();
      }
    } catch (e) {
      console.error("Failed to load onboarding status:", e);
      setStatus({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kycOk = status?.kyc_status === "approved";
  const subOk = status?.subscription_status === "active";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-xl font-semibold text-slate-900">
          Complete onboarding
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Finish the steps below to unlock Products, Orders, and full dashboard
          access.
        </p>

        <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="text-sm text-slate-500">Loading status…</div>
          ) : (
            <>
              <Step
                title="KYC verification"
                statusText={prettyKycStatus(status?.kyc_status)}
                ok={kycOk}
                actionLabel="Go to KYC"
                onAction={() => router.push("/settings?tab=kyc")}
              />

              <Step
                title="Subscription activation"
                statusText={prettySubscriptionStatus(
                  status?.subscription_status
                )}
                ok={subOk}
                actionLabel="Go to Subscription"
                onAction={() => router.push("/settings?tab=subscription")}
              />

              <div className="flex gap-3 pt-2">
                <button
                  onClick={load}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Refresh status
                </button>

                <button
                  onClick={() => router.push("/settings?tab=profile")}
                  className="rounded-lg bg-[#7c3aed] px-4 py-2 text-sm text-white hover:bg-[#6d28d9]"
                >
                  Open Settings
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Note: If you’ve completed payment or KYC just now, click “Refresh
          status”.
        </p>
      </div>
    </div>
  );
}

function Step({
  title,
  statusText,
  ok,
  actionLabel,
  onAction,
}: {
  title: string;
  statusText: string;
  ok: boolean;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div>
        <div className="text-sm font-medium text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">
          Status: <span className="font-medium">{statusText}</span>
        </div>
      </div>

      {ok ? (
        <span className="rounded-lg border border-green-100 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          Completed
        </span>
      ) : (
        <button
          onClick={onAction}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-100"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}