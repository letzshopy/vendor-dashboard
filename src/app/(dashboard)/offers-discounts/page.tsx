import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  Gift,
  Sparkles,
  TicketPercent,
} from "lucide-react";

export const metadata = { title: "Offers & Discounts" };

const OFFER_TOOLS = [
  {
    href: "/offers-discounts/sale-events",
    title: "Sale Events",
    description:
      "Schedule product-price discounts, manual sale prices or free shipping for selected categories and products.",
    icon: CalendarRange,
    badge: "Product price",
  },
  {
    href: "/offers-discounts/coupons",
    title: "Coupon Codes",
    description:
      "Create shareable WooCommerce coupon codes that customers can apply to their cart or selected products.",
    icon: TicketPercent,
    badge: "Cart coupon",
  },
  {
    href: "/offers-discounts/welcome-offer",
    title: "Welcome Offer",
    description:
      "Automatically email a personal first-order benefit to every eligible customer after signup.",
    icon: Gift,
    badge: "New customers",
  },
];

export default function OffersDiscountsPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-3 pb-28 pt-4 md:px-4 md:pb-8 md:pt-5">
      <section className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#faf6ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
          <Sparkles className="h-3.5 w-3.5" />
          Sales
        </div>

        <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
          Offers & Discounts
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Manage every customer offer from one place while each offer continues
          to use its correct pricing or coupon engine.
        </p>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        {OFFER_TOOLS.map((tool) => {
          const Icon = tool.icon;

          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>

                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">
                  {tool.badge}
                </span>
              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">
                {tool.title}
              </h2>

              <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-500">
                {tool.description}
              </p>

              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
                Manage {tool.title}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          );
        })}
      </section>

      <section className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          How these offers work together
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sale Event
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Changes the displayed product price or shipping benefit during its
              scheduled dates.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Coupon Code
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Applies a vendor-created code to the cart according to its expiry
              and usage rules.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Welcome Offer
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Issues one personal first-order coupon after an eligible customer
              creates an account.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
