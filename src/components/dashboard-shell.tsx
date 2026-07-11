"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/layout/Footer";
import SubscriptionAccessNotice from "@/components/subscription/SubscriptionAccessNotice";

export default function DashboardShell({
  children,
  locked = false,
}: {
  children: React.ReactNode;
  locked?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f4ff] via-white to-[#fff7fb] text-slate-900">
      <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      {locked && (
        <div className="sticky top-16 z-30 border-b border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-800 backdrop-blur md:top-[72px]">
          <div className="mx-auto max-w-7xl">
            Your dashboard access is restricted. Please use Settings,
            Subscription or Support to complete the required steps.
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1600px]">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          locked={locked}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-w-0 flex-1">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 pb-24 sm:px-4 md:gap-6 md:px-6 md:py-6 md:pb-10 xl:px-8">
              <SubscriptionAccessNotice />
              {children}
            </div>
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
}