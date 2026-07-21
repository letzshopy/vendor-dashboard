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

const MAX_FEEDBACK_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_FEEDBACK_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type FeedbackActionState = {
  status: "idle" | "success" | "error";
  message: string;
  redirectTo?: string;
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function statusValue(formData: FormData): CustomerFeedbackStatus {
  return value(formData, "status") === "hide" ? "hide" : "show";
}

function failure(message: string): FeedbackActionState {
  return {
    status: "error",
    message,
  };
}

function safeErrorMessage(error: unknown, fallback: string): string {
  const raw =
    error instanceof Error && error.message
      ? error.message.trim()
      : fallback;

  if (/413|payload.+large|too large/i.test(raw)) {
    return "This image is too large. Please choose a smaller image.";
  }

  if (/failed to upload feedback image/i.test(raw)) {
    return raw.slice(0, 400);
  }

  return raw ? raw.slice(0, 400) : fallback;
}

async function maybeUploadImage(
  formData: FormData
): Promise<{ imageId?: number; error?: string }> {
  const file = formData.get("image");

  if (!(file instanceof File)) return {};
  if (!file.name || file.size <= 0) return {};

  if (file.size > MAX_FEEDBACK_IMAGE_BYTES) {
    return {
      error: "This image is too large. Please choose a smaller image.",
    };
  }

  if (
    file.type &&
    !ALLOWED_FEEDBACK_IMAGE_TYPES.has(file.type.toLowerCase())
  ) {
    return {
      error: "Please upload a JPG, PNG, WebP, or GIF image.",
    };
  }

  try {
    const uploaded = await uploadCustomerFeedbackImage(file);
    const imageId = Number(uploaded.image_id || 0);

    if (imageId <= 0) {
      return {
        error: "The image upload did not complete. Please try again.",
      };
    }

    return { imageId };
  } catch (error: unknown) {
    console.error("Customer feedback image upload failed", error);

    return {
      error: safeErrorMessage(
        error,
        "Image upload failed. Please try again with a smaller image."
      ),
    };
  }
}

function validateFeedbackFields(formData: FormData): string | null {
  if (!value(formData, "customer_name")) {
    return "Customer name is required.";
  }

  if (!value(formData, "customer_message")) {
    return "Customer message is required.";
  }

  return null;
}

export async function createFeedbackAction(
  _previousState: FeedbackActionState,
  formData: FormData
): Promise<FeedbackActionState> {
  const validationError = validateFeedbackFields(formData);

  if (validationError) {
    return failure(validationError);
  }

  const image = await maybeUploadImage(formData);

  if (image.error) {
    return failure(image.error);
  }

  try {
    await createCustomerFeedback({
      order_id: value(formData, "order_id"),
      order_number: value(formData, "order_number"),
      customer_name: value(formData, "customer_name"),
      customer_mobile: value(formData, "customer_mobile"),
      customer_message: value(formData, "customer_message"),
      status: statusValue(formData),
      ...(image.imageId ? { image_id: image.imageId } : {}),
    });
  } catch (error: unknown) {
    console.error("Customer feedback creation failed", error);

    return failure(
      safeErrorMessage(
        error,
        "Unable to save customer feedback. Please try again."
      )
    );
  }

  revalidatePath("/sales/feedback");

  return {
    status: "success",
    message: "Customer feedback added successfully.",
    redirectTo: "/sales/feedback",
  };
}

export async function updateFeedbackAction(
  _previousState: FeedbackActionState,
  formData: FormData
): Promise<FeedbackActionState> {
  const id = value(formData, "id");

  if (!id) {
    return failure("Feedback ID is missing. Please reload and try again.");
  }

  const validationError = validateFeedbackFields(formData);

  if (validationError) {
    return failure(validationError);
  }

  const image = await maybeUploadImage(formData);

  if (image.error) {
    return failure(image.error);
  }

  try {
    await updateCustomerFeedback(id, {
      order_id: value(formData, "order_id"),
      order_number: value(formData, "order_number"),
      customer_name: value(formData, "customer_name"),
      customer_mobile: value(formData, "customer_mobile"),
      customer_message: value(formData, "customer_message"),
      status: statusValue(formData),
      ...(image.imageId ? { image_id: image.imageId } : {}),
    });
  } catch (error: unknown) {
    console.error("Customer feedback update failed", error);

    return failure(
      safeErrorMessage(
        error,
        "Unable to update customer feedback. Please try again."
      )
    );
  }

  revalidatePath("/sales/feedback");
  revalidatePath(`/sales/feedback/${id}`);

  return {
    status: "success",
    message: "Customer feedback updated successfully.",
    redirectTo: "/sales/feedback",
  };
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