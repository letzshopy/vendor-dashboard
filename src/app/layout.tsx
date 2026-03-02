// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";

import LookupGuard from "./_debug/lookup-guard";
import LookupMuzzle from "./_debug/lookup-muzzle";

export const metadata = {
  title: "LetzShopy Vendor Dashboard",
  description: "LetzShopy vendor admin dashboard",
};

// Keep dashboard dynamic
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
