"use client";

import type { SessionStoreType } from "@/lib/session";
import { isStandaloneV1NavigationHrefAllowed } from "@/lib/storeCapabilities";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
};

const moreItems: NavItem[] = [
  {
    href: "/categories",
    label: "Categories",
    icon: FolderTree,
  },
  {
    href: "/customers",
    label: "Customers",
    icon: Users,
  },
  {
    href: "/sales/payments",
    label: "Payments",
    icon: WalletCards,
  },
  {
    href: "/media",
    label: "Media",
    icon: ImageIcon,
  },
  {
    href: "/menu",
    label: "Menu Layout",
    icon: Menu,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
  },
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
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
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
  const active = pathIsActive(
    pathname,
    item.href
  );

  return (
    <Link
      href={item.href}
      aria-current={
        active ? "page" : undefined
      }
      className="ls-focus-ring flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold"
    >
      <span
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl transition",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-transparent text-muted-foreground",
        ].join(" ")}
      >
        <Icon className="h-[18px] w-[18px] stroke-[2.6]" />
      </span>

      <span
        className={[
          "max-w-full truncate",
          active
            ? "font-extrabold text-heading"
            : "text-muted-foreground",
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
  const pathname = usePathname() || "/";
  const visibleMoreItems =
    storeType === "standalone"
      ? moreItems.filter((item) =>
          isStandaloneV1NavigationHrefAllowed(
            storeType,
            item.href
          )
        )
      : moreItems;
  const visibleLockedItems =
    storeType === "standalone"
      ? lockedItems.filter((item) =>
          isStandaloneV1NavigationHrefAllowed(
            storeType,
            item.href
          )
        )
      : lockedItems;
  const [moreOpen, setMoreOpen] =
    useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;

    const previousOverflow =
      document.body.style.overflow;

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
        className="dashboard-mobile-bottom-nav fixed inset-x-0 bottom-0 z-[60] flex items-start justify-around border-t border-border bg-card/95 px-3 backdrop-blur-xl md:hidden"
      >
        {visibleLockedItems.map((item) => (
          <BottomNavLink
            key={item.href}
            item={item}
            pathname={pathname}
          />
        ))}
      </nav>
    );
  }

  const addActive =
    pathname === "/products/add" ||
    pathname.startsWith("/products/add/");

  const productsActive =
    !addActive &&
    (
      pathname === "/products" ||
      pathname.startsWith("/products/")
    );

  const moreActive =
    visibleMoreItems.some((item) =>
      pathIsActive(
        pathname,
        item.href
      )
    );

  return (
    <>
      <nav
        aria-label="Dashboard navigation"
        className="dashboard-mobile-bottom-nav fixed inset-x-0 bottom-0 z-[60] grid grid-cols-5 items-start border-t border-border bg-card/95 px-1 backdrop-blur-xl md:hidden"
      >
        <BottomNavLink
          pathname={pathname}
          item={{
            href: "/dashboard",
            label: "Home",
            icon: House,
          }}
        />

        <BottomNavLink
          pathname={pathname}
          item={{
            href: "/orders",
            label: "Orders",
            icon: Package,
          }}
        />

        <Link
          href="/products/add"
          aria-current={
            addActive ? "page" : undefined
          }
          className="ls-focus-ring flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold"
        >
          <span
            className={[
              "flex h-9 w-9 items-center justify-center rounded-xl transition",
              addActive
                ? "bg-accent text-accent-foreground shadow-sm"
                : "bg-accent text-accent-foreground shadow-sm",
            ].join(" ")}
          >
            <Plus className="h-[18px] w-[18px] stroke-[2.8]" />
          </span>

          <span
            className={
              addActive
                ? "truncate font-extrabold text-heading"
                : "truncate text-muted-foreground"
            }
          >
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
          className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold"
        >
          <span
            className={[
              "flex h-8 w-8 items-center justify-center rounded-xl transition",
              productsActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-transparent text-muted-foreground",
            ].join(" ")}
          >
            <ShoppingBag className="h-[18px] w-[18px] stroke-[2.6]" />
          </span>

          <span
            className={[
              "max-w-full truncate",
              productsActive
                ? "font-extrabold text-heading"
                : "text-muted-foreground",
            ].join(" ")}
          >
            Products
          </span>
        </Link>

        <button
          type="button"
          onClick={() =>
            setMoreOpen(true)
          }
          aria-expanded={moreOpen}
          className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold"
        >
          <span
            className={[
              "flex h-8 w-8 items-center justify-center rounded-xl transition",
              moreActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-transparent text-muted-foreground",
            ].join(" ")}
          >
            <MoreHorizontal className="h-[18px] w-[18px] stroke-[2.8]" />
          </span>
          <span
            className={
              moreActive
                ? "font-extrabold text-heading"
                : "text-muted-foreground"
            }
          >
            More
          </span>
        </button>
      </nav>

      {moreOpen && (
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
              setMoreOpen(false)
            }
            className="absolute inset-0 h-full w-full bg-slate-950/45 backdrop-blur-[3px]"
          />

          <section className="dashboard-mobile-more-sheet absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-[28px] border-t border-border bg-card px-4 pt-3 shadow-[0_-18px_45px_rgba(25,35,75,0.2)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#D9DEEC]" />

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-heading">
                More
              </h2>

              <button
                type="button"
                aria-label="Close"
                onClick={() =>
                  setMoreOpen(false)
                }
                className="ls-focus-ring flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-heading"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {visibleMoreItems.map((item) => {
                const Icon = item.icon;
                const active =
                  pathIsActive(
                    pathname,
                    item.href
                  );

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-3.5",
                      active
                        ? "border-ring bg-secondary text-secondary-foreground"
                        : "border-border bg-surface-soft text-foreground",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-primary",
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                    </span>

                    <span className="min-w-0 truncate text-sm font-semibold">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}