// src/app/(dashboard)/sales/feedback/FeedbackFormClient.tsx
"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, Search, UploadCloud } from "lucide-react";
import Link from "next/link";
import type {
  CustomerFeedback,
  FeedbackOrderOption,
} from "@/lib/customerFeedbackApi";
import {
  formatImageBytes,
  optimizeContentImageForUpload,
} from "@/lib/clientImageOptimizer";
import type { FeedbackActionState } from "./actions";

type FeedbackFormAction = (
  previousState: FeedbackActionState,
  formData: FormData
) => Promise<FeedbackActionState>;

type Props = {
  orders: FeedbackOrderOption[];
  feedback?: CustomerFeedback | null;
  action: FeedbackFormAction;
  mode: "create" | "edit";
};

const INITIAL_ACTION_STATE: FeedbackActionState = {
  status: "idle",
  message: "",
};

export default function FeedbackFormClient({
  orders,
  feedback,
  action,
  mode,
}: Props) {
  const router = useRouter();
  const [actionState, formAction, actionPending] = useActionState(
    action,
    INITIAL_ACTION_STATE
  );

  const initialOrder =
    orders.find((order) => {
      if (!feedback) return false;
      return (
        String(order.id) === String(feedback.order_id || "") ||
        String(order.number) === String(feedback.order_number || "")
      );
    }) || null;

  const [orderQuery, setOrderQuery] = useState(
    initialOrder
      ? `#${initialOrder.number} - ${
          initialOrder.customer_name ||
          initialOrder.customer_mobile ||
          "Customer"
        }`
      : feedback?.order_number
        ? `#${feedback.order_number}`
        : ""
  );

  const [selectedOrder, setSelectedOrder] =
    useState<FeedbackOrderOption | null>(initialOrder);

  const [customerName, setCustomerName] = useState(
    feedback?.customer_name || initialOrder?.customer_name || ""
  );

  const [customerMobile, setCustomerMobile] = useState(
    feedback?.customer_mobile || initialOrder?.customer_mobile || ""
  );

  const [previewImage, setPreviewImage] = useState(
    feedback?.image_url || ""
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedFileMessage, setSelectedFileMessage] = useState("");
  const [imagePreparing, setImagePreparing] = useState(false);
  const [clientError, setClientError] = useState("");
  const previewObjectUrlRef = useRef("");

  const filteredOrders = useMemo(() => {
    const query = orderQuery.trim().toLowerCase();

    if (!query) return orders.slice(0, 8);

    return orders
      .filter((order) => {
        return (
          order.number.toLowerCase().includes(query) ||
          order.customer_name.toLowerCase().includes(query) ||
          order.customer_mobile.toLowerCase().includes(query)
        );
      })
      .slice(0, 8);
  }, [orderQuery, orders]);

  useEffect(() => {
    if (
      actionState.status !== "success" ||
      !actionState.redirectTo
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      router.replace(actionState.redirectTo || "/sales/feedback");
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [actionState, router]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  function chooseOrder(order: FeedbackOrderOption) {
    setSelectedOrder(order);
    setOrderQuery(
      `#${order.number} - ${
        order.customer_name || order.customer_mobile || "Customer"
      }`
    );

    if (order.customer_name) setCustomerName(order.customer_name);
    if (order.customer_mobile) {
      setCustomerMobile(order.customer_mobile);
    }
  }

  async function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    setClientError("");
    setImagePreparing(true);
    setSelectedImage(null);
    setSelectedFileMessage("");

    try {
      const optimization = await optimizeContentImageForUpload(file);
      const optimized = optimization.file;

      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }

      const previewUrl = URL.createObjectURL(optimized);
      previewObjectUrlRef.current = previewUrl;

      setSelectedImage(optimized);
      setPreviewImage(previewUrl);

      const message = optimization.optimized
        ? `Optimized: ${formatImageBytes(
            optimization.originalBytes
          )} → ${formatImageBytes(optimization.outputBytes)}`
        : `Selected: ${file.name} (${formatImageBytes(file.size)})`;

      setSelectedFileMessage(message);
    } catch (error: unknown) {
      input.value = "";
      setSelectedImage(null);
      setPreviewImage(feedback?.image_url || "");
      setClientError(
        error instanceof Error && error.message
          ? error.message
          : "This image could not be prepared. Please choose another image."
      );
    } finally {
      setImagePreparing(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (imagePreparing || actionPending) {
      return;
    }

    setClientError("");

    const formData = new FormData(event.currentTarget);

    // Never send the original full-resolution file from the input.
    formData.delete("image");

    if (selectedImage) {
      formData.set("image", selectedImage, selectedImage.name);
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  const status = feedback?.status === "hide" ? "hide" : "show";
  const imageInputId = "feedback-image-upload";
  const busy = imagePreparing || actionPending;
  const visibleError =
    clientError ||
    (actionState.status === "error" ? actionState.message : "");

  return (
    <main className="mx-auto max-w-5xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <Link
        href="/sales/feedback"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customer Feedback
      </Link>

      <div className="mt-4 rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#f7f8ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
              Customer Feedback
            </div>

            <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
              {mode === "create"
                ? "Add Customer Feedback"
                : "Edit Customer Feedback"}
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Add customer message, link it with an order, upload proof image,
              and control whether it should show on the website.
            </p>
          </div>
        </div>
      </div>

      <div aria-live="polite" className="mt-4">
        {actionState.status === "success" ? (
          <div
            role="status"
            className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm"
          >
            {actionState.message} Returning to the feedback list…
          </div>
        ) : null}

        {visibleError ? (
          <div
            role="alert"
            className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 shadow-sm"
          >
            {visibleError}
          </div>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        aria-busy={busy}
        className="mt-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-5"
      >
        {feedback?.id ? (
          <input type="hidden" name="id" value={feedback.id} />
        ) : null}

        <input
          type="hidden"
          name="order_id"
          value={selectedOrder?.id || feedback?.order_id || ""}
        />
        <input
          type="hidden"
          name="order_number"
          value={selectedOrder?.number || feedback?.order_number || ""}
        />

        <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-800">
                Order Number
              </label>

              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={orderQuery}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setOrderQuery(event.target.value);
                    setSelectedOrder(null);
                  }}
                  placeholder="Search order number, customer name or mobile"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
                />
              </div>

              <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-2">
                {filteredOrders.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">
                    No matching orders found. You can still save feedback
                    without order link.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredOrders.map((order) => {
                      const active =
                        selectedOrder?.id === order.id ||
                        String(feedback?.order_id || "") === String(order.id);

                      return (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => chooseOrder(order)}
                          disabled={busy}
                          className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${
                            active
                              ? "bg-indigo-600 text-white"
                              : "bg-white text-slate-700 hover:bg-indigo-50"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <div className="font-semibold">
                            Order #{order.number}
                          </div>
                          <div
                            className={
                              active ? "text-indigo-100" : "text-slate-500"
                            }
                          >
                            {order.customer_name || "Customer"} ·{" "}
                            {order.customer_mobile || "No mobile"} · ₹
                            {Number(order.total || 0).toLocaleString("en-IN")}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-800">
                  Customer Name
                </label>
                <input
                  name="customer_name"
                  value={customerName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setCustomerName(event.target.value)
                  }
                  required
                  disabled={busy}
                  placeholder="Example: Priya M."
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-800">
                  Customer Mobile Number
                </label>
                <input
                  name="customer_mobile"
                  value={customerMobile}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setCustomerMobile(event.target.value)
                  }
                  disabled={busy}
                  placeholder="Customer mobile number"
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">
                Customer Message
              </label>
              <textarea
                name="customer_message"
                required
                disabled={busy}
                defaultValue={feedback?.customer_message || ""}
                rows={6}
                placeholder="Example: Loved the fabric and fast delivery."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <label className="text-sm font-semibold text-slate-800">
                Feedback Image
              </label>

              <input
                id={imageInputId}
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                disabled={busy}
                className="sr-only"
              />

              <label
                htmlFor={imageInputId}
                className={`mt-3 flex min-h-48 flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-indigo-200 bg-white text-center transition ${
                  busy
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40"
                }`}
              >
                {previewImage ? (
                  <div className="relative h-48 w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewImage}
                      alt="Customer feedback preview"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
                      {imagePreparing
                        ? "Preparing image…"
                        : "Click to change image"}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center px-4 py-8">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      {imagePreparing ? (
                        <Loader2 className="h-7 w-7 animate-spin" />
                      ) : (
                        <ImagePlus className="h-7 w-7" />
                      )}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">
                      {imagePreparing
                        ? "Preparing your image…"
                        : "Click here to upload feedback image"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Images are automatically resized before upload.
                    </p>
                  </div>
                )}
              </label>

              <label
                htmlFor={imageInputId}
                className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 transition ${
                  busy
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:border-indigo-300 hover:bg-indigo-50"
                }`}
              >
                {imagePreparing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                {imagePreparing
                  ? "Preparing image…"
                  : previewImage
                    ? "Change Image"
                    : "Upload Image"}
              </label>

              {selectedFileMessage ? (
                <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  {selectedFileMessage}
                </p>
              ) : feedback?.image_url ? (
                <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                  Existing image is already attached. Upload a new image only
                  if you want to replace it.
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  JPG, PNG, WebP, or GIF. The final upload must be below 3 MB.
                </p>
              )}
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                Website Visibility
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="cursor-pointer rounded-2xl border border-emerald-200 bg-white p-3 text-sm font-semibold text-emerald-700">
                  <input
                    type="radio"
                    name="status"
                    value="show"
                    defaultChecked={status !== "hide"}
                    disabled={busy}
                    className="mr-2"
                  />
                  Show
                </label>

                <label className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-600">
                  <input
                    type="radio"
                    name="status"
                    value="hide"
                    defaultChecked={status === "hide"}
                    disabled={busy}
                    className="mr-2"
                  />
                  Hide
                </label>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Only “Show” feedback will appear in the storefront feedback
                section.
              </p>
            </div>

            <button
              type="submit"
              disabled={busy || actionState.status === "success"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {imagePreparing
                ? "Preparing image…"
                : actionPending
                  ? mode === "create"
                    ? "Saving feedback…"
                    : "Updating feedback…"
                  : mode === "create"
                    ? "Save Feedback"
                    : "Update Feedback"}
            </button>
          </aside>
        </div>
      </form>
    </main>
  );
}