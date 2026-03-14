"use client";

import type React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  User,
  IdCard,
  FileText,
  Settings2,
  Truck,
  Percent,
  CreditCard,
  Building2,
  TicketPercent,
  PackageSearch,
  Receipt,
} from "lucide-react";

import ProfileTab from "./tabs/ProfileTab";
import KycTab from "./tabs/KycTab";
import PagesTab from "./tabs/PagesTab";
import GeneralTab from "./tabs/GeneralTab";
import ShippingTab from "./tabs/ShippingTab";
import TaxTab from "./tabs/TaxTab";
import PaymentsTab from "./tabs/PaymentsTab";
import AccountTab from "./tabs/AccountTab";
import SubscriptionTab from "./tabs/SubscriptionTab";
import CouponsTab from "./tabs/CouponsTab";
import ShipmentFulfillmentTab from "./tabs/ShipmentFulfillmentTab";

type TabId =
  | "profile"
  | "kyc"
  | "pages"
  | "general"
  | "shipping"
  | "tax"
  | "payments"
  | "account"
  | "subscription"
  | "coupons"
  | "shipmentFulfillment";

type TabDef = {
  id: TabId;
  label: string;
  shortLabel?: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TAB_COMPONENTS: Record<TabId, React.ReactNode> = {
  profile: <ProfileTab />,
  kyc: <KycTab />,
  pages: <PagesTab />,
  general: <GeneralTab />,
  shipping: <ShippingTab />,
  tax: <TaxTab />,
  payments: <PaymentsTab />,
  account: <AccountTab />,
  subscription: <SubscriptionTab />,
  coupons: <CouponsTab />,
  shipmentFulfillment: <ShipmentFulfillmentTab />,
};

const TABS: TabDef[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Personal info, business details & logo.",
    icon: User,
  },
  {
    id: "kyc",
    label: "KYC",
    description: "Upload and manage verification documents.",
    icon: IdCard,
  },
  {
    id: "pages",
    label: "Pages",
    description: "Home, Shop, Cart, Checkout & legal pages.",
    icon: FileText,
  },
  {
    id: "general",
    label: "General",
    description: "Currency, measurements & basic Woo settings.",
    icon: Settings2,
  },
  {
    id: "shipping",
    label: "Shipping Charge",
    shortLabel: "Shipping",
    description: "Zones, methods & weight-based shipping rules.",
    icon: Truck,
  },
  {
    id: "tax",
    label: "Tax",
    description: "GST slabs, display options & invoice tax.",
    icon: Percent,
  },
  {
    id: "payments",
    label: "Payments",
    description: "UPI, Easebuzz, bank transfer & COD options.",
    icon: CreditCard,
  },
  {
    id: "account",
    label: "Account",
    description: "Account details, contact info and login security.",
    icon: Building2,
  },
  {
    id: "subscription",
    label: "Subscription",
    shortLabel: "Plans",
    description: "Choose plan, billing period, payment and renewal details.",
    icon: Receipt,
  },
  {
    id: "coupons",
    label: "Coupons",
    description: "Discount codes and offers for your store.",
    icon: TicketPercent,
  },
  {
    id: "shipmentFulfillment",
    label: "Shipment Fulfillment",
    shortLabel: "Fulfillment",
    description: "Courier details, tracking updates & order completion.",
    icon: PackageSearch,
  },
];

export default function SettingsTabsClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeId = (sp.get("tab") as TabId) || "profile";
  const activeTab = TABS.find((t) => t.id === activeId) ?? TABS[0];

  function setTab(id: TabId) {
    const q = new URLSearchParams(sp.toString());
    q.set("tab", id);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Settings
          </h1>
          <p className="text-sm text-slate-600">
            Manage your store profile, payments, shipping, taxes and more.
          </p>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-indigo-50/70 to-sky-50/70 p-4 md:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={[
                    "group flex min-h-[56px] items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    isActive
                      ? "border-transparent bg-gradient-to-r from-indigo-600 via-sky-500 to-violet-500 text-white shadow-md"
                      : "border-slate-200 bg-white/90 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/70 hover:shadow-sm",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
                      isActive
                        ? "bg-white/18 text-white"
                        : "bg-slate-100 text-slate-600 group-hover:bg-white group-hover:text-indigo-600",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <div
                      className={[
                        "truncate text-sm font-semibold",
                        isActive ? "text-white" : "text-slate-800",
                      ].join(" ")}
                    >
                      <span className="sm:hidden">
                        {tab.shortLabel || tab.label}
                      </span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </div>
                    <div
                      className={[
                        "mt-0.5 hidden truncate text-[11px] md:block",
                        isActive ? "text-white/80" : "text-slate-500",
                      ].join(" ")}
                    >
                      {tab.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <section className="bg-white p-4 md:p-6">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">
              {activeTab.label}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {activeTab.description}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white">
            {TAB_COMPONENTS[activeTab.id]}
          </div>
        </section>
      </div>
    </div>
  );
}