"use client";

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
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  type ComponentType,
} from "react";

type MobileBottomNavProps = {
  locked?: boolean;
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
      className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold"
    >
      <span
        className={[
          "flex h-7 w-7 items-center justify-center rounded-lg transition",
          active
            ? "bg-[#2E3F7D] text-white"
            : "bg-[#EEF1FA] text-[#2E3F7D]",
        ].join(" ")}
      >
        <Icon className="h-[18px] w-[18px] stroke-[2.6]" />
      </span>

      <span
        className={[
          "max-w-full truncate",
          active
            ? "font-bold text-[#2E3F7D]"
            : "text-[#6F7891]",
        ].join(" ")}
      >
        {item.label}
      </span>
    </Link>
  );
}

export default function MobileBottomNav({
  locked = false,
}: MobileBottomNavProps) {
  const pathname = usePathname() || "/";
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
        className="dashboard-mobile-bottom-nav fixed inset-x-0 bottom-0 z-[60] flex items-start justify-around border-t border-[#D9DEEC] bg-white/95 px-3 backdrop-blur-xl md:hidden"
      >
        {lockedItems.map((item) => (
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
    moreItems.some((item) =>
      pathIsActive(
        pathname,
        item.href
      )
    );

  return (
    <>
      <nav
        aria-label="Dashboard navigation"
        className="dashboard-mobile-bottom-nav fixed inset-x-0 bottom-0 z-[60] grid grid-cols-5 items-start border-t border-[#D9DEEC] bg-white/95 px-1 backdrop-blur-xl md:hidden"
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
          className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold"
        >
          <span
            className={[
              "flex h-7 w-7 items-center justify-center rounded-lg transition",
              addActive
                ? "bg-[#2E3F7D] text-white"
                : "bg-[#EEF1FA] text-[#2E3F7D]",
            ].join(" ")}
          >
            <Plus className="h-[18px] w-[18px] stroke-[2.8]" />
          </span>

          <span
            className={
              addActive
                ? "truncate font-bold text-[#2E3F7D]"
                : "truncate text-[#6F7891]"
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
              "flex h-7 w-7 items-center justify-center rounded-lg transition",
              productsActive
                ? "bg-[#2E3F7D] text-white"
                : "bg-[#EEF1FA] text-[#2E3F7D]",
            ].join(" ")}
          >
            <ShoppingBag className="h-[18px] w-[18px] stroke-[2.6]" />
          </span>

          <span
            className={[
              "max-w-full truncate",
              productsActive
                ? "font-bold text-[#2E3F7D]"
                : "text-[#6F7891]",
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
              "flex h-7 w-7 items-center justify-center rounded-lg transition",
              moreActive
                ? "bg-[#2E3F7D] text-white"
                : "bg-[#EEF1FA] text-[#2E3F7D]",
            ].join(" ")}
          >
            <MoreHorizontal className="h-[18px] w-[18px] stroke-[2.8]" />
          </span>
          <span
            className={
              moreActive
                ? "font-bold text-[#2E3F7D]"
                : "text-[#6F7891]"
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
            className="absolute inset-0 h-full w-full bg-[#12182E]/55 backdrop-blur-[2px]"
          />

          <section className="dashboard-mobile-more-sheet absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-[28px] border-t border-[#D9DEEC] bg-white px-4 pt-3 shadow-[0_-18px_45px_rgba(25,35,75,0.2)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#D9DEEC]" />

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#26335F]">
                More
              </h2>

              <button
                type="button"
                aria-label="Close"
                onClick={() =>
                  setMoreOpen(false)
                }
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F3F8] text-[#536079]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {moreItems.map((item) => {
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
                        ? "border-[#A9B2E5] bg-[#EEF1FF] text-[#33458B]"
                        : "border-[#E1E5EF] bg-[#F8F9FC] text-[#34405F]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        active
                          ? "bg-[#5366B7] text-white"
                          : "bg-white text-[#5366B7]",
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