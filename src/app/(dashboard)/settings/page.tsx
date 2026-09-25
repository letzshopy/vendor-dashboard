import { isStandaloneV1SettingsTabAllowed } from "@/lib/storeCapabilities";
import { getTenantFromCookies } from "@/lib/tenant";
import { redirect } from "next/navigation";

import SettingsTabsClient from "./ui/SettingsTabsClient";

export const metadata = {
  title: "Settings",
};

type SettingsPageProps = {
  searchParams: Promise<{
    tab?:
      | string
      | string[];
  }>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const params =
    await searchParams;

  const tab =
    Array.isArray(
      params.tab
    )
      ? params.tab[0]
      : params.tab;

  if (!tab) {
    redirect(
      "/settings?tab=profile"
    );
  }

  const tenant =
    await getTenantFromCookies();

  const storeType =
    tenant?.store_type ||
    "multisite";

  if (
    storeType ===
      "standalone" &&
    tab &&
    !isStandaloneV1SettingsTabAllowed(
      storeType,
      tab
    )
  ) {
    redirect(
      "/settings?tab=tax"
    );
  }

  if (
    tab === "coupons"
  ) {
    redirect(
      "/offers-discounts/coupons"
    );
  }

  return (
    <main className="ls-page mx-auto max-w-[1440px] px-3 pb-28 pt-4 md:px-4 md:pb-8 md:pt-5">
      <SettingsTabsClient
        storeType={
          storeType
        }
      />
    </main>
  );
}
