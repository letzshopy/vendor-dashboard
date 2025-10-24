"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Leaf = { href: string; label: string; ready?: boolean };
type Group = { key: string; label: string; emoji: string; items: Leaf[] };

// Helper: normalize href to just the pathname (ignores ?query/#hash)
function basePath(href: string): string {
  try {
    return new URL(href, "http://local").pathname || href;
  } catch {
    return href.split("?")[0];
  }
}

const GROUPS: Group[] = [
  {
    key: "home",
    label: "Home",
    emoji: "🏠",
    items: [{ href: "/dashboard", label: "Dashboard", ready: true }],
  },
  {
    key: "catalog",
    label: "Catalog",
    emoji: "🧺",
    items: [
      { href: "/products/add", label: "Add Product", ready: true },
      { href: "/products", label: "Products", ready: true },
      { href: "/categories", label: "Product Categories", ready: true },
      { href: "/menu", label: "Menu Layout", ready: true },
      { href: "/tags", label: "Product Tags", ready: true },
      { href: "/attributes", label: "Attributes", ready: true },
      { href: "/inventory", label: "Inventory", ready: true },
      { href: "/media", label: "Media", ready: true },
      { href: "/products/trash", label: "Trash Bin", ready: true },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    emoji: "🧾",
    items: [
      { href: "/orders", label: "Orders", ready: true },
      { href: "/shipments", label: "Shipment Details" },
      { href: "/customers", label: "Customers", ready: true },
    ],
  },
  {
    key: "billing",
    label: "Reports & Billing",
    emoji: "💰",
    items: [
      { href: "/order-invoices", label: "Order Invoices", ready: true },
      { href: "/reports", label: "Reports", ready: true },
      { href: "/subscription-bills", label: "LetzShopy Subscription Invoices" },
      { href: "/payouts", label: "Payouts" },
    ],
  },
  {
    key: "support",
    label: "Support",
    emoji: "❓",
    items: [
      { href: "/support/knowledge-base", label: "Knowledge Base" },
      { href: "/support/faq", label: "FAQ" },
      { href: "/support/tickets", label: "Tickets", ready: true },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    emoji: "⚙️",
    items: [
      // Settings tabs (deep links)
      { href: "/settings?tab=profile",       label: "Setup Profile",      ready: true },
      { href: "/settings?tab=pages",         label: "Store Pages",        ready: true },
      { href: "/settings?tab=general",       label: "General Settings",   ready: true },
      { href: "/settings?tab=shipping",      label: "Shipping",           ready: true },
      { href: "/settings?tab=import-export", label: "Import / Export",    ready: true },
      { href: "/settings?tab=tax",           label: "Tax",                ready: true },
      { href: "/settings?tab=payments",      label: "Payments",           ready: true },
      { href: "/settings?tab=account",       label: "Account",            ready: true },
      // other standalone items (keep if you still want separate pages)
      { href: "/coupons",   label: "Coupons" },
      { href: "/campaigns", label: "Campaigns" },
      { href: "/whatsapp",  label: "WhatsApp" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname() || "/";

  // Open the group that matches current route on initial render
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of GROUPS) {
      initial[g.key] = g.items.some((i) => pathname.startsWith(basePath(i.href)));
    }
    return initial;
  });

  return (
    <aside className="hidden md:block w-64 shrink-0 border-r bg-white/80 backdrop-blur sticky top-14 h-[calc(100vh-56px)]">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-xl bg-black/80 text-white grid place-items-center text-xs font-bold">
            LS
          </div>
          <div className="font-semibold">LetzShopy Vendor</div>
        </div>

        <nav className="space-y-2">
          {GROUPS.map((g) => (
            <div key={g.key} className="border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-50"
                onClick={() => setOpen({ ...open, [g.key]: !open[g.key] })}
              >
                <span className="w-5 text-center">{g.emoji}</span>
                <span>{g.label}</span>
                <span className="ml-auto text-xs">{open[g.key] ? "▾" : "▸"}</span>
              </button>

              {open[g.key] && (
                <div className="py-1">
                  {g.items.map((it) => {
                    const itemBase = basePath(it.href);
                    const active =
                      pathname === itemBase ||
                      (itemBase !== "/" && pathname.startsWith(itemBase));
                    const cls = active
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "hover:bg-gray-50";

                    return (
                      <Link
                        key={it.href}
                        href={it.ready ? it.href : "#"}
                        onClick={(e) => {
                          if (!it.ready) {
                            e.preventDefault();
                            alert(`${it.label} coming soon`);
                          }
                        }}
                        className={`block px-4 py-1.5 text-sm ${cls}`}
                      >
                        {it.label}
                        {!it.ready && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            Soon
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
