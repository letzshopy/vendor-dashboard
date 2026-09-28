import {
  Trash2,
} from "lucide-react";

import TrashHubClient from "./TrashHubClient";
import {
  PageHeader,
} from "@/components/ui/page-header";

export const dynamic =
  "force-dynamic";

export default function TrashPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-[1540px] pb-28 md:pb-8">
      <div className="hidden md:block">
        <PageHeader
          eyebrow="Store tools"
          icon={Trash2}
          title="Trash Bin"
          description="Restore deleted products and orders, or remove them permanently."
        />
      </div>

      <div className="md:mt-5">
        <TrashHubClient />
      </div>
    </main>
  );
}
