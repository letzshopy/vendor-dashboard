// src/app/(dashboard)/sale-events/[id]/page.tsx
import { notFound } from "next/navigation";
import {
  fetchSaleEvent,
  fetchSaleEventFormOptions,
} from "@/lib/saleEventsApi";
import SaleEventFormClient from "../SaleEventFormClient";
import { updateSaleEventAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditSaleEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, options] = await Promise.all([
    fetchSaleEvent(id),
    fetchSaleEventFormOptions(),
  ]);

  if (!event) notFound();

  return (
    <SaleEventFormClient
      mode="edit"
      event={event}
      categories={options.categories}
      products={options.products}
      action={updateSaleEventAction}
    />
  );
}
