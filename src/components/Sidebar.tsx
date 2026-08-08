"use client";

import type { SessionStoreType } from "@/lib/session";
import { isStandaloneV1NavigationHrefAllowed } from "@/lib/storeCapabilities";

import Image from "next/image";
import Link from "next/link";
import {
  usePathname,
  useSearchParams,
} from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  ChevronDown,
  LayoutDashboard,
  LifeBuoy,
  Package,
  ReceiptIndianRupee,
  Settings2,
  ShoppingBag,
  X,
} from "lucide-react";

const BRAND_LOGO_URL =
  process.env.NEXT_PUBLIC_BRAND_LOGO_URL || "";

type Leaf = {
  href: string;
  label: string;
  ready?: boolean;
};

type Group = {
  key: string;
  label: string;
  icon: ComponentType<{
    className?: string;
  }>;
  items: Leaf[];
};

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
  locked?: boolean;
  storeType?: SessionStoreType;
};

function basePath(
  href: string
): string {
  try {
    return (
      new URL(
        href,
        "http://local"
      ).pathname || href
    );
  } catch {
    return href.split("?")[0];
  }
}

function itemMatches(
  pathname: string,
  currentTab: string | null,
  href: string
): boolean {
  const itemBase =
    basePath(href);

  if (itemBase === "/settings") {
    const url = new URL(
      href,
      "http://local"
    );

    const tab =
      url.searchParams.get("tab");

    if (!tab) {
      return pathname === "/settings";
    }

    if (tab === "profile") {
      return (
        pathname === "/settings" &&
        (
          currentTab === null ||
          currentTab === "profile"
        )
      );
    }

    return (
      pathname === "/settings" &&
      currentTab === tab
    );
  }

  return (
    pathname === itemBase ||
    (
      itemBase !== "/" &&
      pathname.startsWith(
        `${itemBase}/`
      )
    )
  );
}

function activeItemHref(
  group: Group,
  pathname: string,
  currentTab: string | null
): string | null {
  const matches = group.items
    .filter((item) =>
      itemMatches(
        pathname,
        currentTab,
        item.href
      )
    )
    .sort(
      (first, second) =>
        basePath(
          second.href
        ).length -
        basePath(
          first.href
        ).length
    );

  return matches[0]?.href || null;
}

function createOpenState(
  groups: Group[],
  activeGroupKey: string | null
): Record<string, boolean> {
  const state: Record<
    string,
    boolean
  > = {};

  for (const group of groups) {
    state[group.key] =
      group.key === activeGroupKey;
  }

  if (
    !activeGroupKey &&
    groups[0]
  ) {
    state[groups[0].key] = true;
  }

  return state;
}

