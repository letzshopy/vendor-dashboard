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
} from "lucide-react";

import ProfileTab from "./tabs/ProfileTab";
import KycTab from "./tabs/KycTab";
import PagesTab from "./tabs/PagesTab";
import GeneralTab from "./tabs/GeneralTab";
import ShippingTab from "./tabs/ShippingTab";
import TaxTab from "./tabs/TaxTab";
import PaymentsTab from "./tabs/PaymentsTab";
import AccountTab from "./tabs/AccountTab";
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
  | "coupons"
  | "shipmentFulfillment";

type TabDef = {
  id: TabId;
  label: string;
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
    description: "Subscription, billing email & LetzShopy account.",
    icon: Building2,
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
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900"></h1>
          <p className="text-sm text-slate-600">
            Manage your store profile, payments, shipping, taxes and more.
          </p>
        </div>
      </div>

      {/* Wide card – use full work area */}
      <div className="w-full rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-sky-50 to-purple-50/60 shadow-sm">
        {/* Tabs row */}
        <div className="px-4 pt-4 pb-3 border-b border-indigo-100/70">
          <div className="flex gap-2 flex-nowrap">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs md:text-sm",
                    "border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    isActive
                      ? "bg-gradient-to-r from-indigo-500 via-sky-500 to-purple-500 text-white border-transparent shadow-md"
                      : "bg-white/80 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <section className="p-4 md:p-5 bg-white/90 rounded-b-2xl">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-slate-900">
              {activeTab.label}
            </h2>
            <p className="text-xs text-slate-500">{activeTab.description}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            {TAB_COMPONENTS[activeTab.id]}
          </div>
        </section>
      </div>
    </div>
  );
}
