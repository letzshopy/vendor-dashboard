import type {
  Metadata,
} from "next";
import {
  ChevronDown,
  CircleHelp,
} from "lucide-react";

import {
  PageHeader,
} from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "FAQ | LetzShopy Vendor Help",
};

type FAQ = {
  category: string;
  q: string;
  a: string[];
};

const faqs: FAQ[] = [
  {
    category: "Onboarding & accounts",
    q: "How do I become a LetzShopy vendor?",
    a: [
      "Visit the main site letzshopy.in and review the details about plans and features.",
      "Fill the sign-up / registration form with your basic details, store name and contact information.",
      "The LetzShopy team will review your application, clone the template store for you and share your store URL and dashboard login.",
      "After that you can log in to the vendor dashboard, complete your profile and start configuring products, shipping and payments.",
    ],
  },
  {
    category: "Onboarding & accounts",
    q: "What is the difference between main site login and my store admin login?",
    a: [
      "On the main site (letzshopy.in) you have a low-power account used mainly for support tickets and, later, subscription invoices.",
      "On your own store (for example mystore.letzshopy.in) you have an admin or shop-manager account used to manage products, orders and settings.",
      "The vendor dashboard (dashboard.letzshopy.in) connects to your store via secure API and is used for daily operations like products, orders, shipping, tax and payments.",
    ],
  },
  {
    category: "Subscriptions & billing",
    q: "How does the LetzShopy subscription work?",
    a: [
      "LetzShopy is offered as a SaaS subscription. You pay a recurring fee for hosting, maintenance and the vendor tools.",
      "During onboarding you may get a short free trial period to test the platform.",
      "Your plan details (name, amount, renewal date) will be visible under Settings → Account → Subscription as this module is finalized.",
      "Automatic renewal through PayGlocal is planned; until then, renewals may be executed manually by the LetzShopy team and confirmed over email or invoice.",
    ],
  },
  {
    category: "Subscriptions & billing",
    q: "Does LetzShopy charge commission on my sales?",
    a: [
      "The main business model is subscription-based rather than commission-based.",
      "Payment gateway providers (such as PayGlocal) may still charge their own per-transaction fees.",
      "LetzShopy may add a small payment gateway handling fee per transaction depending on the plan structure communicated on the main site.",
    ],
  },
  {
    category: "Products & catalog",
    q: "Where do I add or edit products?",
    a: [
      "Open the vendor dashboard and go to Catalog → Add Product to create new products.",
      "Use Catalog → Products to edit existing products, update prices or change descriptions.",
      "You can manage categories, tags and attributes from the Catalog section to keep your catalog organized.",
    ],
  },
  {
    category: "Products & catalog",
    q: "Why is my new product not visible on the storefront?",
    a: [
      "Check that the product status is set to Published and not Draft or Pending.",
      "Ensure the product has a price and, if stock management is enabled, a non-zero stock quantity.",
      "Confirm that the product is assigned to at least one visible category.",
      "If caching is enabled on your store, clear cache or wait a few minutes and refresh the page.",
    ],
  },
  {
    category: "Orders & fulfilment",
    q: "Where can I see all my orders?",
    a: [
      "Go to Sales → Orders in the vendor dashboard to see all orders pulled from your store.",
      "Use the status filter at the top (All, Pending, Processing, On-hold, Completed…) to focus on specific orders.",
      "You can search by order number, customer name, phone, email, SKU or product name.",
    ],
  },
  {
    category: "Orders & fulfilment",
    q: "How do pack slips work?",
    a: [
      "From Sales → Orders, select one or more orders using the left checkboxes.",
      "Choose the Print Pack Slips button in the bulk action bar.",
      "A printable view opens in a new tab, which you can print directly or save as PDF for your packing team.",
    ],
  },
  {
    category: "Payments",
    q: "What payment methods can I offer to customers?",
    a: [
      "In Settings → Payments you can enable different methods depending on what is configured on your store.",
      "Typical options include: PayGlocal (online payment gateway), UPI (Manual), direct bank transfer and cash on delivery.",
      "For each method you can control whether it is enabled and, for some, what details are displayed at checkout.",
    ],
  },
  {
    category: "Payments",
    q: "How does UPI (Manual) payment work for orders?",
    a: [
      "On checkout, customers see your UPI payment number, UPI ID and optionally a QR code.",
      "They pay from their UPI app and enter the transaction number in the checkout form.",
      "An order is created in with status On-hold and tagged with the customer’s transaction number.",
      "You review the screenshot and transaction details, then mark the order Processing or Completed once payment is confirmed.",
    ],
  },
  {
    category: "Shipping",
    q: "How do I set up shipping charges?",
    a: [
      "Go to Settings → Shipping in the vendor dashboard.",
      "Configure shipping zones (for example, All India, South India, specific states) and add methods like Free shipping or Weight-based shipping under each zone.",
      "Use product categories and shipping classes to control which products get free shipping and which use weight-based slabs.",
      "Always test your checkout with different addresses to confirm that shipping behaves as expected.",
    ],
  },
  {
    category: "Shipping",
    q: "Does LetzShopy integrate with courier companies?",
    a: [
      "At present, LetzShopy focuses on configuring shipping charges inside.",
      "You create and manage shipments with your own courier or aggregator dashboard (such as Shift or others).",
      "Deeper multi-vendor shipping integrations are planned for future phases of the platform.",
    ],
  },
  {
    category: "Support",
    q: "How do I contact support if I get stuck?",
    a: [
      "From the vendor dashboard, go to Support → Tickets or use the Support card on the dashboard home.",
      "Click the Open Support Portal button to open the LetzShopy Vendor Support page on the main site.",
      "Log in with your vendor email and create a ticket. Include your store URL and order numbers for faster resolution.",
    ],
  },
  {
    category: "Support",
    q: "When should I use Knowledge Base vs support tickets?",
    a: [
      "Use the Knowledge Base and FAQ first for general how-to questions, setup steps and explanations.",
      "Use tickets when something is broken, you see error messages, or you need a manual change from the LetzShopy team.",
      "If an answer is missing from the docs, you can ask support to create a new article and it will be added to the Knowledge Base.",
    ],
  },
];

