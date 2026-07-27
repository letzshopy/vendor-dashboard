"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  User,
  IdCard,
  LayoutTemplate,
  Settings2,
  Truck,
  Percent,
  CreditCard,
  Building2,
  PackageSearch,
  PanelLeftClose,
  X,
  ChevronRight,
} from "lucide-react";

import ProfileTab from "./tabs/ProfileTab";
import KycTab from "./tabs/KycTab";
import SetupSiteTab from "./tabs/SetupSiteTab";
import GeneralTab from "./tabs/GeneralTab";
import ShippingTab from "./tabs/ShippingTab";
import TaxTab from "./tabs/TaxTab";
import PaymentsTab from "./tabs/PaymentsTab";
import AccountTab from "./tabs/AccountTab";
import ShipmentFulfillmentTab from "./tabs/ShipmentFulfillmentTab";

type TabId =
  | "profile"
  | "kyc"
  | "setupSite"
  | "general"
  | "shipping"
  | "tax"
  | "payments"
  | "account"
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
  setupSite: <SetupSiteTab />,
  general: <GeneralTab />,
  shipping: <ShippingTab />,
  tax: <TaxTab />,
  payments: <PaymentsTab />,
  account: <AccountTab />,
  shipmentFulfillment: <ShipmentFulfillmentTab />,
};

const TABS: TabDef[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Personal info, business details, logo and social links.",
    icon: User,
  },
  {
    id: "kyc",
    label: "KYC",
    description: "Upload and manage verification documents.",
    icon: IdCard,
  },
  {
    id: "setupSite",
    label: "Setup Site",
    shortLabel: "Setup Site",
    description: "Branding, banner, contact info, about and policy inputs.",
    icon: LayoutTemplate,
  },
  {
    id: "general",
    label: "General",
    description: "Currency, measurements and basic Woo settings.",
    icon: Settings2,
  },
  {
    id: "shipping",
    label: "Shipping Charge",
    shortLabel: "Shipping",
    description: "Zones, methods and weight-based shipping rules.",
    icon: Truck,
  },
  {
    id: "tax",
    label: "Tax",
    description: "GST slabs, display options and invoice tax.",
    icon: Percent,
  },
  {
    id: "payments",
    label: "Payments",
    description: "UPI, Easebuzz, bank transfer and COD options.",
    icon: CreditCard,
  },
  {
    id: "account",
    label: "Account",
    description: "Account details, plan info and login security.",
    icon: Building2,
  },
  {
    id: "shipmentFulfillment",
    label: "Shipment Fulfillment",
    shortLabel: "Fulfillment",
    description: "Courier details, tracking updates and order completion.",
    icon: PackageSearch,
  },
];

function normalizeTab(rawTab: string | null): TabId {
  if (rawTab === "pages") return "setupSite";
  if (TABS.some((t) => t.id === rawTab)) return rawTab as TabId;
  return "profile";
}

export default function SettingsTabsClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeId = normalizeTab(sp.get("tab"));
  const activeTab = useMemo(
    () => TABS.find((t) => t.id === activeId) ?? TABS[0],
    [activeId]
  );

  function setTab(id: TabId) {
    const q = new URLSearchParams(sp.toString());
    q.set("tab", id);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    setMobileMenuOpen(false);
  }

  return (
    <>
      <div className="space-y-4 md:space-y-5">
        <div className="space-y-1">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
            Settings
          </h1>
         </div>

        {/* Mobile section switcher */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex w-full items-center justify-between rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-sky-500 to-violet-500 text-white shadow-sm">
                <activeTab.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {activeTab.shortLabel || activeTab.label}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  Tap to change section
                </span>
              </span>
            </span>

            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
          {/* Desktop sidebar */}
          <aside className="hidden md:block">
            <div className="sticky top-[92px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-indigo-50/60 to-sky-50/60 px-5 py-4">
                <div className="text-sm font-semibold text-slate-900">
                  Settings Sections
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  Choose a section to edit store details and configuration.
                </div>
              </div>

              <nav className="space-y-1 p-3">
                {TABS.map((tab) => {
                  const isActive = tab.id === activeTab.id;
                  const Icon = tab.icon;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTab(tab.id)}
                      className={[
                        "group flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-all",
                        isActive
                          ? "border-transparent bg-gradient-to-r from-indigo-600 via-sky-500 to-violet-500 text-white shadow-md"
                          : "border-transparent bg-white text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition",
                          isActive
                            ? "bg-white/15 text-white"
                            : "bg-slate-100 text-slate-600 group-hover:bg-white",
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={[
                            "block text-sm font-semibold",
                            isActive ? "text-white" : "text-slate-900",
                          ].join(" ")}
                        >
                          {tab.label}
                        </span>
                        <span
                          className={[
                            "mt-0.5 block text-xs leading-5",
                            isActive ? "text-white/80" : "text-slate-500",
                          ].join(" ")}
                        >
                          {tab.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Right content */}
          <section className="min-w-0">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-indigo-50/50 to-sky-50/50 px-4 py-4 md:px-6 md:py-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-sky-500 to-violet-500 text-white shadow-sm">
                    <activeTab.icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900 md:text-xl">
                      {activeTab.label}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                      {activeTab.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 md:p-5">
                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                  {TAB_COMPONENTS[activeTab.id]}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-[80] md:hidden ${
          mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className={`absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-200 ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />

        <div
          className={`absolute inset-x-0 bottom-0 max-h-[84vh] overflow-hidden rounded-t-[28px] bg-white shadow-2xl transition-transform duration-200 ${
            mobileMenuOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
            <div>
              <div className="text-base font-semibold text-slate-900">
                Settings
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                Choose a section
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[calc(84vh-80px)] overflow-y-auto p-3">
            <div className="space-y-2">
              {TABS.map((tab) => {
                const isActive = tab.id === activeTab.id;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTab(tab.id)}
                    className={[
                      "flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition",
                      isActive
                        ? "border-transparent bg-gradient-to-r from-indigo-600 via-sky-500 to-violet-500 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-700",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                        isActive
                          ? "bg-white/15 text-white"
                          : "bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={[
                          "block text-sm font-semibold",
                          isActive ? "text-white" : "text-slate-900",
                        ].join(" ")}
                      >
                        {tab.shortLabel || tab.label}
                      </span>
                      <span
                        className={[
                          "mt-0.5 block text-xs leading-5",
                          isActive ? "text-white/80" : "text-slate-500",
                        ].join(" ")}
                      >
                        {tab.description}
                      </span>
                    </span>

                    {isActive ? (
                      <span className="mt-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Open
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}