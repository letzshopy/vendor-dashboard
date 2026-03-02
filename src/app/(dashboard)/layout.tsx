// src/app/(dashboard)/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import WhatsappFab from "@/components/WhatsappFab";
import SubscriptionGate from "@/components/SubscriptionGate";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🔐 Simple auth gate: if cookie not set, go to /signin
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token !== "ok") {
    redirect("/signin");
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
          Loading dashboard…
        </div>
      }
    >
      <SubscriptionGate>
        <>
          {/* Soft purple dashboard background */}
          <div className="min-h-screen bg-gradient-to-b from-[#f6f4ff] via-white to-[#fff7fb]">
            <Topbar />

            <div className="flex">
              <Sidebar />
              <main className="min-w-0 flex-1">
                <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
                  {children}
                </div>
              </main>
            </div>
          </div>

          <WhatsappFab />
        </>
      </SubscriptionGate>
    </Suspense>
  );
}
