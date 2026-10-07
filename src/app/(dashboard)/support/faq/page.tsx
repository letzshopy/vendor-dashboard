import type {
  Metadata,
} from "next";
import Link from "next/link";
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
    category: "Getting started",
    q: "What is the difference between my Store Website and the LetzShopy Business Dashboard?",
    a: [
      "Your Store Website is customer-facing: customers browse, add to cart and checkout there.",
      "The Business Dashboard is your operating workspace for products, orders, customers, payments, shipping, offers, reports, billing and settings.",
      "LetzShopy manages the underlying platform and technical infrastructure.",
    ],
  },
  {
    category: "Getting started",
    q: "What should I complete before taking real orders?",
    a: [
      "Verify Profile & Account, Store Settings, Shipping & Delivery, Payments, Website Setup and KYC.",
      "Add at least one test product and complete a test checkout using every payment method you plan to enable.",
      "Enable new-order notifications so you do not miss live orders.",
    ],
  },
  {
    category: "Getting started",
    q: "How long is the normal onboarding trial?",
    a: [
      "The current onboarding policy uses a 7-day trial.",
      "Use the trial to complete setup, KYC, subscription actions, sample products and transaction testing.",
    ],
  },
  {
    category: "Getting started",
    q: "Can I access WordPress admin?",
    a: [
      "Normal vendor operations are designed to happen through the LetzShopy dashboard.",
      "WordPress/platform administration remains LetzShopy-controlled so store owners do not need to manage infrastructure or technical plugins.",
    ],
  },

  {
    category: "Products",
    q: "Which product type should I choose?",
    a: [
      "Choose Simple Product for one price and one stock quantity.",
      "Choose Size Variations when each size needs its own price and quantity.",
      "Choose Colour Variations when each colour needs its own price, quantity and colour-specific images.",
    ],
  },
  {
    category: "Products",
    q: "Why does a Size Variation product ask for a base SKU?",
    a: [
      "Variable products use a base SKU as the identity for their generated variation SKUs.",
      "The dashboard checks that the SKU is not already in use before allowing the product flow to continue.",
    ],
  },
  {
    category: "Products",
    q: "Do I need separate images for every size?",
    a: [
      "No. The current Size Variation flow uses the shared product gallery.",
      "Colour Variation products are different: every colour must have at least one image.",
    ],
  },
  {
    category: "Products",
    q: "Why is my new product not visible on the storefront?",
    a: [
      "Check whether the product is Published rather than Draft and Visible rather than Hidden.",
      "Also check price, stock and category assignment.",
      "If the category should appear in navigation, verify Menu Layout separately because category creation does not automatically add a menu link.",
    ],
  },

  {
    category: "Categories & menu",
    q: "Does creating a product category automatically add it to the website menu?",
    a: [
      "No. Product categories and Website Menu are separate.",
      "Create/select the category first, then use Menu Layout to add it to Website Menu when you want customers to navigate to it directly.",
    ],
  },
  {
    category: "Categories & menu",
    q: "How do I add a category to the Website Menu?",
    a: [
      "Open Menu Layout → Website Menu → Add Item → Category.",
      "Search for the category, add it, arrange it in the correct position and save.",
      "Check both desktop and mobile storefront navigation after saving.",
    ],
  },
  {
    category: "Categories & menu",
    q: "If I remove a category from the menu, will the category and products be deleted?",
    a: [
      "No. Removing the menu item removes only the navigation link.",
      "The underlying product category and its assigned products remain in the catalogue.",
    ],
  },
  {
    category: "Categories & menu",
    q: "Can I place a category under another menu group?",
    a: [
      "Yes. Use Menu Layout to move/rearrange menu items and organize customer-facing navigation.",
      "After changing the hierarchy, save and check the storefront mobile menu as well as desktop navigation.",
    ],
  },

  {
    category: "Orders & notifications",
    q: "What does On Hold mean for a Manual UPI order?",
    a: [
      "It normally means the order exists but the vendor still needs to verify the Manual UPI payment.",
      "Do not pack or fulfil it as a confirmed paid order until the payment has genuinely been checked.",
    ],
  },
  {
    category: "Orders & notifications",
    q: "Can LetzShopy notify me when a new order arrives?",
    a: [
      "Yes. Supported browsers/installed PWA can receive new-order push notifications.",
      "Choose Enable order notifications when prompted and allow browser/phone notification permission.",
    ],
  },
  {
    category: "Orders & notifications",
    q: "How do I send an order update to the customer on WhatsApp?",
    a: [
      "Open Sales → Orders, open the action menu for the order and choose Notify status in WhatsApp.",
      "LetzShopy creates a branded draft from the current order information.",
      "WhatsApp opens with the draft ready; review it and press Send yourself.",
    ],
  },
  {
    category: "Orders & notifications",
    q: "Is the WhatsApp order message sent automatically?",
    a: [
      "No. The current feature creates a WhatsApp draft and opens WhatsApp for the vendor.",
      "The vendor reviews and sends the message. It is not automatic WhatsApp API messaging.",
    ],
  },
  {
    category: "Orders & notifications",
    q: "What is Recent Order Notification in Website Setup?",
    a: [
      "It is privacy-safe social proof shown to storefront visitors using genuine WooCommerce order information.",
      "It is different from the vendor's new-order push notification and different from customer WhatsApp/email messages.",
      "You control On/Off; LetzShopy manages the design, position and timing.",
    ],
  },

  {
    category: "Payments",
    q: "Which payment methods can my store use?",
    a: [
      "The dashboard currently supports PayGlocal online payments, Manual UPI, Direct Bank Transfer and Cash on Delivery where enabled for the store.",
      "Enable only the methods your business can operate correctly and test each one at checkout.",
    ],
  },
  {
    category: "Payments",
    q: "Does PayGlocal payment update the order automatically?",
    a: [
      "The integration is designed for automatic payment confirmation and WooCommerce order updates.",
      "For a PayGlocal order, use Payment Information / Sales → Payments to inspect the live gateway state when you need confirmation.",
    ],
  },
  {
    category: "Payments",
    q: "What PayGlocal information can I see in the dashboard?",
    a: [
      "Where returned by the gateway, the dashboard can show the PayGlocal GID, provider status, friendly status, reason code and identity check.",
      "The WooCommerce order status is shown separately so you can compare payment and order state.",
    ],
  },
  {
    category: "Payments",
    q: "What are the PayGlocal charges and settlement time?",
    a: [
      "Exact gateway fees, GST on gateway charges and settlement cycle depend on the currently approved PayGlocal commercial arrangement.",
      "Use the latest terms communicated for your merchant/store rather than an old generic percentage or assumed T+1/T+2 cycle.",
      "If a settlement is late, keep the order number, GID, amount and payment date ready for support.",
    ],
  },
  {
    category: "Payments",
    q: "How do I verify Manual UPI payment?",
    a: [
      "Open the UPI payment/order information and review the transaction number or UTR.",
      "If proof is required, open and verify the protected payment proof.",
      "Use Verify & Confirm Payment only after genuinely checking the payment.",
      "The system prevents verification when required transaction/proof information is missing.",
    ],
  },
  {
    category: "Payments",
    q: "A customer says PayGlocal succeeded but the order is not Processing. What should I do?",
    a: [
      "Compare the live PayGlocal status with the Woo order status and refresh once.",
      "Record order number, amount, GID, provider status/reason and payment time.",
      "Do not manually mark it paid only from the customer's success screen when the gateway/store state is inconsistent; open a support ticket with the evidence.",
    ],
  },

  {
    category: "Shipping & packing",
    q: "What is the difference between Shift Logistics and Self Shipping?",
    a: [
      "Shift Logistics uses the supported LetzShopy shipment-booking flow with saved pickup details where available.",
      "Self Shipping means you book your own courier and enter courier/tracking information after dispatch.",
    ],
  },
  {
    category: "Shipping & packing",
    q: "How do I add shipment information for Self Shipping?",
    a: [
      "Open Sales → Shipment Details and choose Add Details for the Processing order.",
      "Courier Name and Tracking Number are required. Tracking Link is optional but must be a valid http/https URL.",
      "The current save flow marks the order Completed, so enter the details only after dispatch is real.",
    ],
  },
  {
    category: "Shipping & packing",
    q: "How do I download the packing slip / address printout?",
    a: [
      "Open Sales → Orders and select one or more orders.",
      "On desktop choose Download Pack Slips; on mobile use the Slip action shown for selected orders.",
      "The dashboard generates the packing-slip PDF for those orders.",
    ],
  },
  {
    category: "Shipping & packing",
    q: "Which sender/return address prints on packing slips?",
    a: [
      "In Settings → Shipping & Delivery → Delivery Setup → Self Shipping, choose the Packing Slip Sender Address.",
      "You can use the Store Profile address or enter a separate sender/return address.",
      "Generate a test slip after changing it.",
    ],
  },
  {
    category: "Shipping & packing",
    q: "Will the customer receive tracking information by email?",
    a: [
      "When shipment details exist on a completed order, LetzShopy can add courier, tracking number, shipped date and Track Shipment link to the customer's completed-order email.",
      "You can also send a WhatsApp status draft as an additional customer update.",
    ],
  },

  {
    category: "Offers & storefront content",
    q: "What is the difference between Sale Event, Coupon Offer and Welcome Offer?",
    a: [
      "Sale Event changes eligible product/category pricing or free-shipping behaviour for a date range.",
      "Automatic Coupon Offer applies when its conditions pass without asking the customer to type the internal managed code.",
      "Welcome Offer is intended for the first eligible order within its validity rules.",
    ],
  },
  {
    category: "Offers & storefront content",
    q: "What pricing methods can I use in a Sale Event?",
    a: [
      "Percentage Discount, Fixed Amount Discount, Manual Sale Price and Free Shipping are available in the current Sale Event flow.",
      "Review the affected product preview and test the storefront before advertising the offer.",
    ],
  },
  {
    category: "Offers & storefront content",
    q: "What does Regenerate do in Promotional Copy?",
    a: [
      "The dashboard generates promotional wording from your offer name, categories, discount and dates.",
      "Regenerate cycles to another prepared wording variation.",
      "The text remains editable, so review the actual offer conditions before using it on social media.",
    ],
  },
  {
    category: "Offers & storefront content",
    q: "How do Shoppable Videos work?",
    a: [
      "Upload a supported MP4 and tag at least one product or category.",
      "You can add/replace a thumbnail and later edit the video, title or tags.",
      "Newest managed videos are prioritized in the storefront flow.",
    ],
  },
  {
    category: "Offers & storefront content",
    q: "How does Customer Feedback become visible on the storefront?",
    a: [
      "Create/edit feedback in Sales → Customer Feedback and choose Show.",
      "Hide keeps it in the dashboard only.",
      "You may link an existing order to prefill customer information and can add an optional image.",
    ],
  },

  {
    category: "Settings",
    q: "Which Settings tab should I use for business contact information?",
    a: [
      "Use Profile & Account for owner/contact details, business/store identity, business contact, customer WhatsApp and social links.",
      "Use the account/security area there for login identity and password changes.",
    ],
  },
  {
    category: "Settings",
    q: "Where do I configure stock alerts and out-of-stock behaviour?",
    a: [
      "Use Settings → Store Settings.",
      "You can manage stock, low/no-stock alerts, alert email, low-stock threshold, stock display and Hide Out-of-Stock behaviour.",
    ],
  },
  {
    category: "Settings",
    q: "Where do I configure GST?",
    a: [
      "Use Settings → Store Settings → Tax/GST area.",
      "Fields include GST enablement, price tax treatment, calculation basis, storefront/checkout display, state, GSTIN, slab, legal name and trade name.",
      "Confirm tax treatment with your tax professional when unsure.",
    ],
  },
  {
    category: "Settings",
    q: "Where do I configure returns, exchanges, refunds and cancellation rules?",
    a: [
      "Use Settings → Website Setup.",
      "It contains structured inputs for return/exchange eligibility, request window, unboxing-video requirement, return shipping, pickup, refund time/method, return address and cancellation rules.",
    ],
  },

  {
    category: "Subscription & billing",
    q: "When will I be reminded about subscription renewal?",
    a: [
      "The current subscription policy has reminder points at 7 days before renewal, 3 days before renewal and the due date.",
      "Use Billing → Subscription to review the current status and next renewal date.",
    ],
  },
  {
    category: "Subscription & billing",
    q: "What happens if I miss the renewal due date?",
    a: [
      "The current policy gives a 5-day grace period.",
      "During grace, the dashboard warns you to complete payment.",
      "After grace, expired/suspended status can restrict dashboard access, suspend the storefront and disable checkout.",
    ],
  },
  {
    category: "Subscription & billing",
    q: "What does Payment Submitted mean?",
    a: [
      "It means your subscription payment reference/UTR has been submitted and is awaiting LetzShopy verification.",
      "Do not make another payment only because the status has not yet become Active.",
    ],
  },
  {
    category: "Subscription & billing",
    q: "Is domain renewal the same as my LetzShopy subscription renewal?",
    a: [
      "No. Domain renewal is a separate yearly service with its own renewal date, amount/payment state and invoice where enabled.",
      "Keep domain renewal actions separate from the regular platform subscription lifecycle.",
    ],
  },
  {
    category: "Subscription & billing",
    q: "Where can I find my subscription invoices?",
    a: [
      "Open Subscription Invoices in the dashboard.",
      "Open an invoice for details and use its Print/PDF actions when needed.",
      "Subscription Invoices are different from customer Order Invoices.",
    ],
  },

  {
    category: "Reports & analytics",
    q: "Which reports are available?",
    a: [
      "The Reports module currently includes Orders, Customers, Stock and Website Analytics.",
      "Use the date range/filter controls before comparing periods.",
    ],
  },
  {
    category: "Reports & analytics",
    q: "What should I use the Orders Report for?",
    a: [
      "Use it to understand sales/order movement, item volume, shipping/refunds and performance by supported groupings such as product/category.",
      "Open the underlying order when you need transaction-level detail.",
    ],
  },
  {
    category: "Reports & analytics",
    q: "What should I check in the Stock Report?",
    a: [
      "Watch In Stock, Low Stock and Out of Stock products.",
      "Check low-stock items before running offers and update the actual inventory through the relevant catalogue/inventory flow.",
    ],
  },
  {
    category: "Reports & analytics",
    q: "What do Website Analytics metrics mean?",
    a: [
      "Live Users shows current/recent active traffic when realtime data is available.",
      "Active Users, Page Views, Sessions and Events measure different kinds of activity.",
      "Top Pages, Top Category Views and Device Split help you understand what visitors browse and which devices they use.",
    ],
  },

  {
    category: "Troubleshooting & support",
    q: "Why did my dashboard become restricted?",
    a: [
      "Check Billing → Subscription first.",
      "Expired or suspended subscription status can restrict normal dashboard modules according to the current access policy.",
      "Follow the displayed subscription action/payment workflow instead of repeatedly logging out and in.",
    ],
  },
  {
    category: "Troubleshooting & support",
    q: "Why can I not verify a Manual UPI order?",
    a: [
      "The order must be a Manual UPI order still awaiting verification.",
      "A valid transaction number is required and, when proof is required, that proof must be available.",
      "The verification control is intentionally blocked when required evidence is missing.",
    ],
  },
  {
    category: "Troubleshooting & support",
    q: "Why can I not save shipment details?",
    a: [
      "Courier Name and Tracking Number are mandatory.",
      "If you enter a Tracking Link, it must be a valid http/https URL.",
      "Make sure the order is genuinely ready to complete before saving.",
    ],
  },
  {
    category: "Troubleshooting & support",
    q: "What should I include in a support ticket?",
    a: [
      "Include your Store URL, the dashboard page, and the relevant order/product/payment reference.",
      "Add a screenshot or short screen recording, what you expected, what happened and the approximate time.",
      "Never send passwords, OTPs or gateway secrets in the ticket description.",
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
        description="Quick answers about products, orders, payments, shipping, settings, billing and day-to-day store operations."
      />

      <div className="space-y-5 md:mt-5 md:space-y-7">
        <section className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-3 md:rounded-2xl md:px-4">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-heading">
              Need step-by-step instructions?
            </div>
            <div className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
              The Knowledge Base has full operating guides for the vendor dashboard.
            </div>
          </div>

          <Link
            href="/support/knowledge-base"
            className="ls-focus-ring inline-flex min-h-10 shrink-0 items-center rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"
          >
            Knowledge Base
          </Link>
        </section>

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
                href={"#" + slugify(category)}
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
                            line,
                            index
                          ) => (
                            <p
                              key={
                                item.q +
                                "-" +
                                index
                              }
                            >
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
