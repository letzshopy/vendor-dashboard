import {
  Images,
} from "lucide-react";

import MediaClient from "@/components/MediaClient";
import {
  PageHeader,
} from "@/components/ui/page-header";

export const dynamic =
  "force-dynamic";

export default function MediaPage() {
  return (
    <main className="ls-page mx-auto max-w-[1440px] pb-28 md:pb-8">
      <div className="hidden md:block">
        <PageHeader
          eyebrow="Catalog"
          icon={Images}
          title="Media"
          description="Upload and manage reusable store media."
        />
      </div>

      <div className="md:mt-5">
        <MediaClient
          defaultView="grid"
        />
      </div>
    </main>
  );
}
