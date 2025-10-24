// src/app/settings/ui/SettingsTabsClient.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import ProfileTab from "./tabs/ProfileTab";
import KycTab from "./tabs/KycTab";
import PagesTab from "./tabs/PagesTab";
import GeneralTab from "./tabs/GeneralTab";
import ShippingTab from "./tabs/ShippingTab";
import ImportExportTab from "./tabs/ImportExportTab";
import TaxTab from "./tabs/TaxTab";
import PaymentsTab from "./tabs/PaymentsTab";
import AccountTab from "./tabs/AccountTab";

type TabDef = { id: string; label: string; node: React.ReactNode };

const TABS: TabDef[] = [
  { id: "profile",       label: "Profile",         node: <ProfileTab /> },
  { id: "kyc",           label: "KYC",             node: <KycTab /> },
  { id: "pages",         label: "Pages",           node: <PagesTab /> },
  { id: "general",       label: "General",         node: <GeneralTab /> },
  { id: "shipping",      label: "Shipping",        node: <ShippingTab /> },
  { id: "import-export", label: "Import / Export", node: <ImportExportTab /> },
  { id: "tax",           label: "Tax",             node: <TaxTab /> },
  { id: "payments",      label: "Payments",        node: <PaymentsTab /> },
  { id: "account",       label: "Account",         node: <AccountTab /> },
];

export default function SettingsTabsClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeId = sp.get("tab") || "profile";

  const { activeTab, tabs } = useMemo(() => {
    const found = TABS.find((t) => t.id === activeId) ?? TABS[0];
    return { activeTab: found, tabs: TABS };
  }, [activeId]);

  function setTab(id: string) {
    const q = new URLSearchParams(sp.toString());
    q.set("tab", id);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const isActive = t.id === activeTab.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActive ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        id={`panel-${activeTab.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab.id}`}
        className="bg-white rounded border p-4"
      >
        {activeTab.node}
      </div>
    </div>
  );
}
