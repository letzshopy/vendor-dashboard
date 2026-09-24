import { Gift } from "lucide-react";

import {
  PageHeader,
} from "@/components/ui/page-header";
import WelcomeOfferClient from "./WelcomeOfferClient";

export const metadata = {
  title: "Welcome Offer",
};

export const dynamic =
  "force-dynamic";

export default function WelcomeOfferPage() {
  return (
    <main className="ls-page mx-auto max-w-[1440px] px-3 pb-28 pt-4 md:px-4 md:pb-8 md:pt-5">
      <div className="hidden md:block">
        <PageHeader
          eyebrow="Offers & Discounts"
          icon={Gift}
          title="Welcome Offer"
          description="Reward newly registered customers with a first-order benefit."
        />
      </div>

      <div className="md:mt-5">
        <WelcomeOfferClient />
      </div>
    </main>
  );
}
