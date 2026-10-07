"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  Gift,
  TicketPercent,
} from "lucide-react";

const ITEMS = [
  {
    href: "/offers-discounts/sale-events",
    label: "Offer Sale",
    shortLabel: "Offer Sale",
    icon: CalendarRange,
  },
  {
    href: "/offers-discounts/coupons",
    label: "Coupons",
    shortLabel: "Coupons",
    icon: TicketPercent,
  },
  {
    href: "/offers-discounts/welcome-offer",
    label: "Welcome",
    shortLabel: "Welcome",
    icon: Gift,
  },
];

export default function OffersDiscountsNav() {
  const pathname = usePathname() || "/";

  return (
    <nav
      aria-label="Offers and discounts"
      className="-mx-1 overflow-x-auto px-1 pb-1"
    >
      <div className="flex min-w-max gap-2">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(
              `${item.href}/`
            );

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "ls-focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-xs font-bold transition",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:brightness-95",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="sm:hidden">
                {item.shortLabel}
              </span>
              <span className="hidden sm:inline">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
