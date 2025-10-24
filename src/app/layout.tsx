import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import WhatsappFab from "@/components/WhatsappFab";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LetzShopy Vendor",
  description: "Vendor dashboard for LetzShopy",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-slate-900`}>
        <Topbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
          </main>
        </div>
        <WhatsappFab />
      </body>
    </html>
  );
}
