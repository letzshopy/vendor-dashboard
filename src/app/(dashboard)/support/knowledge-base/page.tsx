// src/app/support/knowledge-base/page.tsx
import { Suspense } from "react";

type KBCard = {
  title: string;
  points: string[];
};

type KBSection = {
  id: string;
  heading: string;
  cards: KBCard[];
};

const SECTIONS: KBSection[] = [
  {
    id: "getting-started",
    heading: "Getting started",
    cards: [
      {
        title: "1. What is the LetzShopy Vendor Dashboard?",
        points: [
          "A single place to manage your products, orders, shipping, payments and basic store settings.",
          "Data is synced with your LetzShopy WordPress store via WooCommerce REST API.",
          "Use the dashboard for day-to-day work; login to WordPress only when the LetzShopy team asks you to.",
        ],
      },
      {
        title: "2. Onboarding flow – from signup to first login",
        points: [
          "You sign up from the LetzShopy main site and verify your mobile number by OTP.",
          "You submit your store details (store name, business name, contact info, what you sell, preferred subdomain).",
          "The LetzShopy team reviews your application and clones a template store for you.",
          "You receive your store URL and dashboard login to start your free trial.",
        ],
      },
      {
        title: "3. First-time checklist",
        points: [
          "Go to Settings → Profile and fill in store details, address and contact information.",
          "Upload your logo and check your store header / footer on the storefront.",
          "Configure shipping zones and methods in Settings → Shipping.",
          "Enable and test at least one payment method in Settings → Payments.",
          "Add a few products to test the full flow (add product, place a test order, check emails).",
        ],
      },
    ],
  },

  {
    id: "catalog-products",
    heading: "Catalog & products",
    cards: [
      {
        title: "4. Adding your first product",
        points: [
          "From the sidebar, go to Catalog → Add Product.",
          "Fill in title, description, price, stock quantity and choose the correct category.",
          "Upload product images; the primary image becomes the main thumbnail on your store.",
          "Click Save. The product will appear on your storefront and in Catalog → Products.",
        ],
      },
      {
        title: "5. Managing product inventory",
        points: [
          "Use Catalog → Inventory to quickly view stock across all products.",
          "Update quantity when you receive new stock or sell offline.",
          "Out-of-stock products will show as unavailable if stock management is enabled.",
        ],
      },
      {
        title: "6. Categories, tags and attributes",
        points: [
          "Use Catalog → Product Categories to create saree types, bag types, etc.",
          "Use Catalog → Product Tags to mark special properties like “Festive”, “Office wear”, “Premium”.",
          "Use Catalog → Attributes for size, material or any reusable variation options.",
        ],
      },
    ],
  },

  {
    id: "orders-fulfilment",
    heading: "Orders & fulfilment",
    cards: [
      {
        title: "7. Viewing and filtering orders",
        points: [
          "Open Sales → Orders in the dashboard.",
          "Use status filter (Pending, Processing, Completed, etc.) to focus on specific groups.",
          "Use date filter and search box (#, name, email, phone, SKU, product) to find a specific order.",
        ],
      },
      {
        title: "8. Printing pack slips",
        points: [
          "Select orders from the Orders list and click “Print Pack Slips”.",
          "Pack slips help your packing team pick the right items and prepare shipments.",
          "You can re-print pack slips later if needed for partial shipments.",
        ],
      },
      {
        title: "9. Order statuses and manual UPI verification",
        points: [
          "For online gateway (Easebuzz) payments, successful payments normally move the order to Processing or Completed.",
          "For Letz UPI (Manual), orders are created as On-hold with a transaction number.",
          "Use Orders → order details to verify payment and move status to Processing or Completed after confirmation.",
        ],
      },
    ],
  },

  {
    id: "payments",
    heading: "Payments",
    cards: [
      {
        title: "10. Payment methods overview",
        points: [
          "Configure methods in Settings → Payments.",
          "We support Easebuzz (online gateway), UPI (manual), Bank Transfer and Cash on Delivery.",
          "You can enable multiple methods; customers will choose one at checkout based on your configuration.",
        ],
      },
      {
        title: "11. Manual UPI payments",
        points: [
          "Set your UPI ID and instructions in Settings → Payments → UPI (Manual).",
          "Customers see your UPI details at checkout and pay from their UPI app.",
          "Orders are placed as On-hold; you verify payment and then update the status from the Orders screen.",
        ],
      },
      {
        title: "12. Cash on Delivery (COD)",
        points: [
          "Enable COD in Settings → Payments and set clear notes (for example: partial COD not allowed, etc.).",
          "COD is usually combined with specific shipping methods or pincodes as per your policy.",
          "Use Orders list and pack slips to manage COD shipments separately for tracking and cash collection.",
        ],
      },
    ],
  },

  {
    id: "shipping",
    heading: "Shipping",
    cards: [
      {
        title: "13. Basic shipping setup",
        points: [
          "Go to Settings → Shipping in the dashboard.",
          "Create shipping zones based on states or regions (for example: South, North, All India).",
          "Add methods like Free Shipping or Weight-based Shipping to each zone.",
        ],
      },
      {
        title: "14. Weight-based shipping (template behaviour)",
        points: [
          "Assign the correct shipping class to each product (for example: Free shipping vs Weight based).",
          "The LetzShopy shipping engine calculates rates from your slabs configured in Settings → Shipping.",
          "Always test with a sample cart to confirm rates before going live.",
        ],
      },
    ],
  },

  {
    id: "support-help",
    heading: "Support & help",
    cards: [
      {
        title: "15. Using the Support → Knowledge Base",
        points: [
          "Open Support → Knowledge Base in the dashboard to read these guides.",
          "Articles are grouped by topic: Getting started, Catalog, Orders, Payments, Shipping and Support.",
          "We’ll keep adding more how-to articles and troubleshooting guides over time.",
        ],
      },
      {
        title: "16. Raising a support ticket",
        points: [
          "Go to Support → Tickets in the dashboard and click “Open Support Portal”.",
          "Log in with your LetzShopy account if asked.",
          "Choose the correct product (LetzShopy Vendor Dashboard, Template Store, etc.) and describe your issue.",
        ],
      },
      {
        title: "17. Priority and response times",
        points: [
          "Tickets are handled during business hours in the order they are received, with higher priority for live-site issues.",
          "Always include screenshots, order numbers or URLs so we can solve issues faster.",
          "You’ll receive email notifications when the LetzShopy team replies to your ticket.",
        ],
      },
    ],
  },
];

function Section({ id, heading, cards }: KBSection) {
  return (
    <section id={id} className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
          {cards.length} article{cards.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              {card.title}
            </h3>
            <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-600">
              {card.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function KnowledgeBaseContent() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            Knowledge Base
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Short, practical guides to help you use your LetzShopy store and
            vendor dashboard. Start with{" "}
            <span className="font-medium text-slate-800">Getting started</span>{" "}
            if you are new.
          </p>

          {/* Quick topics pills */}
          <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="whitespace-nowrap rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-900 hover:text-white"
              >
                {s.heading}
              </a>
            ))}
          </div>
        </header>

        {/* Sections */}
        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <Section key={section.id} {...section} />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function KnowledgeBasePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-600">
            Loading knowledge base…
          </div>
        </div>
      }
    >
      <KnowledgeBaseContent />
    </Suspense>
  );
}
