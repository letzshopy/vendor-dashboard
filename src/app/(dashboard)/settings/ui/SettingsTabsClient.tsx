"use client";

import type React from "react";
import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import {
  Building2,
  ChevronDown,
  CreditCard,
  IdCard,
  LayoutTemplate,
  PackageSearch,
  Percent,
  Settings2,
  Truck,
  User,
} from "lucide-react";
import {
  useSearchParams,
} from "next/navigation";

import type {
  SessionStoreType,
} from "@/lib/session";
import {
  isStandaloneV1SettingsTabAllowed,
} from "@/lib/storeCapabilities";
import {
  BottomSheet,
} from "@/components/ui/bottom-sheet";

import AccountTab from "./tabs/AccountTab";
import GeneralTab from "./tabs/GeneralTab";
import KycTab from "./tabs/KycTab";
import PaymentsTab from "./tabs/PaymentsTab";
import ProfileTab from "./tabs/ProfileTab";
import SetupSiteTab from "./tabs/SetupSiteTab";
import ShipmentFulfillmentTab from "./tabs/ShipmentFulfillmentTab";
import ShippingTab from "./tabs/ShippingTab";
import TaxTab from "./tabs/TaxTab";

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
  mobileLabel?: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
};

const TAB_COMPONENTS:
  Record<
    TabId,
    React.ReactNode
  > = {
  profile: <ProfileTab />,
  kyc: <KycTab />,
  setupSite: <SetupSiteTab />,
  general: <GeneralTab />,
  shipping: <ShippingTab />,
  tax: <TaxTab />,
  payments: <PaymentsTab />,
  account: <AccountTab />,
  shipmentFulfillment:
    <ShipmentFulfillmentTab />,
};

const TABS: TabDef[] = [
  {
    id: "profile",
    label: "Profile",
    description:
      "Business identity, contact details and social links.",
    icon: User,
  },
  {
    id: "kyc",
    label: "KYC",
    description:
      "Business verification documents.",
    icon: IdCard,
  },
  {
    id: "setupSite",
    label: "Website Setup",
    mobileLabel: "Website",
    description:
      "Branding, banners, pages and policies.",
    icon: LayoutTemplate,
  },
  {
    id: "general",
    label: "Store Settings",
    mobileLabel: "Store",
    description:
      "Currency, measurements, reviews and stock rules.",
    icon: Settings2,
  },
  {
    id: "shipping",
    label: "Shipping Charges",
    mobileLabel: "Shipping",
    description:
      "Shipping zones, methods and charges.",
    icon: Truck,
  },
  {
    id: "shipmentFulfillment",
    label: "Shipment Fulfillment",
    mobileLabel: "Fulfillment",
    description:
      "Courier and tracking workflow.",
    icon: PackageSearch,
  },
  {
    id: "tax",
    label: "Tax",
    description:
      "GST and tax display settings.",
    icon: Percent,
  },
  {
    id: "payments",
    label: "Payments",
    description:
      "PayGlocal, UPI, bank transfer and COD.",
    icon: CreditCard,
  },
  {
    id: "account",
    label: "Account",
    description:
      "Plan, login and account details.",
    icon: Building2,
  },
];

function normalizeTab(
  rawTab: string | null,
  availableTabs:
    TabDef[]
): TabId {
  const normalizedRaw =
    rawTab === "pages"
      ? "setupSite"
      : rawTab;

  const matched =
    availableTabs.find(
      (tab) =>
        tab.id ===
        normalizedRaw
    );

  return (
    matched?.id ||
    availableTabs[0]
      ?.id ||
    "tax"
  );
}

