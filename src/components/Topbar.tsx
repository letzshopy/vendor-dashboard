// src/components/Topbar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Mail,
  Search as SearchIcon,
  ChevronDown,
  Sparkles,
  Menu,
  Loader2,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
} from "lucide-react";

const FALLBACK_STORE_URL = process.env.NEXT_PUBLIC_SITE_URL || "#";
const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || "";

// unified “card” surface colour for logo pill, search, icons, etc.
const SURFACE_CLASS = "bg-[#f5f3ff]";

type TopbarProps = {
  onToggleSidebar?: () => void;
};

type SubscriptionStatus = "trial" | "active" | "cancelled" | "expired";

type AccountSettingsResponse = {
  overview?: {
    store_url?: string;
  };
  subscription?: {
    billing_status?: string;
  };
};

type NotificationItem = {
  id: string;
  type: "new_order" | "upi_pending";
  order_id: number;
  order_number: string;
  total: string;
  customer?: string;
  created_at?: string;
  message: string;
};

type SearchScope = "products" | "orders" | "customers";

type SearchResult = {
  id: number | string;
  label: string;
  subLabel?: string;
  url: string;
};

function deriveStatus(raw: string | undefined): SubscriptionStatus {
  const v = (raw || "").toLowerCase().trim();
  if (v === "trial") return "trial";
  if (v === "cancelled") return "cancelled";
  if (v === "expired") return "expired";
  if (v === "active") return "active";
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

// Make initials from store slug, e.g. "templatedemo.letzshopy.in" -> "TD"
function storeInitials(normalizedStore: string): string {
  if (!normalizedStore) return "VS";
  const firstPart = normalizedStore.split(".")[0] || "";
  const clean = firstPart.replace(/[^a-zA-Z]/g, "");
  if (!clean) return "VS";
  if (clean.length === 1) return clean.toUpperCase();
  return (clean[0] + clean[1]).toUpperCase();
}

export default function Topbar({ onToggleSidebar }: TopbarProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("products");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const accountRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  const [storeUrl, setStoreUrl] = useState(FALLBACK_STORE_URL);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>("active");
  const [statusLoading, setStatusLoading] = useState(true);

  // Close dropdowns on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;

      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(target)
      ) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Load account / subscription info
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setStatusLoading(true);
        const res = await fetch("/api/account/settings", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load account settings");
        const data = (await res.json()) as AccountSettingsResponse;

        if (cancelled) return;

        const url = data?.overview?.store_url || FALLBACK_STORE_URL;
        setStoreUrl(url);

        const rawStatus = data?.subscription?.billing_status;
        setSubStatus(deriveStatus(rawStatus));
      } catch (e) {
        console.warn("Account settings load failed (non-blocking):", e);
        if (!cancelled) {
          setStoreUrl(FALLBACK_STORE_URL);
          setSubStatus("active");
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load notifications periodically
  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        setNotifLoading(true);
        const res = await fetch("/api/notifications", { cache: "no-store" });

        if (!res.ok) {
          console.warn("Notifications fetch failed:", res.status);
          if (!cancelled) {
            setNotifications([]);
            setUnreadCount(0);
          }
          return;
        }

        const json: any = await res.json();
        if (cancelled) return;

        const rawItems: NotificationItem[] = Array.isArray(json?.items)
          ? json.items
          : [];

        setNotifications(rawItems);
        setUnreadCount(rawItems.length);
      } catch (e) {
        console.warn("Notifications could not be loaded (non-blocking):", e);
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      } finally {
        if (!cancelled) setNotifLoading(false);
      }
    }

    loadNotifications();
    const timer = setInterval(loadNotifications, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  function markAllNotificationsRead() {
    // For MVP we just clear the badge, but keep the list visible
    setUnreadCount(0);
  }

  function toggleNotifications() {
    setNotificationsOpen((prev) => {
      const next = !prev;
      if (next) {
        // opening → consider everything as read for badge
        setUnreadCount(0);
      }
      return next;
    });
  }

  // Search suggestions with debounce
  useEffect(() => {
    if (!search || search.trim().length < 2) {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
      setSearchResults([]);
      setIsSearching(false);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowSearchDropdown(true);

    if (searchAbortRef.current) searchAbortRef.current.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          scope: searchScope,
          q: search.trim(),
        });
        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Search failed");
        const json = await res.json();
        const items: SearchResult[] = Array.isArray(json?.items)
          ? json.items
          : [];
        setSearchResults(items);
      } catch (e) {
        if (controller.signal.aborted) return;
        console.warn("Quick search failed:", e);
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 300);

    searchTimeoutRef.current = timeout;

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search, searchScope]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    const url = `/search?scope=${encodeURIComponent(
      searchScope
    )}&q=${encodeURIComponent(q)}`;
    window.location.href = url;
  }

  const normalizedStore = storeUrl.replace(/^https?:\/\//, "");
  const initials = storeInitials(normalizedStore);

  const subscriptionChip =
    !statusLoading && (
      <span className="hidden items-center gap-1 rounded-full bg-[#3b4a8d] px-3 py-1 text-[11px] font-medium text-indigo-100 md:inline-flex">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7B3EF3]" />
        Subscription: {statusLabel(subStatus)}
      </span>
    );

  return (
    <header className="sticky top-0 z-40 w-full bg-[#27346D] shadow-sm shadow-black/20">
      <div className="flex h-16 items-center justify-between gap-4 px-2 md:h-20 md:px-4">
        {/* LEFT: big LetzShopy logo + Admin Dashboard */}
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          {/* Mobile menu icon only on small screens */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-indigo-50 shadow-sm shadow-[#141936] md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* LOGO in white pill – sized for 940x246 image */}
          <div className="flex items-center">
            <div className="flex items-center justify-center rounded-full bg-white/95 px-3 py-1.5 shadow-md shadow-black/30">
              {/* Aspect ratio ~ 3.8:1 (940x246) */}
              <div className="relative h-8 w-[10.5rem] md:h-10 md:w-[10.5rem] lg:h-12 lg:w-[12.5rem]">
                {BRAND_LOGO_URL ? (
                  <Image
                    src={BRAND_LOGO_URL}
                    alt="LetzShopy"
                    fill
                    className="object-contain"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#1b2a8f]">
                    LetzShopy
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Admin Dashboard caption */}
          <div className="hidden min-w-0 flex-col leading-tight lg:flex">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-white">
                Admin Dashboard
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FDE9FF]/10 px-2 py-0.5 text-[11px] font-medium text-[#FFE1F5]">
                <Sparkles className="h-3 w-3 text-[#FFE1F5]" />
                Live
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[11px] text-indigo-100/80">
              <span className="truncate">
                Store:{" "}
                <span className="font-medium text-white">
                  {normalizedStore || "yourstore.letzshopy.in"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* CENTER: search bar with scope filter */}
        <div
          className="relative hidden max-w-xl flex-1 items-center md:flex"
          ref={searchWrapperRef}
        >
          <form
            onSubmit={handleSearchSubmit}
            className={`flex w-full items-center rounded-full border border-[#d1cdfc] ${SURFACE_CLASS} px-2 py-1.5 text-xs text-slate-600 shadow-sm focus-within:border-[#A05AFF] focus-within:ring-1 focus-within:ring-[#A05AFF]/40`}
          >
            <select
              value={searchScope}
              onChange={(e) => setSearchScope(e.target.value as SearchScope)}
              className="mr-2 inline-flex h-8 items-center rounded-full border border-[#d1cdfc] bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:outline-none"
            >
              <option value="products">Products</option>
              <option value="orders">Orders</option>
              <option value="customers">Customers</option>
            </select>

            <SearchIcon className="mr-2 h-4 w-4 text-[#7B3EF3]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in your store (orders, products, customers)…"
              className="h-7 flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
            {isSearching && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin text-[#7B3EF3]" />
            )}
          </form>

          {/* Search suggestions dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute left-1/2 top-full z-30 mt-2 w-full max-w-xl -translate-x-1/2 rounded-2xl border border-slate-100 bg-white/95 shadow-lg shadow-slate-200">
              <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {searchScope === "products"
                  ? "Products"
                  : searchScope === "orders"
                  ? "Orders"
                  : "Customers"}{" "}
                matching “{search.trim()}”
              </div>
              <ul className="max-h-64 overflow-y-auto text-sm">
                {searchResults.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        window.location.href = item.url;
                      }}
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-violet-50"
                    >
                      <span className="text-[13px] font-medium text-slate-900">
                        {item.label}
                      </span>
                      {item.subLabel && (
                        <span className="text-[11px] text-slate-500">
                          {item.subLabel}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* RIGHT: subscription chip, Visit Store, icons, avatar */}
        <div className="flex items-center gap-2 md:gap-3">
          {subscriptionChip}

          {/* Visit Store pill */}
          <a
            href={storeUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-full bg-[#1BCFB4] px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-[#0f7669] transition hover:bg-[#16b5a0] md:inline-flex"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
            Visit Store
          </a>

          {/* Mail + notification icons */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={toggleNotifications}
                className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full ${SURFACE_CLASS} text-[#27346D] shadow-sm hover:bg-[#ebe6ff]`}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#ff5a8a] px-1 text-[10px] font-semibold text-white ring-2 ring-[#27346D]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Notifications
                    </span>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[11px] font-medium text-violet-600 hover:text-violet-700"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {notifLoading && (
                      <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading…
                      </div>
                    )}

                    {!notifLoading && notifications.length === 0 && (
                      <div className="px-3 py-4 text-xs text-slate-500">
                        No recent notifications.
                      </div>
                    )}

                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          window.location.href = `/orders/${n.order_id}`;
                        }}
                        className="flex w-full items-start gap-2 px-3 py-3 text-left hover:bg-violet-50/60"
                      >
                        <div
                          className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white ${
                            n.type === "upi_pending"
                              ? "bg-rose-500"
                              : "bg-violet-500"
                          }`}
                        >
                          {n.type === "upi_pending" ? (
                            <CreditCard className="h-3 w-3" />
                          ) : (
                            <ShoppingBag className="h-3 w-3" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-[12px] font-semibold text-slate-900">
                            {n.type === "upi_pending"
                              ? `Pending UPI verification #${n.order_number}`
                              : `New order #${n.order_number}`}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {n.message}
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                            <span>{n.customer || "Customer"}</span>
                            <span>₹{n.total}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                    <Link
                      href="/orders"
                      className="text-[11px] font-medium text-violet-600 hover:text-violet-700"
                    >
                      View all orders
                    </Link>
                    {unreadCount === 0 && notifications.length === 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        All caught up
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Avatar-only account dropdown */}
          <div className="relative" ref={accountRef}>
            <button
              onClick={() => setAccountOpen((v) => !v)}
              className={`flex items-center gap-1 rounded-full border border-indigo-300/50 ${SURFACE_CLASS} px-2 py-1.5 text-xs text-[#27346D] shadow-sm hover:bg-[#ebe6ff]`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#A05AFF] to-[#4BCBEB] text-xs font-bold text-white shadow-md shadow-[#141936]">
                {initials}
              </div>
              <ChevronDown
                className={`h-4 w-4 text-[#4f5cc7] transition ${
                  accountOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {accountOpen && (
              <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm text-slate-900 shadow-xl shadow-slate-200">
                {/* Header inside dropdown shows vendor name + full URL */}
                <div className="flex items-center gap-2 border-b border-slate-100 bg-[#f9f7ff] px-3 py-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#A05AFF] to-[#4BCBEB] text-xs font-bold text-white shadow-md shadow-[#e5d4ff]">
                    {initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Your Store
                    </div>
                    <div className="truncate text-[11px] text-slate-500">
                      {normalizedStore || "yourstore.letzshopy.in"}
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      window.location.href = "/settings?tab=profile";
                    }}
                    className="block w-full px-3 py-2 text-left text-slate-800 hover:bg-[#f6f1ff]"
                  >
                    <div className="text-sm">Store Profile &amp; Settings</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      window.location.href =
                        "/settings?tab=account#subscription";
                    }}
                    className="block w-full px-3 py-2 text-left hover:bg-[#f6f1ff]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        Subscription &amp; AutoPay (Easebuzz)
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      window.location.href = "/subscription-bills";
                    }}
                    className="block w-full px-3 py-2 text-left hover:bg-[#f6f1ff]"
                  >
                    <div className="text-sm">Subscription Invoices</div>
                  </button>

                  <hr className="my-1 border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      window.location.href = "/support/tickets";
                    }}
                    className="block w-full px-3 py-2 text-left hover:bg-[#f6f1ff]"
                  >
                    <div className="text-sm">Help Desk</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      window.location.href = "/settings?tab=account#security";
                    }}
                    className="block w-full px-3 py-2 text-left hover:bg-[#f6f1ff]"
                  >
                    <div className="text-sm">Account &amp; Security</div>
                  </button>

                  <hr className="my-1 border-slate-100" />

                  <button
                    className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    onClick={async () => {
                      setAccountOpen(false);
                      try {
                        await fetch("/api/auth/logout", { method: "POST" });
                      } catch (e) {
                        console.error(e);
                      }
                      window.location.href = "/signin";
                    }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
