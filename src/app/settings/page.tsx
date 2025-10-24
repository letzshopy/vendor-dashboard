// src/app/settings/page.tsx
import SettingsTabsClient from "./ui/SettingsTabsClient";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsTabsClient />
    </div>
  );
}
