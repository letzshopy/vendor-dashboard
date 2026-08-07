"use client";

import Link from "next/link";
import {
  ChevronDown,
  FileText,
  LifeBuoy,
  LogOut,
  ReceiptIndianRupee,
  Settings2,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useDashboardSubscription,
} from "@/components/subscription/SubscriptionContext";

const FALLBACK_STORE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "#";

type AccountSettingsResponse = {
  overview?: {
    store_url?: string;
  };
  security?: {
    login_email?: string;
  };
};

type SubscriptionStatus =
  | "trial"
  | "inactive"
  | "pending_payment"
  | "payment_submitted"
  | "active"
  | "suspended"
  | "expired";

type DashboardAccountMenuProps = {
  open: boolean;
  onOpenChange: (
    open: boolean
  ) => void;
  onBeforeOpen?: () => void;
  context?: "dashboard" | "page";
  storeUrl?: string;
  loginEmail?: string;
};

function deriveStatus(
  raw: string | undefined
): SubscriptionStatus {
  const value = (
    raw || ""
  ).toLowerCase().trim();

  if (value === "trial") {
    return "trial";
  }

  if (value === "pending_payment") {
    return "pending_payment";
  }

  if (value === "payment_submitted") {
    return "payment_submitted";
  }

  if (value === "active") {
    return "active";
  }

  if (value === "suspended") {
    return "suspended";
  }

  if (value === "expired") {
    return "expired";
  }

  return "inactive";
}

function statusLabel(
  status: SubscriptionStatus
): string {
  switch (status) {
    case "trial":
      return "Trial";

    case "pending_payment":
      return "Pending Payment";

    case "payment_submitted":
      return "Payment Submitted";

    case "active":
      return "Active";

    case "suspended":
      return "Suspended";

    case "expired":
      return "Expired";

    case "inactive":
    default:
      return "Inactive";
  }
}

function statusDotClass(
  status: SubscriptionStatus
): string {
  switch (status) {
    case "active":
      return "bg-emerald-400";

    case "trial":
      return "bg-sky-400";

    case "pending_payment":
    case "payment_submitted":
      return "bg-amber-400";

    case "suspended":
    case "expired":
    case "inactive":
    default:
      return "bg-rose-400";
  }
}

function storeInitials(
  storeUrl: string
): string {
  const normalized =
    storeUrl.replace(
      /^https?:\/\//,
      ""
    );

  const firstPart =
    normalized.split(".")[0] || "";

  const clean =
    firstPart.replace(
      /[^a-zA-Z]/g,
      ""
    );

  if (!clean) {
    return "VS";
  }

  if (clean.length === 1) {
    return clean.toUpperCase();
  }

  return (
    clean[0] + clean[1]
  ).toUpperCase();
}

