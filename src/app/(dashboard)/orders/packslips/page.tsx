import {
  Printer,
} from "lucide-react";

import PackSlipsClient from "./PackSlipsClient";
import {
  PageHeader,
} from "@/components/ui/page-header";

export const dynamic =
  "force-dynamic";

export default function PackSlipsPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-[1540px] pb-28 md:pb-8">
      <div className="hidden md:block">
        <PageHeader
          eyebrow="Orders"
          icon={Printer}
          title="Packing Slips"
          description="Select orders and generate print-ready A4 packing slips for self shipping."
        />
      </div>

      <div className="md:mt-5">
        <PackSlipsClient />
      </div>
    </main>
  );
}
