"use client";

import {
  useEffect,
  useState,
} from "react";

import MobileBottomNav from "@/components/MobileBottomNav";
import MobilePageHeader from "@/components/MobilePageHeader";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Footer from "@/components/layout/Footer";
import SubscriptionAccessNotice from "@/components/subscription/SubscriptionAccessNotice";

export default function DashboardShell({
  children,
  locked = false,
}: {
  children: React.ReactNode;
  locked?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    }

    window.addEventListener(
      "resize",
      onResize
    );

    return () =>
      window.removeEventListener(
        "resize",
        onResize
      );
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [sidebarOpen]);

  return (
    <div className="dashboard-app-shell min-h-screen min-w-0 bg-[#F8F9FC] text-[#202A48]">
      <Topbar
        onToggleSidebar={() =>
          setSidebarOpen(
            (value) => !value
          )
        }
      />

      <MobilePageHeader
        locked={locked}
        onToggleSidebar={() =>
          setSidebarOpen(
            (value) => !value
          )
        }
      />

      {locked && (
        <div className="sticky top-16 z-30 border-b border-amber-200 bg-amber-50/95 px-3 py-3 text-sm text-amber-800 backdrop-blur md:top-[72px] md:px-5">
          <div className="w-full">
            Your dashboard access is restricted.
            Use Settings, Subscription or Support
            to complete the required steps.
          </div>
        </div>
      )}

      <div className="flex w-full min-w-0">
        <Sidebar
          open={sidebarOpen}
          onClose={() =>
            setSidebarOpen(false)
          }
          locked={locked}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-w-0 flex-1 overflow-x-clip">
            <div className="dashboard-app-content flex w-full min-w-0 max-w-none flex-col gap-3 px-3 py-3 pb-28 sm:px-4 md:gap-5 md:px-5 md:py-5 md:pb-10 xl:px-6">
              <SubscriptionAccessNotice />
              {children}
            </div>
          </main>

          <Footer />
        </div>
      </div>

      <MobileBottomNav
        locked={locked}
      />
    </div>
  );
}