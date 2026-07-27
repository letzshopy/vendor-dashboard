import CouponsTab from "../../settings/ui/tabs/CouponsTab";

export const metadata = { title: "Coupon Codes" };
export const dynamic = "force-dynamic";

export default function CouponCodesPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-3 pb-28 pt-4 md:px-4 md:pb-8 md:pt-5">
      <CouponsTab />
    </main>
  );
}