function groupByCategory(
  items: FAQ[]
) {
  const map =
    new Map<
      string,
      FAQ[]
    >();

  for (const item of items) {
    if (
      !map.has(
        item.category
      )
    ) {
      map.set(
        item.category,
        []
      );
    }

    map.get(
      item.category
    )!.push(item);
  }

  return Array.from(
    map.entries()
  );
}

function slugify(
  label: string
) {
  return label
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /(^-|-$)/g,
      ""
    );
}

export default function FAQPage() {
  const grouped =
    groupByCategory(
      faqs
    );

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
      <PageHeader
        className="hidden md:flex"
        eyebrow="Support"
        icon={CircleHelp}
        title="FAQ"
        description="Quick answers about onboarding, products, orders, payments, shipping and support."
      />

      <div className="space-y-5 md:mt-5 md:space-y-7">
        <nav
          aria-label="FAQ categories"
          className="touch-scroll -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:flex-wrap md:px-0"
        >
          {grouped.map(
            ([
              category,
            ]) => (
              <a
                key={category}
                href={`#${slugify(category)}`}
                className="ls-focus-ring inline-flex min-h-10 shrink-0 items-center rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground hover:bg-muted"
              >
                {category}
              </a>
            )
          )}
        </nav>

        {grouped.map(
          ([
            category,
            items,
          ]) => (
            <section
              key={category}
              id={slugify(category)}
              className="scroll-mt-24 space-y-2.5 md:space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-extrabold text-heading md:text-lg">
                  {category}
                </h2>

                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
                  {items.length}
                </span>
              </div>

              <div className="grid gap-2 md:grid-cols-2 md:gap-3">
                {items.map(
                  (
                    item
                  ) => (
                    <details
                      key={item.q}
                      className="group rounded-xl border border-border bg-card md:rounded-2xl"
                    >
                      <summary className="ls-focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-3 text-left md:rounded-2xl md:px-4">
                        <span className="text-sm font-bold leading-5 text-heading">
                          {item.q}
                        </span>

                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>

                      <div className="space-y-2 border-t border-border px-3 pb-3 pt-3 text-sm leading-6 text-foreground md:px-4 md:pb-4">
                        {item.a.map(
                          (
                            line
                          ) => (
                            <p key={line}>
                              {line}
                            </p>
                          )
                        )}
                      </div>
                    </details>
                  )
                )}
              </div>
            </section>
          )
        )}
      </div>
    </main>
  );
}
