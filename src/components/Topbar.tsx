"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const STORE_URL = process.env.NEXT_PUBLIC_SITE_URL || "#";

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        {/* Left: Brand / Page title placeholder */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-black/80 text-white grid place-items-center text-xs font-bold">LS</div>
          <span className="font-semibold hidden sm:block">LetzShopy — Vendor</span>
        </div>

        {/* Center: Quick actions */}
        <div className="flex items-center gap-2">
          <a
            href={STORE_URL}
            target="_blank"
            className="hidden sm:inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            View Store
          </a>
          <Link
            href="/products/new"
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Product
          </Link>
        </div>

        {/* Right: Profile menu */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border px-2 py-1 hover:bg-gray-50"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500" />
            <span className="hidden sm:block text-sm font-medium">Your Store</span>
            <svg width="16" height="16" viewBox="0 0 20 20" className={`transition ${open ? "rotate-180" : ""}`}>
              <path d="M5 7l5 6 5-6H5z" fill="currentColor" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-white shadow-lg overflow-hidden">
              <div className="px-3 py-2 text-xs text-gray-500">Signed in as</div>
              <div className="px-3 pb-2 text-sm font-medium truncate">{STORE_URL.replace(/^https?:\/\//,'')}</div>
              <div className="h-px bg-gray-100" />
              <Link href="/settings#profile" className="block px-3 py-2 text-sm hover:bg-gray-50">View Profile</Link>
              <Link href="/settings#subscription" className="block px-3 py-2 text-sm hover:bg-gray-50">
                Subscription
                <span className="ml-2 inline-block rounded-full bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 align-middle">
                  Active
                </span>
              </Link>
              <Link href="/support" className="block px-3 py-2 text-sm hover:bg-gray-50">Help Desk</Link>
              <div className="h-px bg-gray-100" />
              {/* Placeholder until NextAuth is added -done */}
              <button
  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
  onClick={async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/signin";
  }}
>
  Logout
</button>

            </div>
          )}
        </div>
      </div>
    </header>
  );
}
