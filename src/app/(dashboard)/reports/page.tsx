import {
  BarChart3,
} from "lucide-react";

import {
  PageHeader,
} from "@/components/ui/page-header";

import ReportsTabsClient from "./ui/ReportsTabsClient";

export default function ReportsPage() {
  return (
    <main className="dashboard-mobile-page dashboard-reports-page mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
      <PageHeader
        className="hidden md:flex"
        eyebrow="Reports & Billing"
        icon={BarChart3}
        title="Reports"
        description="Track sales, customers, stock and website performance."
      />

      <div className="md:mt-5">
        <ReportsTabsClient />
      </div>
    </main>
  );
}