const ALL_GROUPS: Group[] = [
  {
    key: "home",
    label: "Home",
    icon: LayoutDashboard,
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        ready: true,
      },
    ],
  },
  {
    key: "catalog",
    label: "Catalog",
    icon: ShoppingBag,
    items: [
      {
        href: "/products/add",
        label: "Add Product",
        ready: true,
      },
      {
        href: "/products",
        label: "Products",
        ready: true,
      },
      {
        href: "/categories",
        label: "Categories",
        ready: true,
      },
      {
        href: "/menu",
        label: "Menu Layout",
        ready: true,
      },
      {
        href: "/media",
        label: "Media",
        ready: true,
      },
      {
        href: "/products/trash",
        label: "Trash Bin",
        ready: true,
      },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    icon: Package,
    items: [
      {
        href: "/orders",
        label: "Orders",
        ready: true,
      },
      {
        href:
          "/sales/shipment-details",
        label: "Shipment Details",
        ready: true,
      },
      {
        href: "/customers",
        label: "Customers",
        ready: true,
      },
      {
        href:
          "/sales/feedback",
        label: "Customer Feedback",
        ready: true,
      },
      {
        href:
          "/offers-discounts",
        label:
          "Offers & Discounts",
        ready: true,
      },
    ],
  },
  {
    key: "billing",
    label: "Reports & Billing",
    icon: ReceiptIndianRupee,
    items: [
      {
        href:
          "/billing/subscription",
        label: "Subscription",
        ready: true,
      },
      {
        href:
          "/subscription-bills",
        label:
          "Subscription Invoices",
        ready: true,
      },
      {
        href: "/order-invoices",
        label: "Order Invoices",
        ready: true,
      },
      {
        href: "/reports",
        label: "Reports",
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
        href:
          "/support/knowledge-base",
        label: "Knowledge Base",
        ready: true,
      },
      {
        href: "/support/faq",
        label: "FAQ",
        ready: true,
      },
      {
        href: "/support/tickets",
        label: "Tickets",
        ready: true,
      },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings2,
    items: [
      {
        href: "/settings?tab=profile",
        label: "Profile",
        ready: true,
      },
      {
        href: "/settings?tab=kyc",
        label: "KYC",
        ready: true,
      },
      {
        href: "/settings?tab=setupSite",
        label: "Setup Site",
        ready: true,
      },
      {
        href: "/settings?tab=general",
        label: "General",
        ready: true,
      },
      {
        href: "/settings?tab=shipping",
        label: "Shipping Charge",
        ready: true,
      },
      {
        href: "/settings?tab=tax",
        label: "Tax",
        ready: true,
      },
      {
        href: "/settings?tab=payments",
        label: "Payments",
        ready: true,
      },
      {
        href: "/settings?tab=account",
        label: "Account",
        ready: true,
      },
      {
        href: "/settings?tab=shipmentFulfillment",
        label: "Shipment Fulfillment",
        ready: true,
      },
    ],
  },
];

export default function Sidebar({
  open = false,
  onClose,
  locked = false,
  storeType = "multisite",
}: SidebarProps) {
  const pathname =
    usePathname() || "/";

  const searchParams =
    useSearchParams();

  const currentTab =
    searchParams.get("tab");

  const navigationRef =
    useRef<HTMLElement | null>(
      null
    );

  const groups = useMemo(() => {
    const visibleGroups =
      storeType === "standalone"
        ? ALL_GROUPS
            .map((group) => ({
              ...group,
              items: group.items.filter((item) =>
                isStandaloneV1NavigationHrefAllowed(
                  storeType,
                  item.href
                )
              ),
            }))
            .filter((group) => group.items.length > 0)
        : ALL_GROUPS;

    if (!locked) {
      return visibleGroups;
    }

    return visibleGroups.filter(
      (group) =>
        group.key === "settings" ||
        group.key === "billing"
    );
  }, [locked, storeType]);

  const activeGroupKey =
    useMemo(() => {
      const activeGroup =
        groups.find(
          (group) =>
            activeItemHref(
              group,
              pathname,
              currentTab
            ) !== null
        );

      return (
        activeGroup?.key || null
      );
    }, [
      groups,
      pathname,
      currentTab,
    ]);

  const [
    groupOpen,
    setGroupOpen,
  ] = useState<
    Record<string, boolean>
  >(() =>
    createOpenState(
      groups,
      activeGroupKey
    )
  );

  useEffect(() => {
    setGroupOpen(
      createOpenState(
        groups,
        activeGroupKey
      )
    );
  }, [
    groups,
    activeGroupKey,
  ]);

  useEffect(() => {
    const navigation =
      navigationRef.current;

    if (!navigation) {
      return;
    }

    if (
      window.innerWidth < 768 &&
      !open
    ) {
      return;
    }

    let secondFrame = 0;

    const firstFrame =
      window.requestAnimationFrame(
        () => {
          secondFrame =
            window.requestAnimationFrame(
              () => {
                const activeItem =
                  navigation.querySelector<HTMLElement>(
                    '[aria-current="page"]'
                  );

                activeItem?.scrollIntoView({
                  block: "center",
                  inline: "nearest",
                });
              }
            );
        }
      );

    return () => {
      window.cancelAnimationFrame(
        firstFrame
      );

      if (secondFrame) {
        window.cancelAnimationFrame(
          secondFrame
        );
      }
    };
  }, [
    open,
    pathname,
    currentTab,
    activeGroupKey,
  ]);

  function renderNavigation() {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div
          className="flex items-center justify-between border-b border-white/10 px-3 pb-3 md:hidden"
          style={{
            paddingTop:
              "calc(0.75rem + var(--ls-safe-area-top))",
          }}
        >
          <div className="flex h-11 items-center rounded-2xl bg-white px-3 shadow-sm">
            <div className="relative h-7 w-[8.25rem]">
              {BRAND_LOGO_URL ? (
                <Image
                  src={BRAND_LOGO_URL}
                  alt="LetzShopy"
                  fill
                  sizes="132px"
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center text-base font-bold text-[#1B2A8F]">
                  LetzShopy
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav
          ref={navigationRef}
          aria-label="Dashboard navigation"
          className="min-h-0 flex-1 touch-pan-y space-y-2 overflow-y-auto overscroll-contain px-3 pb-[calc(1.5rem+var(--ls-safe-area-bottom))] pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:pb-6 md:pt-4"
        >
          {locked && (
            <div className="mb-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3 py-3 text-[13px] leading-5 text-amber-100">
              Dashboard locked. Only Settings
              and Subscription are available.
            </div>
          )}

          {groups.map((group) => {
            const Icon =
              group.icon;

            const selectedHref =
              activeItemHref(
                group,
                pathname,
                currentTab
              );

            const groupActive =
              selectedHref !== null;

            const expanded =
              Boolean(
                groupOpen[group.key]
              );

            return (
              <div
                key={group.key}
                className="space-y-1.5"
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={
                    `sidebar-group-${group.key}`
                  }
                  onClick={() =>
                    setGroupOpen(
                      (current) => {
                        const next:
                          Record<
                            string,
                            boolean
                          > = {};

                        for (
                          const item
                          of groups
                        ) {
                          next[item.key] =
                            item.key ===
                            group.key
                              ? !current[
                                  group.key
                                ]
                              : false;
                        }

                        return next;
                      }
                    )
                  }
                  className={[
                    "flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-2.5 py-2 text-left transition",
                    groupActive
                      ? "bg-white/[0.12] text-white shadow-sm ring-1 ring-white/10"
                      : "text-indigo-100 hover:bg-white/[0.07] hover:text-white",
                  ].join(" ")}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={[
                        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
                        groupActive
                          ? "bg-[#E85D4A] text-white shadow-sm"
                          : "bg-white/[0.08] text-indigo-100",
                      ].join(" ")}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>

                    <span className="truncate text-[14px] font-semibold">
                      {group.label}
                    </span>
                  </span>

                  <ChevronDown
                    className={[
                      "h-4 w-4 shrink-0 text-indigo-100/65 transition-transform duration-200",
                      expanded
                        ? "rotate-180"
                        : "",
                    ].join(" ")}
                  />
                </button>

                {expanded && (
                  <div
                    id={
                      `sidebar-group-${group.key}`
                    }
                    className="ml-[1.35rem] space-y-1 border-l border-white/10 pl-3"
                  >
                    {group.items.map(
                      (item) => {
                        const active =
                          selectedHref ===
                          item.href;

                        return (
                          <Link
                            key={item.href}
                            href={
                              item.ready
                                ? item.href
                                : "#"
                            }
                            aria-current={
                              active
                                ? "page"
                                : undefined
                            }
                            onClick={(
                              event
                            ) => {
                              if (
                                !item.ready
                              ) {
                                event.preventDefault();

                                alert(
                                  `${item.label} coming soon`
                                );

                                return;
                              }

                              onClose?.();
                            }}
                            className={[
                              "flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition",
                              active
                                ? "bg-white !text-[#26335F] shadow-sm ring-1 ring-[#D9DEEC]"
                                : "text-indigo-100/85 hover:bg-white/[0.07] hover:text-white",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                active
                                  ? "bg-[#E85D4A]"
                                  : "bg-white/30",
                              ].join(" ")}
                            />

                            <span
                              className={[
                                "min-w-0 flex-1 truncate",
                                active
                                  ? "!text-[#26335F]"
                                  : "",
                              ].join(" ")}
                            >
                              {item.label}
                            </span>

                            {!item.ready && (
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wide text-indigo-100">
                                Soon
                              </span>
                            )}
                          </Link>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <>
      <aside className="sticky top-[72px] hidden h-[calc(100dvh-72px)] w-[270px] shrink-0 overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#2E3F7D_0%,#26366E_100%)] text-indigo-50 md:block">
        {renderNavigation()}
      </aside>

      <div
        className={[
          "fixed inset-0 z-[80] md:hidden",
          open
            ? "pointer-events-auto"
            : "pointer-events-none",
        ].join(" ")}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className={[
            "absolute inset-0 h-full w-full bg-slate-950/60 backdrop-blur-[3px] transition-opacity duration-200",
            open
              ? "opacity-100"
              : "opacity-0",
          ].join(" ")}
        />

        <aside
          aria-label="Mobile dashboard navigation"
          className={[
            "absolute left-0 top-0 h-[100dvh] max-h-[100dvh] w-[86vw] max-w-[304px] overflow-hidden bg-[linear-gradient(180deg,#2E3F7D_0%,#26366E_100%)] text-indigo-50 shadow-2xl transition-transform duration-200 ease-out",
            open
              ? "translate-x-0"
              : "-translate-x-full",
          ].join(" ")}
        >
          {renderNavigation()}
        </aside>
      </div>
    </>
  );
}
