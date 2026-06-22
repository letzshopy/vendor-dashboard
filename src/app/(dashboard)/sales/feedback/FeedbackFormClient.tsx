// src/app/(dashboard)/sales/feedback/FeedbackFormClient.tsx
"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ImagePlus, Search } from "lucide-react";
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
      ? `#${initialOrder.number} - ${initialOrder.customer_name || initialOrder.customer_mobile || "Customer"}`
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
      `#${order.number} - ${order.customer_name || order.customer_mobile || "Customer"}`
    );

    if (order.customer_name) setCustomerName(order.customer_name);
    if (order.customer_mobile) setCustomerMobile(order.customer_mobile);
  }

  const status = feedback?.status === "hide" ? "hide" : "show";

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
              {mode === "create" ? "Add Customer Feedback" : "Edit Customer Feedback"}
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
                    No matching orders found. You can still save feedback without order link.
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
                          <div className="font-semibold">Order #{order.number}</div>
                          <div className={active ? "text-indigo-100" : "text-slate-500"}>
                            {order.customer_name || "Customer"} ·{" "}
                            {order.customer_mobile || "No mobile"} ·{" "}
                            ₹{Number(order.total || 0).toLocaleString("en-IN")}
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

              {feedback?.image_url ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={feedback.image_url}
                    alt="Customer feedback"
                    className="h-44 w-full object-cover"
                  />
                </div>
              ) : (
                <div className="mt-3 flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-400">
                  <ImagePlus className="h-8 w-8" />
                </div>
              )}

              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
              />

              <p className="mt-2 text-xs text-slate-500">
                Upload customer wearing image, WhatsApp screenshot, unboxing
                photo, or proof image.
              </p>
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