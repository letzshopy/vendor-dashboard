"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  Gift,
  LayoutGrid,
  TicketPercent,
} from "lucide-react";

const ITEMS = [
  {
    href: "/offers-discounts",
    label: "All Offers",
    icon: LayoutGrid,
    exact: true,
  },
  {
    href: "/offers-discounts/sale-events",
    label: "Sale Events",
    icon: CalendarRange,
  },
  {
    href: "/offers-discounts/coupons",
    label: "Coupon Codes",
    icon: TicketPercent,
  },
  {
    href: "/offers-discounts/welcome-offer",
    label: "Welcome Offer",
    icon: Gift,
  },
];

export default function OffersDiscountsNav() {
  const pathname = usePathname() || "/";

  return (
    <nav
      aria-label="Offers and discounts"
      className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white p-2 shadow-sm"
    >
      <div className="flex min-w-max gap-2">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition",
                active
                  ? "bg-gradient-to-r from-indigo-600 via-sky-500 to-violet-500 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
