import { redirect } from "next/navigation";

export default async function LegacyEditSaleEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/offers-discounts/sale-events/${id}`);
}