"use client";

import { useState } from "react";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-50">
      {/* Sidebar – desktop + mobile slideout */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex-1 flex flex-col">
        <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        <main className="flex-1 overflow-y-auto px-3 py-4 md:px-8 md:py-6">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
