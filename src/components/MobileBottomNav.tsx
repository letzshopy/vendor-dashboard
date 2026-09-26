"use client";

import type {
  SessionStoreType,
} from "@/lib/session";
import {
  isStandaloneV1NavigationHrefAllowed,
} from "@/lib/storeCapabilities";

import Link from "next/link";
import {
  usePathname,
} from "next/navigation";
import {
  BarChart3,
  FolderTree,
  House,
  Image as ImageIcon,
  LifeBuoy,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  ReceiptIndianRupee,
  Settings2,
  ShoppingBag,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  type ComponentType,
} from "react";

type MobileBottomNavProps = {
  locked?: boolean;
  storeType?: SessionStoreType;
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{
    className?: string;
  }>;
  tileClass?: string;
  wide?: boolean;
};

const moreItems: NavItem[] = [
  {
    href: "/categories",
    label: "Categories",
    icon: FolderTree,
    tileClass:
      "bg-[#F15E4A]",
  },
  {
    href: "/customers",
    label: "Customers",
    icon: Users,
    tileClass:
      "bg-[#20B486]",
  },
  {
    href: "/sales/payments",
    label: "Payments",
    icon: WalletCards,
    tileClass:
      "bg-[#4059A7]",
  },
  {
    href: "/media",
    label: "Media",
    icon: ImageIcon,
    tileClass:
      "bg-[#D88A16]",
  },
  {
    href: "/menu",
    label: "Menu Layout",
    icon: Menu,
    tileClass:
      "bg-[#26366E]",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    tileClass:
      "bg-[#5E4FB3]",
  },
  {
    href: "/billing/subscription",
    label: "Subscription",
    icon: ReceiptIndianRupee,
    tileClass:
      "bg-[#4059A7]",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings2,
    tileClass:
      "bg-[#F15E4A]",
  },
  {
    href: "/support/tickets",
    label: "Support",
    icon: LifeBuoy,
    tileClass:
      "bg-[#20B486]",
    wide: true,
  },
];

const lockedItems: NavItem[] = [
  {
    href: "/billing/subscription",
    label: "Subscription",
    icon: ReceiptIndianRupee,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings2,
  },
  {
    href: "/support/tickets",
    label: "Support",
    icon: LifeBuoy,
  },
];

function pathIsActive(
  pathname: string,
  href: string
): boolean {
  if (
    href ===
    "/dashboard"
  ) {
    return (
      pathname ===
      "/dashboard"
    );
  }

  return (
    pathname === href ||
    pathname.startsWith(
      `${href}/`
    )
  );
}

function BottomNavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const Icon = item.icon;
  const active =
    pathIsActive(
      pathname,
      item.href
    );

  return (
    <Link
      href={item.href}
      aria-current={
        active
          ? "page"
          : undefined
      }
      className="ls-focus-ring flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold"
    >
      <span
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl transition",
          active
            ? "bg-white text-[#182451] shadow-[0_5px_14px_rgba(0,0,0,0.16)]"
            : "bg-[#26366E] text-indigo-100",
        ].join(" ")}
      >
        <Icon className="h-[18px] w-[18px] stroke-[2.6]" />
      </span>

      <span
        className={[
          "max-w-full truncate",
          active
            ? "font-extrabold text-white"
            : "text-indigo-100/70",
        ].join(" ")}
      >
        {item.label}
      </span>
    </Link>
  );
}

