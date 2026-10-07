import {
  Clapperboard,
} from "lucide-react";

import ShoppableVideosClient from "@/components/ShoppableVideosClient";
import {
  PageHeader,
} from "@/components/ui/page-header";

export const dynamic =
  "force-dynamic";

export default function ShoppableVideosPage() {
  return (
    <main className="ls-page mx-auto max-w-[1440px] pb-28 md:pb-8">
      <div className="hidden md:block">
        <PageHeader
          eyebrow="Catalog"
          icon={Clapperboard}
          title="Shoppable Videos"
          description="Publish short videos and connect shoppers directly to products."
        />
      </div>

      <div className="md:mt-5">
        <ShoppableVideosClient />
      </div>
    </main>
  );
}
