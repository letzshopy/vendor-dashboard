// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  ReceiptIndianRupee,
  LifeBuoy,
  Settings2,
  ChevronDown,
} from "lucide-react";

type Leaf = { href: string; label: string; ready?: boolean };
type Group = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  items: Leaf[];
};

// props coming from DashboardShell
type SidebarProps = {
  open?: boolean; // future: use for mobile drawer
  onClose?: () => void;
};

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
    icon: LayoutDashboard,
    items: [{ href: "/dashboard", label: "Dashboard", ready: true }],
  },
  {
    key: "catalog",
    label: "Catalog",
    icon: ShoppingBag,
    items: [
      { href: "/products/new", label: "Add Product", ready: true },
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
    icon: Package,
    items: [
      { href: "/orders", label: "Orders", ready: true },
      {
        href: "/sales/shipment-details",
        label: "Shipment Details",
        ready: true,
      },
      { href: "/customers", label: "Customers", ready: true },
    ],
  },
  {
    key: "billing",
    label: "Reports & Billing",
    icon: ReceiptIndianRupee,
    items: [
      { href: "/order-invoices", label: "Order Invoices", ready: true },
      { href: "/reports", label: "Reports", ready: true },
      {
        href: "/subscription-bills",
        label: "LetzShopy Subscription Invoices",
        ready: true,
      },
    ],
  },
  {
    key: "support",
    label: "Support",
    icon: LifeBuoy,
    items: [
      {
        href: "/support/knowledge-base",
        label: "Knowledge Base",
        ready: true,
      },
      { href: "/support/faq", label: "FAQ", ready: true },
      { href: "/support/tickets", label: "Tickets", ready: true },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings2,
    items: [
      { href: "/settings?tab=profile", label: "Setup Profile", ready: true },
      { href: "/settings?tab=pages", label: "Store Pages", ready: true },
      {
        href: "/settings?tab=general",
        label: "General Settings",
        ready: true,
      },
      {
        href: "/settings?tab=shipping",
        label: "Shipping Charge",
        ready: true,
      },
      { href: "/settings?tab=tax", label: "Tax", ready: true },
      { href: "/settings?tab=payments", label: "Payments", ready: true },
      { href: "/settings?tab=account", label: "Account", ready: true },
      { href: "/settings?tab=coupons", label: "Coupons", ready: true },
      {
        href: "/settings?tab=shipmentFulfillment",
        label: "Shipment Fulfillment",
        ready: true,
      },
    ],
  },
];

export default function Sidebar({ open: _drawerOpen, onClose }: SidebarProps) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  // Open groups based on current route on first load
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of GROUPS) {
      initial[g.key] = g.items.some((i) =>
        pathname.startsWith(basePath(i.href))
      );
    }
    return initial;
  });

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-64 shrink-0 bg-[#27346D] text-indigo-50 md:block">
      <div className="flex h-full flex-col">
        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {GROUPS.map((g) => {
            const Icon = g.icon;

            const groupActive = g.items.some((it) => {
              const itemBase = basePath(it.href);
              if (itemBase === "/settings") {
                const url = new URL(it.href, "http://local");
                const tab = url.searchParams.get("tab");
                return pathname === "/settings" && tab && tab === currentTab;
              }
              return (
                pathname === itemBase ||
                (itemBase !== "/" && pathname.startsWith(itemBase))
              );
            });

            const groupBtnCls = [
              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition",
              groupActive
                ? "bg-[#3C4CC4] text-white shadow-sm shadow-[#1f255a]"
                : "text-indigo-100 hover:bg-white/10",
            ].join(" ");

            const iconWrapperCls = [
              "flex h-8 w-8 items-center justify-center rounded-full text-[15px]",
              groupActive
                ? "bg-white/15 text-white"
                : "bg-white/10 text-indigo-100",
            ].join(" ");

            return (
              <div key={g.key} className="mb-1">
                <button
                  type="button"
                  className={groupBtnCls}
                  onClick={() =>
                    setGroupOpen((prev) => {
                      // Accordion behaviour: only one group open at a time
                      const next: Record<string, boolean> = {};
                      for (const grp of GROUPS) {
                        if (grp.key === g.key) {
                          next[grp.key] = !prev[g.key];
                        } else {
                          next[grp.key] = false;
                        }
                      }
                      return next;
                    })
                  }
                >
                  <span className="flex items-center gap-2">
                    <span className={iconWrapperCls}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{g.label}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-indigo-100/70 transition ${
                      groupOpen[g.key] ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {groupOpen[g.key] && (
                  <div className="mt-1 space-y-0.5 pl-11">
                    {g.items.map((it) => {
                      const itemBase = basePath(it.href);
                      let active = false;

                      if (itemBase === "/settings") {
                        const url = new URL(it.href, "http://local");
                        const tab = url.searchParams.get("tab");
                        if (
                          pathname === "/settings" &&
                          tab &&
                          tab === currentTab
                        ) {
                          active = true;
                        }
                      } else {
                        active =
                          pathname === itemBase ||
                          (itemBase !== "/" && pathname.startsWith(itemBase));
                      }

                      const itemCls = [
                        "block rounded-lg px-3 py-1.5 text-sm transition",
                        active
                          ? "bg-[#3C4CC4] text-white font-medium shadow-sm shadow-[#1f255a]"
                          : "text-indigo-100 hover:bg:white/10 hover:text-white",
                      ].join(" ");

                      return (
                        <Link
                          key={it.href}
                          href={it.ready ? it.href : "#"}
                          onClick={(e) => {
                            if (!it.ready) {
                              e.preventDefault();
                              alert(`${it.label} coming soon`);
                            }
                            if (onClose) {
                              onClose();
                            }
                          }}
                          className={itemCls}
                        >
                          {it.label}
                          {!it.ready && (
                            <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-indigo-100">
                              Soon
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-[#3B4AA3] bg-[#222c5e] px-4 py-3 text-[11px] text-indigo-100/80">
          Made with ❤️ for Online Sellers.
        </div>
      </div>
    </aside>
  );
}
