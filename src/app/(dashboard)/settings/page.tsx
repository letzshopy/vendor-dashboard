import { isStandaloneV1SettingsTabAllowed } from "@/lib/storeCapabilities";
import { getTenantFromCookies } from "@/lib/tenant";
// src/app/(dashboard)/settings/page.tsx

import { redirect } from "next/navigation";
import SettingsTabsClient from "./ui/SettingsTabsClient";

export const metadata = { title: "Settings" };

type SettingsPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const params = await searchParams;
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tenant = await getTenantFromCookies();
  const storeType = tenant?.store_type || "multisite";

  if (
    storeType === "standalone" &&
    tab &&
    !isStandaloneV1SettingsTabAllowed(storeType, tab)
  ) {
    redirect("/settings?tab=tax");
  }

  if (tab === "coupons") {
    redirect("/offers-discounts/coupons");
  }

  return (
    <div className="space-y-4 p-6">
      <SettingsTabsClient storeType={storeType} />
    </div>
  );
}
