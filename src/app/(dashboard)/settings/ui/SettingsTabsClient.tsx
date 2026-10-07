"use client";

import type React from "react";
import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import {
  Check,
  ChevronDown,
  CreditCard,
  IdCard,
  LayoutTemplate,
  Percent,
  Settings2,
  Truck,
  User,
} from "lucide-react";
import {
  useSearchParams,
} from "next/navigation";

import {
  BottomSheet,
} from "@/components/ui/bottom-sheet";
import type {
  SessionStoreType,
} from "@/lib/session";
import {
  isStandaloneV1SettingsTabAllowed,
} from "@/lib/storeCapabilities";

import ProfileAccountTab from "./tabs/ProfileAccountTab";
import StoreSettingsTab from "./tabs/StoreSettingsTab";
import KycTab from "./tabs/KycTab";
import PaymentsTab from "./tabs/PaymentsTab";
import SetupSiteTab from "./tabs/SetupSiteTab";
import ShippingDeliveryTab from "./tabs/ShippingDeliveryTab";

type TabId =
  | "profileAccount"
  | "storeSettings"
  | "shippingDelivery"
  | "payments"
  | "setupSite"
  | "kyc";

type TabDef = {
  id: TabId;
  label: string;
  mobileLabel?: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
};

const TABS: TabDef[] = [
  {
    id: "profileAccount",
    label: "Profile & Account",
    mobileLabel: "Profile",
    description:
      "Business profile, account details and dashboard security.",
    icon: User,
  },
  {
    id: "storeSettings",
    label: "Store Settings",
    mobileLabel: "Store",
    description:
      "Store display, product rules, stock and tax settings.",
    icon: Settings2,
  },
  {
    id: "shippingDelivery",
    label: "Shipping Delivery",
    mobileLabel: "Shipping",
    description:
      "Shipping charges, courier mode and delivery setup.",
    icon: Truck,
  },
  {
    id: "payments",
    label: "Payments",
    description:
      "PayGlocal, UPI, bank transfer and COD.",
    icon: CreditCard,
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
    id: "kyc",
    label: "KYC",
    description:
      "Business verification documents.",
    icon: IdCard,
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
      : rawTab === "profile" ||
          rawTab === "account"
        ? "profileAccount"
        : rawTab === "general" ||
            rawTab === "tax"
          ? "storeSettings"
          : rawTab === "shipping" ||
              rawTab ===
                "shipmentFulfillment"
            ? "shippingDelivery"
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
    "profileAccount"
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

  function renderActiveTab() {
    switch (activeTab.id) {
      case "profileAccount":
        return (
          <ProfileAccountTab />
        );
      case "storeSettings":
        return (
          <StoreSettingsTab
            storeType={
              storeType
            }
          />
        );
      case "shippingDelivery":
        return (
          <ShippingDeliveryTab
            storeType={
              storeType
            }
          />
        );
      case "payments":
        return (
          <PaymentsTab />
        );
      case "setupSite":
        return (
          <SetupSiteTab />
        );
      case "kyc":
        return (
          <KycTab />
        );
      default:
        return (
          <ProfileAccountTab />
        );
    }
  }

  return (
    <>
      <div className="md:hidden">
        <button
          type="button"
          onClick={() =>
            setPickerOpen(
              true
            )
          }
          className="ls-focus-ring flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 text-left shadow-[0_3px_12px_rgba(38,51,95,0.04)]"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
            <ActiveIcon className="h-4 w-4" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Settings
            </span>

            <span className="block truncate text-sm font-extrabold text-heading">
              {activeTab.label}
            </span>
          </span>

          <span className="text-[11px] font-bold text-primary">
            Change
          </span>

          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <section className="min-w-0">
        <div className="hidden border-b border-border pb-4 md:block">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
            Settings
          </div>

          <div className="mt-1 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <ActiveIcon className="h-4.5 w-4.5" />
            </span>

            <div className="min-w-0">
              <h1 className="text-[26px] font-extrabold tracking-tight text-heading">
                {
                  activeTab.label
                }
              </h1>

              <p className="mt-0.5 text-sm text-muted-foreground">
                {
                  activeTab.description
                }
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 min-w-0 md:mt-5">
          {renderActiveTab()}
        </div>
      </section>

      <BottomSheet
        open={
          pickerOpen
        }
        onOpenChange={
          setPickerOpen
        }
        title="Settings"
        description="Choose a settings section."
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
                    "ls-focus-ring flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5",
                    active
                      ? "border-primary bg-secondary"
                      : "border-transparent bg-card hover:bg-muted",
                  ].join(
                    " "
                  )}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-heading">
                      {
                        tab.mobileLabel ||
                        tab.label
                      }
                    </span>

                    <span className="mt-0.5 hidden truncate text-xs text-muted-foreground min-[380px]:block">
                      {tab.description}
                    </span>
                  </span>

                  {active ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : null}
                </Link>
              );
            }
          )}
        </div>
      </BottomSheet>
    </>
  );
}
