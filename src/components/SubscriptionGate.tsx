// src/components/SubscriptionGate.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type SubscriptionBlock = {
  current_plan?: string | null;
  billing_status?: string | null;
  next_renewal_date?: string | null;
  autopay_enabled?: boolean;
};

type AccountSettings = {
  overview?: {
    account_id?: string;
    store_url?: string;
  };
  subscription?: SubscriptionBlock;
};

const ALLOWED_WHEN_LOCKED = [
  "/subscription-bills",
  "/subscription-bills/",
  "/support/tickets",
  "/support/faq",
  "/support/knowledge-base",
];

function normalizeStatus(raw?: string | null) {
  if (!raw) return "";
  return raw.toLowerCase();
}

function prettyStatus(raw?: string | null) {
  const s = normalizeStatus(raw);
  if (s === "trial") return "Trial";
  if (s === "active") return "Active";
  if (s === "overdue") return "Overdue";
  if (s === "locked") return "Locked";
  if (s === "cancelled") return "Cancelled";
  if (!s) return "Inactive";
  return raw || "Unknown";
}

export default function SubscriptionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [settings, setSettings] = useState<AccountSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/account/settings", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to load subscription");
        }

        const json: AccountSettings = await res.json();
        if (cancelled) return;

        setSettings(json);

        const status = normalizeStatus(json.subscription?.billing_status);
        const isLockedStatus = ["overdue", "locked", "cancelled"].includes(
          status
        );

        const exempt = ALLOWED_WHEN_LOCKED.some(
          (p) => pathname === p || pathname.startsWith(p + "/")
        );

        setLocked(isLockedStatus && !exempt);
      } catch (e: any) {
        if (cancelled) return;
        // On error, we do NOT hard-lock – just log and let them in.
        setError(e?.message || "Subscription check failed");
        setLocked(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Checking subscription…
      </div>
    );
  }

  if (!locked) {
    return <>{children}</>;
  }

  const sub = settings?.subscription;
  const statusLabel = prettyStatus(sub?.billing_status);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-xl">
        <h1 className="text-lg font-semibold text-slate-900">
          Subscription required
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          Your LetzShopy subscription is currently{" "}
          <span className="font-semibold text-rose-600">{statusLabel}</span>.
          To continue using the vendor dashboard, please renew your
          subscription.
        </p>

        {sub?.current_plan && (
          <p className="mt-3 text-xs text-slate-600">
            Plan:{" "}
            <span className="font-medium text-slate-800">
              {sub.current_plan}
            </span>
            {sub.next_renewal_date && (
              <>
                {" · Next renewal: "}
                <span className="font-medium text-slate-800">
                  {sub.next_renewal_date}
                </span>
              </>
            )}
          </p>
        )}

        <div className="mt-6 space-y-3">
          <a
            href="/subscription-bills"
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            View subscription &amp; bills
          </a>
          <p className="text-[11px] leading-relaxed text-slate-500">
            If you believe this is a mistake, please contact LetzShopy support
            with your store URL and account ID for help.
          </p>

          {error && (
            <p className="text-[11px] text-amber-600">
              (Note: subscription check error: {error})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
