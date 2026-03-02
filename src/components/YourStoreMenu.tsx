"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SubscriptionStatus = "trial" | "active" | "cancelled" | "expired";

type AccountSettingsResponse = {
  overview?: {
    store_url?: string;
  };
  subscription?: {
    billing_status?: string;
    next_renewal_date?: string;
  };
};

function deriveStatus(raw: string | undefined): SubscriptionStatus {
  const v = (raw || "").toLowerCase().trim();
  if (v === "cancelled") return "cancelled";
  if (v === "expired") return "expired";
  if (v === "trial") return "trial";
  if (v === "active") return "active";
  // default
  return "active";
}

function statusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case "trial":
      return "Trial";
    case "active":
      return "Active";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    default:
      return "Active";
  }
}

function statusBadgeClass(status: SubscriptionStatus): string {
  switch (status) {
    case "trial":
      return "ml-2 rounded-full bg-amber-50 text-amber-700 text-[11px] px-2 py-0.5 border border-amber-200";
    case "active":
      return "ml-2 rounded-full bg-emerald-50 text-emerald-700 text-[11px] px-2 py-0.5 border border-emerald-200";
    case "cancelled":
      return "ml-2 rounded-full bg-rose-50 text-rose-700 text-[11px] px-2 py-0.5 border border-rose-200";
    case "expired":
      return "ml-2 rounded-full bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 border border-slate-200";
    default:
      return "";
  }
}

export default function YourStoreMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [storeUrl, setStoreUrl] = useState<string>("");
  const [status, setStatus] = useState<SubscriptionStatus>("active");
  const [loadingStatus, setLoadingStatus] = useState(true);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Load store URL + subscription status for badge
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingStatus(true);
      try {
        const res = await fetch("/api/account/settings", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load account settings");
        const data = (await res.json()) as AccountSettingsResponse;

        if (cancelled) return;

        const url = data?.overview?.store_url || "";
        setStoreUrl(url);

        const rawStatus = data?.subscription?.billing_status;
        setStatus(deriveStatus(rawStatus));
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          // fallback: just treat as active
          setStatus("active");
        }
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  function goto(href: string) {
    setOpen(false);
    router.push(href);
  }

  function openStore() {
    if (!storeUrl) return;
    window.open(storeUrl, "_blank", "noopener");
  }

  const subscriptionBadge =
    !loadingStatus && (
      <span className={statusBadgeClass(status)}>{statusLabel(status)}</span>
    );

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm bg-white hover:bg-slate-50"
      >
        <span className="h-6 w-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-semibold">
          {/* initials – LS for LetzShopy Vendor */}
          LS
        </span>
        <span>Your Store</span>
        <span className="text-xs">{open ? "▴" : "▾"}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border bg-white shadow-lg text-sm z-40">
          {/* Header */}
          <div className="px-3 py-2 border-b bg-slate-50">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Signed in as
            </div>
            <div className="text-xs font-medium text-slate-800 truncate">
              {storeUrl || "yourstore.letzshopy.in"}
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {/* View store */}
            <button
              type="button"
              onClick={openStore}
              disabled={!storeUrl}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 disabled:opacity-60"
            >
              <div className="text-sm">View Store</div>
              <div className="text-[11px] text-slate-500">
                Open your storefront in a new tab.
              </div>
            </button>

            {/* Store profile & settings */}
            <button
              type="button"
              onClick={() => goto("/settings?tab=profile")}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
            >
              <div className="text-sm">Store Profile &amp; Settings</div>
              <div className="text-[11px] text-slate-500">
                Logo, address, contact details, and basics.
              </div>
            </button>

            <hr className="my-1" />

            {/* Subscription & AutoPay */}
            <button
              type="button"
              onClick={() => goto("/settings?tab=account#subscription")}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">Subscription &amp; AutoPay</span>
                {subscriptionBadge}
              </div>
              <div className="text-[11px] text-slate-500">
                View plan, renewal date and AutoPay status.
              </div>
            </button>

            {/* Subscription invoices */}
            <button
              type="button"
              onClick={() => goto("/reports/subscription-invoices")}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
            >
              <div className="text-sm">Subscription Invoices</div>
              <div className="text-[11px] text-slate-500">
                Download your yearly LetzShopy invoice.
              </div>
            </button>

            <hr className="my-1" />

            {/* Help Desk */}
            <button
              type="button"
              onClick={() => goto("/support/tickets")}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
            >
              <div className="text-sm">Help Desk</div>
              <div className="text-[11px] text-slate-500">
                View FAQs, knowledge base and your tickets.
              </div>
            </button>

            {/* Raise a ticket */}
            <button
              type="button"
              onClick={() => goto("/support/tickets/new")}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
            >
              <div className="text-sm">Raise a Ticket</div>
              <div className="text-[11px] text-slate-500">
                Billing, tech, shipping or subscription issues.
              </div>
            </button>

            <hr className="my-1" />

            {/* Account & security */}
            <button
              type="button"
              onClick={() => goto("/settings?tab=account#security")}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
            >
              <div className="text-sm">Account &amp; Security</div>
              <div className="text-[11px] text-slate-500">
                Update login email and password for dashboard.
              </div>
            </button>

            {/* Logout */}
            <a
              href="/logout"
              className="block px-3 py-2 hover:bg-slate-50 text-rose-600 text-sm border-t mt-1"
            >
              Logout
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