export default function SettingsTabsClient({
  storeType = "multisite",
}: {
  storeType?: SessionStoreType;
}) {
  const sp =
    useSearchParams();

  const [
    pickerOpen,
    setPickerOpen,
  ] =
    useState(false);

  const visibleTabs =
    useMemo(
      () =>
        TABS.filter(
          (tab) =>
            isStandaloneV1SettingsTabAllowed(
              storeType,
              tab.id
            )
        ),
      [storeType]
    );

  const activeId =
    normalizeTab(
      sp.get("tab"),
      visibleTabs
    );

  const activeTab =
    useMemo(
      () =>
        visibleTabs.find(
          (tab) =>
            tab.id ===
            activeId
        ) ||
        visibleTabs[0] ||
        TABS[0],
      [
        activeId,
        visibleTabs,
      ]
    );

  const ActiveIcon =
    activeTab.icon;

  return (
    <>
      <div className="hidden md:block">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
          Store Settings
        </div>

        <h1 className="mt-1 text-[30px] font-extrabold tracking-tight text-heading">
          Settings
        </h1>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          Manage your store, payments, shipping and account.
        </p>
      </div>

      <div className="mt-0 md:mt-5">
        <div className="md:hidden">
          <button
            type="button"
            onClick={() =>
              setPickerOpen(
                true
              )
            }
            className="ls-focus-ring flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 text-left shadow-[0_4px_14px_rgba(38,51,95,0.04)]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <ActiveIcon className="h-4.5 w-4.5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold text-heading">
                {
                  activeTab.mobileLabel ||
                  activeTab.label
                }
              </span>

              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {
                  activeTab.description
                }
              </span>
            </span>

            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden md:block">
            <nav className="sticky top-[92px] overflow-hidden rounded-2xl border border-border bg-card p-2">
              {visibleTabs.map(
                (
                  tab
                ) => {
                  const active =
                    tab.id ===
                    activeId;

                  const Icon =
                    tab.icon;

                  return (
                    <Link
                      key={
                        tab.id
                      }
                      href={
                        `/settings?tab=${tab.id}`
                      }
                      className={[
                        "ls-focus-ring flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 transition",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted",
                      ].join(
                        " "
                      )}
                    >
                      <span
                        className={[
                          "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                          active
                            ? "bg-white/12 text-white"
                            : "bg-secondary text-secondary-foreground",
                        ].join(
                          " "
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {
                            tab.label
                          }
                        </span>
                      </span>
                    </Link>
                  );
                }
              )}
            </nav>
          </aside>

          <section className="min-w-0">
            <div className="hidden items-start gap-3 border-b border-border pb-3 md:flex">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <ActiveIcon className="h-4.5 w-4.5" />
              </span>

              <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-heading">
                  {
                    activeTab.label
                  }
                </h2>

                <p className="mt-0.5 text-sm text-muted-foreground">
                  {
                    activeTab.description
                  }
                </p>
              </div>
            </div>

            <div className="mt-3 min-w-0 md:mt-4">
              {
                TAB_COMPONENTS[
                  activeTab.id
                ]
              }
            </div>
          </section>
        </div>
      </div>

      <BottomSheet
        open={
          pickerOpen
        }
        onOpenChange={
          setPickerOpen
        }
        title="Settings"
        description="Choose what you want to manage."
        popupClassName="md:mx-auto md:max-w-xl"
      >
        <div className="space-y-1">
          {visibleTabs.map(
            (
              tab
            ) => {
              const active =
                tab.id ===
                activeId;

              const Icon =
                tab.icon;

              return (
                <Link
                  key={
                    tab.id
                  }
                  href={
                    `/settings?tab=${tab.id}`
                  }
                  onClick={() =>
                    setPickerOpen(
                      false
                    )
                  }
                  className={[
                    "ls-focus-ring flex min-h-13 items-center gap-3 rounded-xl border px-3 py-2.5",
                    active
                      ? "border-primary bg-secondary"
                      : "border-transparent bg-card hover:bg-muted",
                  ].join(
                    " "
                  )}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-heading">
                      {
                        tab.mobileLabel ||
                        tab.label
                      }
                    </span>

                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {
                        tab.description
                      }
                    </span>
                  </span>
                </Link>
              );
            }
          )}
        </div>
      </BottomSheet>
    </>
  );
}
