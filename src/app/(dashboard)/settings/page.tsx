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

  if (tab === "coupons") {
    redirect("/offers-discounts/coupons");
  }

  return (
    <div className="space-y-4 p-6">
      <SettingsTabsClient />
    </div>
  );
}
