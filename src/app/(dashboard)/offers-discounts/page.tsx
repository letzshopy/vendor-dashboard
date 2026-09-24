import { isStandaloneV1DashboardPathAllowed } from "@/lib/storeCapabilities";
import { getTenantFromCookies } from "@/lib/tenant";
import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  Gift,
  TicketPercent,
} from "lucide-react";

export const metadata = {
  title: "Offers & Discounts",
};

const OFFER_TOOLS = [
  {
    href: "/offers-discounts/sale-events",
    title: "Offer Sale",
    description:
      "Schedule discounts or free shipping for selected products.",
    icon: CalendarRange,
  },
  {
    href: "/offers-discounts/coupons",
    title: "Coupons",
    description:
      "Create cart discounts and control expiry and usage.",
    icon: TicketPercent,
  },
  {
    href: "/offers-discounts/welcome-offer",
    title: "Welcome",
    description:
      "Reward new customers automatically after signup.",
    icon: Gift,
  },
];

export default async function OffersDiscountsPage() {
  const tenant =
    await getTenantFromCookies();

  const storeType =
    tenant?.store_type ||
    "multisite";

  const visibleOfferTools =
    OFFER_TOOLS.filter(
      (tool) =>
        isStandaloneV1DashboardPathAllowed(
          storeType,
          tool.href
        )
    );

  return (
    <main className="ls-page mx-auto max-w-[1440px] px-3 pb-28 pt-4 md:px-4 md:pb-8 md:pt-5">
      <div className="hidden md:block">
        <h1 className="text-[30px] font-extrabold tracking-tight text-heading">
          Offers & Discounts
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          Create offer sales, coupons and new-customer offers.
        </p>
      </div>

      <div className="grid gap-3 md:mt-5 md:grid-cols-3">
        {visibleOfferTools.map(
          (tool) => {
            const Icon =
              tool.icon;

            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex min-h-[104px] items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-muted/30"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                  <Icon className="h-5 w-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-heading">
                    {tool.title}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                    {
                      tool.description
                    }
                  </span>
                </span>

                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            );
          }
        )}
      </div>
    </main>
  );
}
