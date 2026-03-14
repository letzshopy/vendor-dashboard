"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState, type ComponentType } from "react";
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

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
  locked?: boolean;
};

function basePath(href: string): string {
  try {
    return new URL(href, "http://local").pathname || href;
  } catch {
    return href.split("?")[0];
  }
}

const ALL_GROUPS: Group[] = [
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
      { href: "/categories", label: "Categories", ready: true },
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
      { href: "/sales/shipment-details", label: "Shipment Details", ready: true },
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
      { href: "/subscription-bills", label: "Subscription Invoices", ready: true },
    ],
  },
  {
    key: "support",
    label: "Support",
    icon: LifeBuoy,
    items: [
      { href: "/support/knowledge-base", label: "Knowledge Base", ready: true },
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
      { href: "/settings?tab=general", label: "General Settings", ready: true },
      { href: "/settings?tab=shipping", label: "Shipping Charge", ready: true },
      { href: "/settings?tab=tax", label: "Tax", ready: true },
      { href: "/settings?tab=payments", label: "Payments", ready: true },
      { href: "/settings?tab=account", label: "Account", ready: true },
      { href: "/settings?tab=subscription", label: "Subscription", ready: true },
      { href: "/settings?tab=coupons", label: "Coupons", ready: true },
      {
        href: "/settings?tab=shipmentFulfillment",
        label: "Shipment Fulfillment",
        ready: true,
      },
    ],
  },
];

export default function Sidebar({
  open: _drawerOpen,
  onClose,
  locked = false,
}: SidebarProps) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  const groups = useMemo(() => {
    if (!locked) return ALL_GROUPS;
    return ALL_GROUPS.filter((g) => g.key === "settings");
  }, [locked]);

  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of groups) {
      initial[g.key] = g.items.some((i) =>
        pathname.startsWith(basePath(i.href))
      );
    }
    if (locked) initial.settings = true;
    return initial;
  });

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-[250px] shrink-0 bg-[#27346D] text-indigo-50 md:block">
      <div className="flex h-full flex-col">
        <nav className="mt-3 flex-1 space-y-1 px-3 pb-2">
          {locked && (
            <div className="mb-2 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
              Dashboard locked. Only Settings is available until LetzShopy unlocks your store.
            </div>
          )}

          {groups.map((g) => {
            const Icon = g.icon;

            const groupActive = g.items.some((it) => {
              const itemBase = basePath(it.href);
              if (itemBase === "/settings") {
                const url = new URL(it.href, "http://local");
                const tab = url.searchParams.get("tab");
                return pathname === "/settings" && tab && tab === currentTab;
              }
              return pathname === itemBase || (itemBase !== "/" && pathname.startsWith(itemBase));
            });

            const groupBtnCls = [
              "flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-[13px] transition",
              groupActive
                ? "bg-[#3C4CC4] text-white shadow-sm shadow-[#1f255a]"
                : "text-indigo-100 hover:bg-white/10",
            ].join(" ");

            const iconWrapperCls = [
              "flex h-7 w-7 items-center justify-center rounded-full text-[15px]",
              groupActive ? "bg-white/15 text-white" : "bg-white/10 text-indigo-100",
            ].join(" ");

            return (
              <div key={g.key} className="mb-0.5">
                <button
                  type="button"
                  className={groupBtnCls}
                  onClick={() =>
                    setGroupOpen((prev) => {
                      const next: Record<string, boolean> = {};
                      for (const grp of groups) {
                        next[grp.key] = grp.key === g.key ? !prev[g.key] : false;
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
                  <div className="mt-1 space-y-0.5 pl-9">
                    {g.items.map((it) => {
                      const itemBase = basePath(it.href);
                      let active = false;

                      if (itemBase === "/settings") {
                        const url = new URL(it.href, "http://local");
                        const tab = url.searchParams.get("tab");
                        if (pathname === "/settings" && tab && tab === currentTab) {
                          active = true;
                        }
                      } else {
                        active =
                          pathname === itemBase ||
                          (itemBase !== "/" && pathname.startsWith(itemBase));
                      }

                      const itemCls = [
                        "block rounded-lg px-3 py-1 text-[13px] leading-5 transition",
                        active
                          ? "bg-[#3C4CC4] text-white font-medium shadow-sm shadow-[#1f255a]"
                          : "text-indigo-100 hover:bg-white/10 hover:text-white",
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
                            if (onClose) onClose();
                          }}
                          className={itemCls}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate">{it.label}</span>
                            {!it.ready && (
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-indigo-100">
                                Soon
                              </span>
                            )}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-[#3B4AA3] bg-[#222c5e] px-4 py-2 text-[10px] text-indigo-100/80">
          Made with ❤️
        </div>
      </div>
    </aside>
  );
}