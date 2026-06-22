// src/app/(dashboard)/sales/feedback/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCustomerFeedback,
  deleteCustomerFeedback,
  updateCustomerFeedback,
  uploadCustomerFeedbackImage,
  type CustomerFeedbackStatus,
} from "@/lib/customerFeedbackApi";

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function statusValue(formData: FormData): CustomerFeedbackStatus {
  return value(formData, "status") === "hide" ? "hide" : "show";
}

async function maybeUploadImage(formData: FormData) {
  const file = formData.get("image");

  if (!(file instanceof File)) return undefined;
  if (!file.name || file.size <= 0) return undefined;

  const uploaded = await uploadCustomerFeedbackImage(file);
  return uploaded.image_id || undefined;
}

export async function createFeedbackAction(formData: FormData) {
  const imageId = await maybeUploadImage(formData);

  await createCustomerFeedback({
    order_id: value(formData, "order_id"),
    order_number: value(formData, "order_number"),
    customer_name: value(formData, "customer_name"),
    customer_mobile: value(formData, "customer_mobile"),
    customer_message: value(formData, "customer_message"),
    status: statusValue(formData),
    ...(imageId ? { image_id: imageId } : {}),
  });

  revalidatePath("/sales/feedback");
  redirect("/sales/feedback");
}

export async function updateFeedbackAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) return;

  const imageId = await maybeUploadImage(formData);

  await updateCustomerFeedback(id, {
    order_id: value(formData, "order_id"),
    order_number: value(formData, "order_number"),
    customer_name: value(formData, "customer_name"),
    customer_mobile: value(formData, "customer_mobile"),
    customer_message: value(formData, "customer_message"),
    status: statusValue(formData),
    ...(imageId ? { image_id: imageId } : {}),
  });

  revalidatePath("/sales/feedback");
  revalidatePath(`/sales/feedback/${id}`);
  redirect("/sales/feedback");
}

export async function toggleFeedbackStatusAction(formData: FormData) {
  const id = value(formData, "id");
  const status = statusValue(formData);

  if (!id) return;

  await updateCustomerFeedback(id, { status });

  revalidatePath("/sales/feedback");
}

export async function deleteFeedbackAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) return;

  await deleteCustomerFeedback(id);

  revalidatePath("/sales/feedback");
  redirect("/sales/feedback");
}