export default function MobileBottomNav({
  locked = false,
  storeType = "multisite",
}: MobileBottomNavProps) {
  const pathname =
    usePathname() || "/";

  const visibleMoreItems =
    storeType ===
    "standalone"
      ? moreItems.filter(
          (item) =>
            isStandaloneV1NavigationHrefAllowed(
              storeType,
              item.href
            )
        )
      : moreItems;

  const visibleLockedItems =
    storeType ===
    "standalone"
      ? lockedItems.filter(
          (item) =>
            isStandaloneV1NavigationHrefAllowed(
              storeType,
              item.href
            )
        )
      : lockedItems;

  const [
    moreOpen,
    setMoreOpen,
  ] =
    useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [moreOpen]);

  if (locked) {
    return (
      <nav
        aria-label="Restricted dashboard navigation"
        className="dashboard-mobile-bottom-nav fixed inset-x-0 bottom-0 z-[60] flex items-start justify-around rounded-t-[24px] border-t border-[#26366E] bg-[#182451] px-3 shadow-[0_-14px_34px_rgba(17,27,63,0.24)] md:hidden"
      >
        {visibleLockedItems.map(
          (item) => (
            <BottomNavLink
              key={
                item.href
              }
              item={
                item
              }
              pathname={
                pathname
              }
            />
          )
        )}
      </nav>
    );
  }

  const addActive =
    pathname ===
      "/products/add" ||
    pathname.startsWith(
      "/products/add/"
    );

  const productsActive =
    !addActive &&
    (
      pathname ===
        "/products" ||
      pathname.startsWith(
        "/products/"
      )
    );

  const moreActive =
    visibleMoreItems.some(
      (item) =>
        pathIsActive(
          pathname,
          item.href
        )
    );

  return (
    <>
      <nav
        aria-label="Dashboard navigation"
        className="dashboard-mobile-bottom-nav fixed inset-x-0 bottom-0 z-[60] grid grid-cols-5 items-start rounded-t-[24px] border-t border-[#26366E] bg-[#182451] px-1 shadow-[0_-14px_34px_rgba(17,27,63,0.24)] md:hidden"
      >
        <BottomNavLink
          pathname={
            pathname
          }
          item={{
            href: "/dashboard",
            label: "Home",
            icon: House,
          }}
        />

        <BottomNavLink
          pathname={
            pathname
          }
          item={{
            href: "/orders",
            label: "Orders",
            icon: Package,
          }}
        />

        <Link
          href="/products/add"
          aria-current={
            addActive
              ? "page"
              : undefined
          }
          className="ls-focus-ring flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold"
        >
          <span
            className={[
              "flex h-11 w-11 -translate-y-1 items-center justify-center rounded-2xl bg-[#F15E4A] text-white ring-4 ring-[#182451] transition",
              addActive
                ? "shadow-[0_8px_20px_rgba(241,94,74,0.38)]"
                : "shadow-[0_6px_16px_rgba(241,94,74,0.28)]",
            ].join(" ")}
          >
            <Plus className="h-5 w-5 stroke-[3]" />
          </span>

          <span className="truncate font-extrabold text-white">
            Add
          </span>
        </Link>

        <Link
          href="/products"
          aria-current={
            productsActive
              ? "page"
              : undefined
          }
          className="ls-focus-ring flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold"
        >
          <span
            className={[
              "flex h-8 w-8 items-center justify-center rounded-xl transition",
              productsActive
                ? "bg-white text-[#182451] shadow-[0_5px_14px_rgba(0,0,0,0.16)]"
                : "bg-[#26366E] text-indigo-100",
            ].join(" ")}
          >
            <ShoppingBag className="h-[18px] w-[18px] stroke-[2.6]" />
          </span>

          <span
            className={[
              "max-w-full truncate",
              productsActive
                ? "font-extrabold text-white"
                : "text-indigo-100/70",
            ].join(" ")}
          >
            Products
          </span>
        </Link>

        <button
          type="button"
          onClick={() =>
            setMoreOpen(
              true
            )
          }
          aria-expanded={
            moreOpen
          }
          className="ls-focus-ring flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold"
        >
          <span
            className={[
              "flex h-8 w-8 items-center justify-center rounded-xl transition",
              moreActive ||
              moreOpen
                ? "bg-white text-[#182451] shadow-[0_5px_14px_rgba(0,0,0,0.16)]"
                : "bg-[#26366E] text-indigo-100",
            ].join(" ")}
          >
            <MoreHorizontal className="h-[18px] w-[18px] stroke-[2.8]" />
          </span>

          <span
            className={[
              moreActive ||
              moreOpen
                ? "font-extrabold text-white"
                : "text-indigo-100/70",
            ].join(" ")}
          >
            More
          </span>
        </button>
      </nav>

      {moreOpen ? (
        <div
          className="fixed inset-0 z-[70] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="More dashboard navigation"
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() =>
              setMoreOpen(
                false
              )
            }
            className="absolute inset-0 h-full w-full bg-[#10172F]/75 backdrop-blur-[3px]"
          />

          <section className="dashboard-mobile-more-sheet absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[30px] bg-[#F4F6FB] shadow-[0_-24px_60px_rgba(17,27,63,0.34)]">
            <div className="sticky top-0 z-10 rounded-t-[30px] bg-[#182451] px-4 pb-4 pt-3 text-white">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/25" />

              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold">
                    More
                  </h2>
                  <p className="mt-0.5 text-xs text-indigo-100/70">
                    Manage your store
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close"
                  onClick={() =>
                    setMoreOpen(
                      false
                    )
                  }
                  className="ls-focus-ring flex h-10 w-10 items-center justify-center rounded-xl bg-[#26366E] text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4">
              {visibleMoreItems.map(
                (item) => {
                  const Icon =
                    item.icon;

                  const active =
                    pathIsActive(
                      pathname,
                      item.href
                    );

                  return (
                    <Link
                      key={
                        item.href
                      }
                      href={
                        item.href
                      }
                      className={[
                        "flex min-h-[92px] min-w-0 flex-col justify-between rounded-2xl p-3 text-white shadow-[0_8px_20px_rgba(25,35,75,0.12)] transition active:scale-[0.98]",
                        item.tileClass ||
                          "bg-[#26366E]",
                        item.wide
                          ? "col-span-2"
                          : "",
                        active
                          ? "ring-3 ring-white/80 ring-offset-2 ring-offset-[#F4F6FB]"
                          : "",
                      ].join(" ")}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/16">
                        <Icon className="h-5 w-5" />
                      </span>

                      <span className="mt-3 truncate text-sm font-extrabold">
                        {
                          item.label
                        }
                      </span>
                    </Link>
                  );
                }
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
