"use client";

import Link from "next/link";
import {
  usePathname } from "next/navigation";
import {
  ArrowLeft,   Bell,   Menu,   Pencil,   Plus,   type LucideIcon,   } from "lucide-react";
import {
  useEffect,   useState,   useRef,
} from "react";

import DashboardAccountMenu from "@/components/DashboardAccountMenu";

type MobilePageHeaderProps = {
  locked?: boolean;
  onToggleSidebar: () => void;
};

type HeaderAction = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type HeaderConfig = {
  title: string;
  mode: "root" | "task";
  backHref?: string;
  action?: HeaderAction;
};

type SectionMeta = {
  singular: string;
  rootHref: string;
};

const SECTION_META: Record<
  string,
  SectionMeta
> = {
  products: {
    singular: "Product",
    rootHref: "/products",
  },
  orders: {
    singular: "Order",
    rootHref: "/orders",
  },
  customers: {
    singular: "Customer",
    rootHref: "/customers",
  },
  categories: {
    singular: "Category",
    rootHref: "/categories",
  },
  media: {
    singular: "Media",
    rootHref: "/media",
  },
  menu: {
    singular: "Menu Layout",
    rootHref: "/menu",
  },
  reports: {
    singular: "Report",
    rootHref: "/reports",
  },
  sales: {
    singular: "Sales",
    rootHref: "/orders",
  },
  "offers-discounts": {
    singular: "Offer",
    rootHref: "/offers-discounts",
  },
  "subscription-bills": {
    singular: "Invoice",
    rootHref: "/subscription-bills",
  },
  "order-invoices": {
    singular: "Invoice",
    rootHref: "/order-invoices",
  },
  support: {
    singular: "Support",
    rootHref: "/support/tickets",
  },
  billing: {
    singular: "Subscription",
    rootHref: "/billing/subscription",
  },
  settings: {
    singular: "Settings",
    rootHref: "/settings",
  },
};

const ROOT_HEADERS: Record<
  string,
  Omit<HeaderConfig, "mode">
> = {
  "/products": {
    title: "Products",
    action: {
      href: "/products/add",
      label: "Add product",
      icon: Plus,
    },
  },
  "/orders": {
    title: "Orders",
    action: {
      href: "/orders/new",
      label: "Create order",
      icon: Plus,
    },
  },
  "/customers": {
    title: "Customers",
  },
  "/categories": {
    title: "Categories",
  },
  "/media": {
    title: "Media",
  },
  "/menu": {
    title: "Menu Layout",
  },
  "/reports": {
    title: "Reports",
  },
  "/sales/shipment-details": {
    title: "Shipment Details",
  },
  "/sales/feedback": {
    title: "Customer Feedback",
    action: {
      href: "/sales/feedback/new",
      label: "Add feedback",
      icon: Plus,
    },
  },
  "/offers-discounts": {
    title: "Offers & Discounts",
  },
  "/subscription-bills": {
    title: "Subscription Invoices",
  },
  "/order-invoices": {
    title: "Order Invoices",
  },
  "/support/knowledge-base": {
    title: "Knowledge Base",
  },
  "/support/faq": {
    title: "FAQ",
  },
  "/support/tickets": {
    title: "Support",
  },
  "/billing/subscription": {
    title: "Subscription",
  },
  "/settings": {
    title: "Settings",
  },
};

function taskHeader(
  title: string,
  backHref: string,
  action?: HeaderAction
): HeaderConfig {
  return {
    title,
    mode: "task",
    backHref,
    action,
  };
}

