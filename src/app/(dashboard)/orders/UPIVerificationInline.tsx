// src/app/orders/UPIVerificationInline.tsx
"use client";

import { useState } from "react";
import type { WCOrder } from "@/lib/order-utils";

type Props = {
  order: WCOrder & {
    meta_data?: any[];
    payment_method?: string; // <-- add this so TS knows it exists
  };
};

function getMeta(order: any, key: string): any | undefined {
  const meta = (order.meta_data || []) as any[];
  const item = meta.find((m) => m.key === key);
  return item?.value;
}

export function UPIVerificationInline({ order }: Props) {
  const isUPI = order.payment_method === "letz_upi";
  if (!isUPI) return null;

  const isOnHold = order.status === "on-hold";
  const txn = getMeta(order, "_letz_upi_txn");
  const screenshotUrl = getMeta(order, "_letz_upi_screenshot_url");
  const screenshotId = getMeta(order, "_letz_upi_screenshot_id");

  const [loading, setLoading] = useState(false);
  const [showShot, setShowShot] = useState(false);

  const handleVerify = async () => {
    if (!isOnHold) return;

    const ok = window.confirm(
      "Mark this UPI payment as verified and move the order to Processing?"
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch("/api/orders/verify-upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "Failed to verify payment.");
        return;
      }
      alert("Payment verified. Order moved to Processing.");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Something went wrong while verifying payment.");
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = isOnHold ? (
    <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-medium">
      Pending verify
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-medium">
      Verified ({order.status})
    </span>
  );

  return (
    <>
      <div className="mt-1 w-full">
        <div className="rounded-2xl border border-slate-200 bg-indigo-50/60 px-3 py-2 text-xs text-slate-800 flex gap-2 items-start">
          {/* Left icon */}
          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs shrink-0">
            ₹
          </div>

          {/* Main content */}
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-slate-900">
                UPI Payment
              </div>
              {statusBadge}
            </div>

            {txn && (
              <div className="text-[11px] leading-snug">
                <span className="font-medium">Txn:&nbsp;</span>
                <span className="break-all">{txn}</span>
              </div>
            )}

            {/* Screenshot row */}
            {screenshotUrl ? (
              <button
                type="button"
                className="text-[11px] text-indigo-700 underline"
                onClick={() => setShowShot(true)}
              >
                View payment screenshot
              </button>
            ) : screenshotId ? (
              <div className="text-[11px] text-amber-700">
                Screenshot uploaded (open order in Woo admin to view).
              </div>
            ) : (
              <div className="text-[11px] text-red-600">
                Screenshot not uploaded yet (keep order On hold).
              </div>
            )}

            {/* Footer text + verify button */}
            {!isOnHold && (
              <div className="text-[11px] text-emerald-700">
                Payment already verified ({order.status}).
              </div>
            )}

            {isOnHold && (
              <button
                type="button"
                onClick={handleVerify}
                disabled={loading}
                className="mt-1 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify & Confirm Payment"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Screenshot popup (mini modal on same tab) */}
      {showShot && screenshotUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowShot(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-[90vw] max-h-[90vh] p-2 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs font-semibold text-slate-700">
                Payment Screenshot
              </div>
              <button
                className="h-7 w-7 rounded-full hover:bg-slate-100 text-sm"
                onClick={() => setShowShot(false)}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotUrl}
                alt="UPI payment screenshot"
                className="max-h-[80vh] max-w-[80vw] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
