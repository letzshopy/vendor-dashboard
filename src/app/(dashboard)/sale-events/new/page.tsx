// src/app/(dashboard)/sale-events/new/page.tsx
import { fetchSaleEventFormOptions } from "@/lib/saleEventsApi";
import SaleEventFormClient from "../SaleEventFormClient";
import { createSaleEventAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewSaleEventPage() {
  const { categories, products } = await fetchSaleEventFormOptions();

  return (
    <SaleEventFormClient
      mode="create"
      categories={categories}
      products={products}
      action={createSaleEventAction}
    />
  );
}
