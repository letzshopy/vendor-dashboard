"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  ReceiptIndianRupee,
  LifeBuoy,
  Settings2,
  ChevronDown,
  X,
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
      { href: "/products/add", label: "Add Product", ready: true },
      { href: "/products", label: "Products", ready: true },
      { href: "/categories", label: "Categories", ready: true },
      { href: "/menu", label: "Menu Layout", ready: true },
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
      { href: "/sales/feedback", label: "Customer Feedback", ready: true },
      { href: "/offers-discounts", label: "Offers & Discounts", ready: true },
    ],
  },
  {
    key: "billing",
    label: "Reports & Billing",
    icon: ReceiptIndianRupee,
    items: [
      { href: "/billing/subscription", label: "Subscription", ready: true },
      { href: "/subscription-bills", label: "Subscription Invoices", ready: true },
      { href: "/order-invoices", label: "Order Invoices", ready: true },
      { href: "/reports", label: "Reports", ready: true },
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
  items: [{ href: "/settings", label: "Settings", ready: true }],
},
];

export default function Sidebar({
  open = false,
  onClose,
  locked = false,
}: SidebarProps) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  const groups = useMemo(() => {
    if (!locked) return ALL_GROUPS;
    return ALL_GROUPS.filter((g) => g.key === "settings" || g.key === "billing");
  }, [locked]);

  const getInitialOpenState = () => {
    const initial: Record<string, boolean> = {};
    for (const g of groups) {
      initial[g.key] = g.items.some((i) => {
        const itemBase = basePath(i.href);
        if (itemBase === "/settings") {
          const url = new URL(i.href, "http://local");
          const tab = url.searchParams.get("tab");
          return pathname === "/settings" && tab && tab === currentTab;
        }
        return pathname === itemBase || (itemBase !== "/" && pathname.startsWith(itemBase));
      });
    }

    if (locked) initial.settings = true;

    if (!Object.values(initial).some(Boolean) && groups[0]) {
      initial[groups[0].key] = true;
    }

    return initial;
  };

  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(getInitialOpenState);

  useEffect(() => {
    setGroupOpen((prev) => {
      const next = getInitialOpenState();
      for (const key of Object.keys(prev)) {
        if (key in next) {
          next[key] = prev[key] || next[key];
        }
      }
      if (!Object.values(next).some(Boolean) && groups[0]) {
        next[groups[0].key] = true;
      }
      return next;
    });
  }, [pathname, currentTab, locked]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderNav = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 md:hidden">
        <div>
          <div className="text-base font-semibold text-white">LetzShopy</div>
          <div className="text-[12px] text-indigo-100/70">Dashboard menu</div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {locked && (
          <div className="mb-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3 py-3 text-[13px] leading-5 text-amber-100">
            Dashboard locked. Only Settings and Subscription are available until
            LetzShopy unlocks your store.
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
            "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-[14px] transition",
            groupActive
              ? "bg-[#3C4CC4] text-white shadow-sm shadow-[#1f255a]"
              : "text-indigo-100 hover:bg-white/10",
          ].join(" ");

          const iconWrapperCls = [
            "flex h-9 w-9 items-center justify-center rounded-full",
            groupActive ? "bg-white/15 text-white" : "bg-white/10 text-indigo-100",
          ].join(" ");

          return (
            <div key={g.key} className="mb-1">
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
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={iconWrapperCls}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="truncate font-medium">{g.label}</span>
                </span>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-indigo-100/70 transition ${
                    groupOpen[g.key] ? "rotate-180" : ""
                  }`}
                />
              </button>

              {groupOpen[g.key] && (
                <div className="mt-1 space-y-1 pl-5">
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
                      "block rounded-xl px-3 py-2.5 text-[14px] leading-5 transition",
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
                            return;
                          }
                          onClose?.();
                        }}
                        className={itemCls}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate">{it.label}</span>
                          {!it.ready && (
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-indigo-100">
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

      <div className="border-t border-[#3B4AA3] bg-[#222c5e] px-4 py-3 text-[11px] text-indigo-100/80">
        Made with ❤️
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[270px] shrink-0 border-r border-white/10 bg-[#27346D] text-indigo-50 md:block">
        {renderNav()}
      </aside>

      <div
        className={`fixed inset-0 z-50 md:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute left-0 top-0 h-full w-[86vw] max-w-[320px] bg-[#27346D] text-indigo-50 shadow-2xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {renderNav()}
        </aside>
      </div>
    </>
  );
}