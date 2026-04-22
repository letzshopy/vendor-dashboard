"use client";

import { useState } from "react";
import type { WCOrder } from "@/lib/order-utils";

type Props = {
  order: WCOrder & {
    meta_data?: any[];
    payment_method?: string;
  };
};

function getMeta(order: any, key: string): any | undefined {
  const meta = (order.meta_data || []) as any[];
  const item = meta.find((m) => m.key === key);
  return item?.value;
}

function isTruthyMeta(value: any): boolean {
  return value === true || value === 1 || value === "1" || value === "yes" || value === "on";
}

export function UPIVerificationInline({ order }: Props) {
  const isUPI = order.payment_method === "letz_upi";
  if (!isUPI) return null;

  const isOnHold = order.status === "on-hold";
  const txn = getMeta(order, "_letz_upi_txn");
  const screenshotUrl = getMeta(order, "_letz_upi_screenshot_url");
  const screenshotId = getMeta(order, "_letz_upi_screenshot_id");
  const requireScreenshotMeta = getMeta(order, "_letz_upi_require_screenshot");
  const requiresScreenshot =
    requireScreenshotMeta === undefined
      ? true
      : isTruthyMeta(requireScreenshotMeta);

  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
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
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
      Pending verify
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
      Verified
    </span>
  );

  return (
    <>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {statusBadge}

        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="text-[11px] font-medium text-indigo-700 underline underline-offset-2"
        >
          {isOnHold ? "Verify payment" : "View UPI details"}
        </button>
      </div>

      {showDetails && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl md:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    UPI Payment
                  </div>
                  <div className="mt-1">{statusBadge}</div>
                </div>

                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-700 hover:bg-slate-200"
                  onClick={() => setShowDetails(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-3 px-4 py-4 text-sm text-slate-700">
              {txn ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Transaction number
                  </div>
                  <div className="mt-1 break-all rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                    {txn}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Transaction number not available.
                </div>
              )}

              {requiresScreenshot ? (
                screenshotUrl ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowShot(true)}
                  >
                    View payment screenshot
                  </button>
                ) : screenshotId ? (
                  <div className="text-sm text-amber-700">
                    Screenshot uploaded. Open order in Woo admin to view.
                  </div>
                ) : (
                  <div className="text-sm text-amber-700">
                    Screenshot not uploaded yet.
                  </div>
                )
              ) : (
                <div className="text-sm text-slate-600">
                  Screenshot proof disabled for this order.
                </div>
              )}

              {!isOnHold && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Payment already verified ({order.status}).
                </div>
              )}

              {isOnHold && (
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify & Confirm Payment"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showShot && screenshotUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
          onClick={() => setShowShot(false)}
        >
          <div
            className="flex max-h-[90vh] max-w-[90vw] flex-col rounded-2xl bg-white p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700">
                Payment Screenshot
              </div>
              <button
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-slate-100"
                onClick={() => setShowShot(false)}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto">
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