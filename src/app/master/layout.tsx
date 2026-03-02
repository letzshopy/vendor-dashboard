// src/app/master/layout.tsx
import type { ReactNode } from "react";
import AuthGuard from "@/components/AuthGuard";

export default function MasterLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-50 flex">
        {/* Left sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-950/90 flex flex-col">
          <div className="h-16 px-5 flex items-center border-b border-slate-800">
            <span className="text-lg font-semibold tracking-tight">
              LetzShopy HQ
            </span>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
            <p className="px-2 text-[11px] uppercase tracking-wide text-slate-500 mb-1">
              Overview
            </p>

            <a
              href="/master"
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-800/70 text-sm"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-violet-400" />
              HQ Snapshot
            </a>

            <p className="px-2 text-[11px] uppercase tracking-wide text-slate-500 mt-4 mb-1">
              Data
            </p>

            <a
              href="/master/vendors"
              className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-800/70 text-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              Vendors
            </a>

            <button className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-800/70">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              Leads & Signups
            </button>

            <a
              href="/master/support-tickets"
              className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-800/70 text-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              Support Tickets
            </a>

            <button className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-800/70">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              Subscriptions & Revenue
            </button>

            <button className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-800/70">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              KYC & Compliance
            </button>
          </nav>

          <div className="px-4 py-3 border-t border-slate-800 text-[11px] text-slate-500">
            Master login:{" "}
            <span className="text-slate-300 font-medium">
              support@letzshopy.in
            </span>
          </div>
        </aside>

        {/* Right side: topbar + content */}
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur flex items-center justify-between px-6">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-slate-500">
                Master Dashboard
              </span>
              <span className="text-sm text-slate-300">
                Control panel for all LetzShopy stores
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <a
                href="/dashboard"
                className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
              >
                Open Vendor View
              </a>

              <div className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 border border-slate-700">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[11px] flex items-center justify-center font-semibold">
                  LS
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">LetzShopy HQ</span>
                  <span className="text-[10px] text-slate-400">
                    support@letzshopy.in
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-6 py-6">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
