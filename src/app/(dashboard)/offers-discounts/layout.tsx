import OffersDiscountsNav from "./OffersDiscountsNav";

export default function OffersDiscountsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="mx-auto w-full min-w-0 max-w-[1440px] px-3 pt-3 md:px-4 md:pt-5">
        <OffersDiscountsNav />
      </div>
      {children}
    </>
  );
}
