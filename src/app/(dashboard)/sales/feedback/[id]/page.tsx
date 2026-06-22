// src/app/(dashboard)/sales/feedback/[id]/page.tsx
import { notFound } from "next/navigation";
import {
  fetchCustomerFeedback,
  fetchFeedbackOrderOptions,
} from "@/lib/customerFeedbackApi";
import FeedbackFormClient from "../FeedbackFormClient";
import { updateFeedbackAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditCustomerFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [feedback, orders] = await Promise.all([
    fetchCustomerFeedback(id),
    fetchFeedbackOrderOptions(),
  ]);

  if (!feedback) {
    notFound();
  }

  return (
    <FeedbackFormClient
      mode="edit"
      feedback={feedback}
      orders={orders}
      action={updateFeedbackAction}
    />
  );
}