// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";

import LookupGuard from "./_debug/lookup-guard";
import LookupMuzzle from "./_debug/lookup-muzzle";
import PWARegister from "@/components/pwa/PWARegister";

export const metadata: Metadata = {
  title: "LetzShopy Vendor Dashboard",
  description: "LetzShopy vendor admin dashboard",
  applicationName: "LetzShopy Vendor",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LetzShopy Vendor",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#27346D",
};

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        {process.env.NODE_ENV !== "production" && (
          <>
            <LookupGuard />
            <LookupMuzzle />
          </>
        )}

        <PWARegister />

        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
              Loading…
            </div>
          }
        >
          {children}
        </Suspense>
      </body>
    </html>
  );
}