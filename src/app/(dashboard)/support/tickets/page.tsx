import type {
  Metadata,
} from "next";
import {
  ExternalLink,
  LifeBuoy,
  Lightbulb,
  MessageSquareText,
} from "lucide-react";

import {
  buttonClassName,
} from "@/components/ui/button";
import {
  PageHeader,
} from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Support Tickets | LetzShopy Vendor Help",
};

const SUPPORT_URL =
  process.env.NEXT_PUBLIC_VENDOR_SUPPORT_URL ||
  "https://letzshopy.in/vendor-support/";

export default function TicketsPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
      <PageHeader
        className="hidden md:flex"
        eyebrow="Support"
        icon={LifeBuoy}
        title="Support"
        description="Open the LetzShopy Support Portal for store, order, payment, shipping or dashboard help."
      />

      <div className="grid gap-3 md:mt-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-4">
        <section className="order-2 overflow-hidden rounded-xl border border-border bg-card lg:order-1 md:rounded-2xl">
          <div className="border-b border-border px-3 py-3 md:px-5 md:py-4">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-extrabold text-heading md:text-base">
                How support works
              </h2>
            </div>
          </div>

          <div className="grid gap-0 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="p-3 md:p-5">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                You can raise a ticket for
              </div>

              <ul className="mt-3 space-y-2.5 text-sm leading-5 text-foreground">
                {[
                  "Store setup, design and onboarding",
                  "Orders, checkout, shipping or payment issues",
                  "Vendor dashboard bugs or error messages",
                  "Billing, subscription or WhatsApp add-ons",
                ].map(
                  (
                    item
                  ) => (
                    <li
                      key={item}
                      className="flex gap-2.5"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>
                        {item}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="p-3 md:p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" />
                Faster resolution
              </div>

              <ul className="mt-3 space-y-2.5 text-sm leading-5 text-foreground">
                <li>
                  Mention your Store URL.
                </li>
                <li>
                  Add the order number when the issue is order-related.
                </li>
                <li>
                  Attach screenshots or a screen recording when possible.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="order-1 rounded-xl border border-border bg-card p-3 lg:order-2 md:rounded-2xl md:p-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <LifeBuoy className="h-5 w-5" />
          </div>

          <h2 className="mt-3 text-base font-extrabold text-heading md:text-lg">
            Need help now?
          </h2>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Open the support portal to create a ticket or review an existing one.
          </p>

          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName({
              variant:
                "primary",
              size: "lg",
              className:
                "mt-4 w-full",
            })}
          >
            Open Support Portal
            <ExternalLink className="h-4 w-4" />
          </a>

          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            The portal uses your LetzShopy email. Sign in there if requested.
          </p>
        </section>
      </div>
    </main>
  );
}
