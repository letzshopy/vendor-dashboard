"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="hidden border-t border-slate-200 bg-white md:block">
      <div className="mx-auto max-w-6xl px-4 py-4 text-center">

        {/* Row 1: Copyright */}
        <div className="text-xs font-medium text-slate-600">
          © {new Date().getFullYear()} LetzShopy. All rights reserved.
        </div>

        {/* Row 2: Legal Links */}
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
          <Link href="/terms" className="hover:text-indigo-600 transition">
            Terms & Conditions
          </Link>

          <span className="text-slate-300">•</span>

          <Link href="/privacy" className="hover:text-indigo-600 transition">
            Privacy Policy
          </Link>

          <span className="text-slate-300">•</span>

          <Link href="/refund-policy" className="hover:text-indigo-600 transition">
            Refund & Cancellation
          </Link>
        </div>

        {/* Row 3: Compliance Note */}
        <div className="mt-1 text-[11px] text-slate-400">
          LetzShopy is a SaaS platform that enables independent online stores and does not operate as a marketplace.
        </div>

      </div>
    </footer>
  );
}