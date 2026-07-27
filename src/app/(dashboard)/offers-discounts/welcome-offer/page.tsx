import { Gift } from "lucide-react";

import WelcomeOfferClient from "./WelcomeOfferClient";

export const metadata = { title: "Welcome Offer" };
export const dynamic = "force-dynamic";

export default function WelcomeOfferPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#faf6ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
          <Gift className="h-3.5 w-3.5" />
          Sales · Offers & Discounts
        </div>

        <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
          Welcome Offer
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Reward every newly registered customer with one personal first-order discount, delivered by email and applied automatically after sign-in.
        </p>
      </div>

      <div className="mt-5">
        <WelcomeOfferClient />
      </div>
    </main>
  );
}
