// src/app/(dashboard)/sales/feedback/FeedbackFormClient.tsx
"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ImagePlus, Search, UploadCloud } from "lucide-react";
import Link from "next/link";
import type {
  CustomerFeedback,
  FeedbackOrderOption,
} from "@/lib/customerFeedbackApi";

type Props = {
  orders: FeedbackOrderOption[];
  feedback?: CustomerFeedback | null;
  action: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
};

export default function FeedbackFormClient({
  orders,
  feedback,
  action,
  mode,
}: Props) {
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

  const [selectedOrder, setSelectedOrder] = useState<FeedbackOrderOption | null>(
    initialOrder
  );

  const [customerName, setCustomerName] = useState(
    feedback?.customer_name || initialOrder?.customer_name || ""
  );

  const [customerMobile, setCustomerMobile] = useState(
    feedback?.customer_mobile || initialOrder?.customer_mobile || ""
  );

  const [previewImage, setPreviewImage] = useState(feedback?.image_url || "");
  const [selectedFileName, setSelectedFileName] = useState("");

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();

    if (!q) return orders.slice(0, 8);

    return orders
      .filter((order) => {
        return (
          order.number.toLowerCase().includes(q) ||
          order.customer_name.toLowerCase().includes(q) ||
          order.customer_mobile.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [orderQuery, orders]);

  function chooseOrder(order: FeedbackOrderOption) {
    setSelectedOrder(order);
    setOrderQuery(
      `#${order.number} - ${
        order.customer_name || order.customer_mobile || "Customer"
      }`
    );

    if (order.customer_name) setCustomerName(order.customer_name);
    if (order.customer_mobile) setCustomerMobile(order.customer_mobile);
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedFileName(file.name);
    setPreviewImage(URL.createObjectURL(file));
  }

  const status = feedback?.status === "hide" ? "hide" : "show";
  const imageInputId = "feedback-image-upload";

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

      <form
        action={action}
        encType="multipart/form-data"
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
                  onChange={(e) => {
                    setOrderQuery(e.target.value);
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
                          className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${
                            active
                              ? "bg-indigo-600 text-white"
                              : "bg-white text-slate-700 hover:bg-indigo-50"
                          }`}
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
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  placeholder="Example: Priya M."
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-800">
                  Customer Mobile Number
                </label>
                <input
                  name="customer_mobile"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="Customer mobile number"
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
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
                defaultValue={feedback?.customer_message || ""}
                rows={6}
                placeholder="Example: Loved the fabric and fast delivery."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
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
                className="sr-only"
              />

              <label
                htmlFor={imageInputId}
                className="mt-3 flex min-h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-indigo-200 bg-white text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
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
                      Click to change image
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center px-4 py-8">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <ImagePlus className="h-7 w-7" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">
                      Click here to upload feedback image
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Customer wearing image, WhatsApp screenshot, unboxing
                      photo, or proof image
                    </p>
                  </div>
                )}
              </label>

              <label
                htmlFor={imageInputId}
                className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <UploadCloud className="h-4 w-4" />
                {previewImage ? "Change Image" : "Upload Image"}
              </label>

              {selectedFileName ? (
                <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  Selected: {selectedFileName}
                </p>
              ) : feedback?.image_url ? (
                <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                  Existing image is already attached. Upload a new image only
                  if you want to replace it.
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Image is optional, but feedback with image looks stronger on
                  the storefront.
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
              className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              {mode === "create" ? "Save Feedback" : "Update Feedback"}
            </button>
          </aside>
        </div>
      </form>
    </main>
  );
}