export default function DashboardAccountMenu({
  open,
  onOpenChange,
  onBeforeOpen,
  context = "page",
  storeUrl: providedStoreUrl,
  loginEmail: providedLoginEmail,
}: DashboardAccountMenuProps) {
  const {
    subscription,
  } = useDashboardSubscription();

  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [
    loadedStoreUrl,
    setLoadedStoreUrl,
  ] = useState(
    providedStoreUrl ||
      FALLBACK_STORE_URL
  );

  const [
    loadedLoginEmail,
    setLoadedLoginEmail,
  ] = useState(
    providedLoginEmail || ""
  );

  useEffect(() => {
    if (
      providedStoreUrl !== undefined
    ) {
      setLoadedStoreUrl(
        providedStoreUrl
      );
    }

    if (
      providedLoginEmail !== undefined
    ) {
      setLoadedLoginEmail(
        providedLoginEmail
      );
    }
  }, [
    providedStoreUrl,
    providedLoginEmail,
  ]);

  useEffect(() => {
    if (
      providedStoreUrl !== undefined &&
      providedLoginEmail !== undefined
    ) {
      return;
    }

    let cancelled = false;

    async function loadAccount() {
      try {
        const response =
          await fetch(
            "/api/account/settings",
            {
              cache: "no-store",
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          (
            await response.json()
          ) as AccountSettingsResponse;

        if (cancelled) {
          return;
        }

        if (
          providedStoreUrl ===
          undefined
        ) {
          setLoadedStoreUrl(
            data?.overview
              ?.store_url ||
              FALLBACK_STORE_URL
          );
        }

        if (
          providedLoginEmail ===
          undefined
        ) {
          setLoadedLoginEmail(
            data?.security
              ?.login_email || ""
          );
        }
      } catch (error) {
        console.warn(
          "Account menu load failed:",
          error
        );
      }
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, [
    providedStoreUrl,
    providedLoginEmail,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onDocumentClick(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(
          target
        )
      ) {
        onOpenChange(false);
      }
    }

    document.addEventListener(
      "click",
      onDocumentClick
    );

    return () => {
      document.removeEventListener(
        "click",
        onDocumentClick
      );
    };
  }, [
    open,
    onOpenChange,
  ]);

  const storeUrl =
    providedStoreUrl ??
    loadedStoreUrl;

  const loginEmail =
    providedLoginEmail ??
    loadedLoginEmail;

  const normalizedStore =
    storeUrl.replace(
      /^https?:\/\//,
      ""
    );

  const initials =
    storeInitials(storeUrl);

  const subscriptionStatus =
    deriveStatus(
      subscription?.status
    );

  const dashboardTrigger =
    context === "dashboard";

  return (
    <div
      ref={containerRef}
      className="relative z-[70] shrink-0"
    >
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={open}
        onClick={(
          event
        ) => {
          event.stopPropagation();

          const nextOpen =
            !open;

          if (nextOpen) {
            onBeforeOpen?.();
          }

          onOpenChange(
            nextOpen
          );
        }}
        className={[
          "inline-flex shrink-0 items-center gap-1.5 border shadow-sm transition active:scale-95",
          dashboardTrigger
            ? "h-10 rounded-2xl border-white/15 bg-white/10 px-1.5 text-white hover:bg-white/15 md:rounded-full"
            : "h-11 rounded-2xl border-[#2E3F7D] bg-[#2E3F7D] px-2 text-white",
        ].join(" ")}
      >
        <span
          className={[
            "inline-flex items-center justify-center rounded-full text-[11px] font-bold",
            dashboardTrigger
              ? "h-7 w-7 bg-white/15 text-white"
              : "h-7 w-7 bg-white/15 text-white",
          ].join(" ")}
        >
          {initials}
        </span>

        <ChevronDown
          className={[
            "h-3.5 w-3.5 transition-transform",
            open
              ? "rotate-180"
              : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[19rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[24px] border border-[#D9DEEC] bg-white text-sm text-[#26335F] shadow-2xl shadow-slate-900/20">
          <div className="bg-[linear-gradient(145deg,#2E3F7D_0%,#26366E_100%)] px-4 py-4 text-white">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E85D4A] text-sm font-bold text-white shadow-sm">
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">
                  Your Store
                </div>

                <div className="mt-0.5 truncate text-[12px] text-indigo-100">
                  {normalizedStore ||
                    "yourstore.letzshopy.in"}
                </div>

                {loginEmail && (
                  <div className="truncate text-[11px] text-indigo-100/75">
                    {loginEmail}
                  </div>
                )}

                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white">
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      statusDotClass(
                        subscriptionStatus
                      ),
                    ].join(" ")}
                  />

                  Subscription:
                  {" "}
                  {statusLabel(
                    subscriptionStatus
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1 p-2">
            <Link
              href="/settings?tab=profile"
              onClick={() =>
                onOpenChange(false)
              }
              className="group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[#F6F7FC]"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF1FA] text-[#5366B7] transition group-hover:bg-[#E85D4A] group-hover:text-white">
                <Settings2 className="h-4 w-4" />
              </span>

              <span className="font-semibold">
                Store Profile &amp; Settings
              </span>
            </Link>

            <Link
              href="/billing/subscription"
              onClick={() =>
                onOpenChange(false)
              }
              className="group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[#F6F7FC]"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF1FA] text-[#5366B7] transition group-hover:bg-[#E85D4A] group-hover:text-white">
                <ReceiptIndianRupee className="h-4 w-4" />
              </span>

              <span className="font-semibold">
                Subscription
              </span>
            </Link>

            <Link
              href="/subscription-bills"
              onClick={() =>
                onOpenChange(false)
              }
              className="group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[#F6F7FC]"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF1FA] text-[#5366B7] transition group-hover:bg-[#E85D4A] group-hover:text-white">
                <FileText className="h-4 w-4" />
              </span>

              <span className="font-semibold">
                Subscription Invoices
              </span>
            </Link>

            <Link
              href="/support/tickets"
              onClick={() =>
                onOpenChange(false)
              }
              className="group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[#F6F7FC]"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF1FA] text-[#5366B7] transition group-hover:bg-[#E85D4A] group-hover:text-white">
                <LifeBuoy className="h-4 w-4" />
              </span>

              <span className="font-semibold">
                Help Desk
              </span>
            </Link>

            <Link
              href="/settings?tab=account"
              onClick={() =>
                onOpenChange(false)
              }
              className="group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[#F6F7FC]"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF1FA] text-[#5366B7] transition group-hover:bg-[#E85D4A] group-hover:text-white">
                <Settings2 className="h-4 w-4" />
              </span>

              <span className="font-semibold">
                Account &amp; Security
              </span>
            </Link>
          </div>

          <div className="border-t border-[#E7EAF2] p-2">
            <button
              type="button"
              onClick={async () => {
                onOpenChange(false);

                try {
                  await fetch(
                    "/api/auth/logout",
                    {
                      method: "POST",
                    }
                  );
                } catch (error) {
                  console.error(
                    error
                  );
                }

                window.location.href =
                  "/signin";
              }}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <LogOut className="h-4 w-4" />
              </span>

              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
