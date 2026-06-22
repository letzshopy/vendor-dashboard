// src/app/(dashboard)/sales/feedback/new/page.tsx
import { fetchFeedbackOrderOptions } from "@/lib/customerFeedbackApi";
import FeedbackFormClient from "../FeedbackFormClient";
import { createFeedbackAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewCustomerFeedbackPage() {
  const orders = await fetchFeedbackOrderOptions();

  return (
    <FeedbackFormClient
      mode="create"
      orders={orders}
      action={createFeedbackAction}
    />
  );
}