function humanizeSegment(
  value: string
): string {
  return decodeURIComponent(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function genericTaskHeader(
  pathname: string
): HeaderConfig {
  const segments = pathname
    .split("/")
    .filter(Boolean);

  const sectionKey =
    segments[0] || "dashboard";

  const section =
    SECTION_META[sectionKey] || {
      singular: humanizeSegment(
        sectionKey
      ),
      rootHref: `/${sectionKey}`,
    };

  const finalSegment =
    segments[segments.length - 1] ||
    sectionKey;

  let title =
    `${section.singular} Details`;

  if (
    finalSegment === "new" ||
    finalSegment === "add"
  ) {
    title = `Create ${section.singular}`;
  } else if (
    finalSegment === "edit"
  ) {
    title = `Edit ${section.singular}`;
  } else if (
    segments.length > 1 &&
    !/^\d+$/.test(finalSegment)
  ) {
    title = humanizeSegment(
      finalSegment
    );
  }

  return taskHeader(
    title,
    section.rootHref
  );
}

function resolveHeader(
  pathname: string
): HeaderConfig | null {
  /*
   * Dashboard alone uses the branded
   * LetzShopy Topbar.
   */
  if (pathname === "/dashboard") {
    return null;
  }

  const root =
    ROOT_HEADERS[pathname];

  if (root) {
    return {
      ...root,
      mode: "root",
    };
  }

  if (
    pathname === "/products/add" ||
    pathname === "/products/new" ||
    pathname.startsWith(
      "/products/add/"
    )
  ) {
    return taskHeader(
      "Add Product",
      "/products"
    );
  }

  if (pathname === "/products/trash") {
    return taskHeader(
      "Trash Bin",
      "/products"
    );
  }

  const productEdit =
    pathname.match(
      /^\/products\/([^/]+)\/edit$/
    );

  if (productEdit) {
    return taskHeader(
      "Edit Product",
      `/products/${productEdit[1]}`
    );
  }

  const productDetail =
    pathname.match(
      /^\/products\/([^/]+)$/
    );

  if (productDetail) {
    return taskHeader(
      "Product Details",
      "/products",
      {
        href:
          `/products/${productDetail[1]}/edit`,
        label: "Edit product",
        icon: Pencil,
      }
    );
  }

  const categoryEdit =
    pathname.match(
      /^\/categories\/([^/]+)\/edit$/
    );

  if (categoryEdit) {
    return taskHeader(
      "Edit Category",
      `/categories/${categoryEdit[1]}`
    );
  }

  if (
    /^\/categories\/[^/]+$/.test(
      pathname
    )
  ) {
    return taskHeader(
      "Category Details",
      "/categories"
    );
  }

  if (pathname === "/orders/new") {
    return taskHeader(
      "Create Order",
      "/orders"
    );
  }

  if (pathname === "/orders/packslips") {
    return taskHeader(
      "Pack Slips",
      "/orders"
    );
  }

  if (
    /^\/orders\/[^/]+$/.test(
      pathname
    )
  ) {
    return taskHeader(
      "Order Details",
      "/orders"
    );
  }

  if (
    /^\/customers\/[^/]+$/.test(
      pathname
    )
  ) {
    return taskHeader(
      "Customer Details",
      "/customers"
    );
  }

  if (
    pathname ===
    "/sales/feedback/new"
  ) {
    return taskHeader(
      "Add Feedback",
      "/sales/feedback"
    );
  }

  if (
    /^\/sales\/feedback\/[^/]+$/.test(
      pathname
    )
  ) {
    return taskHeader(
      "Edit Feedback",
      "/sales/feedback"
    );
  }

  if (
    pathname ===
    "/offers-discounts/coupons"
  ) {
    return taskHeader(
      "Coupons",
      "/offers-discounts"
    );
  }

  if (
    pathname ===
    "/offers-discounts/welcome-offer"
  ) {
    return taskHeader(
      "Welcome Offer",
      "/offers-discounts"
    );
  }

  if (
    pathname ===
    "/offers-discounts/sale-events"
  ) {
    return taskHeader(
      "Sale Events",
      "/offers-discounts",
      {
        href:
          "/offers-discounts/sale-events/new",
        label: "Create sale event",
        icon: Plus,
      }
    );
  }

  if (
    pathname ===
    "/offers-discounts/sale-events/new"
  ) {
    return taskHeader(
      "Create Sale Event",
      "/offers-discounts/sale-events"
    );
  }

  if (
    /^\/offers-discounts\/sale-events\/[^/]+$/.test(
      pathname
    )
  ) {
    return taskHeader(
      "Edit Sale Event",
      "/offers-discounts/sale-events"
    );
  }

  if (
    /^\/subscription-bills\/[^/]+$/.test(
      pathname
    )
  ) {
    return taskHeader(
      "Invoice Details",
      "/subscription-bills"
    );
  }

  /*
   * Total-coverage fallback:
   * every future dashboard route receives
   * a task header instead of disappearing.
   */
  return genericTaskHeader(pathname);
}

export default function MobilePageHeader({
  locked = false,
  onToggleSidebar,
}: MobilePageHeaderProps) {
  const pathname =
    usePathname() || "/";

  const config =
    resolveHeader(pathname);

  const [accountOpen, setAccountOpen] =
    useState(false);

  const accountRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;

    function onDocumentClick(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;

      if (
        accountRef.current &&
        !accountRef.current.contains(
          target
        )
      ) {
        setAccountOpen(false);
      }
    }

    document.addEventListener(
      "click",
      onDocumentClick
    );

    return () => {
      document.removeEventListener(
        "click",
        onDocumentClick
      );
    };
  }, [accountOpen]);

  if (!config) {
    return null;
  }

  const action =
    !locked
      ? config.action
      : undefined;

  const ActionIcon =
    action?.icon;

  if (
    config.mode === "task" &&
    config.backHref
  ) {
    return (
      <header
        className="sticky top-0 z-40 border-b border-[#D9DEEC] bg-white/95 shadow-sm backdrop-blur-xl md:hidden"
        style={{
          paddingTop:
            "var(--ls-safe-area-top)",
        }}
      >
        <div className="flex min-h-16 items-center gap-2 px-3">
          <Link
            href={config.backHref}
            aria-label="Go back"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF1FA] text-[#2E3F7D] active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="min-w-0 flex-1 px-1">
            <h1 className="truncate text-[19px] font-bold tracking-tight text-[#26335F]">
              {config.title}
            </h1>
          </div>

          {action && ActionIcon && (
            <Link
              href={action.href}
              aria-label={action.label}
              title={action.label}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E85D4A] text-white shadow-sm active:scale-95"
            >
              <ActionIcon className="h-5 w-5" />
            </Link>
          )}
        </div>
      </header>
    );
  }

  return (
    <header
      className="sticky top-0 z-40 border-b border-[#D9DEEC] bg-white/95 shadow-sm backdrop-blur-xl md:hidden"
      style={{
        paddingTop:
          "var(--ls-safe-area-top)",
      }}
    >
      <div className="flex min-h-16 items-center gap-2 px-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open navigation"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF1FA] text-[#2E3F7D] active:scale-95"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate text-[19px] font-bold tracking-tight text-[#26335F]">
            {config.title}
          </h1>
        </div>

        {action && ActionIcon && (
          <Link
            href={action.href}
            aria-label={action.label}
            title={action.label}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E85D4A] text-white shadow-sm active:scale-95"
          >
            <ActionIcon className="h-5 w-5" />
          </Link>
        )}

        {!locked && (
          <Link
            href="/orders"
            aria-label="Notifications"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF1FA] text-[#2E3F7D] active:scale-95"
          >
            <Bell className="h-5 w-5" />
          </Link>
        )}

        <DashboardAccountMenu
          open={accountOpen}
          onOpenChange={setAccountOpen}
          context="page"
        />
      </div>
    </header>
  );
}
