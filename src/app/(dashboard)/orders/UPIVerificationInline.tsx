"use client";

import { useState } from "react";
import type { WCOrder } from "@/lib/order-utils";
import { CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";

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
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
      Pending verify
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
      Verified ({order.status})
    </span>
  );

  return (
    <>
      <div className="rounded-[18px] border border-slate-200 bg-indigo-50/60 p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                UPI Payment
              </div>
              {statusBadge}
            </div>

            {txn && (
              <div className="mt-1 text-[11px] leading-snug text-slate-700">
                <span className="font-semibold">Txn:</span>{" "}
                <span className="break-all">{txn}</span>
              </div>
            )}

            <div className="mt-2 space-y-1">
              {requiresScreenshot ? (
                screenshotUrl ? (
                  <button
                    type="button"
                    className="text-[11px] font-medium text-indigo-700 underline"
                    onClick={() => setShowShot(true)}
                  >
                    View payment screenshot
                  </button>
                ) : screenshotId ? (
                  <div className="text-[11px] text-amber-700">
                    Screenshot uploaded. Open order in Woo admin to view.
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-700">
                    Screenshot not uploaded yet.
                  </div>
                )
              ) : (
                <div className="text-[11px] text-slate-600">
                  Screenshot proof disabled for this order.
                </div>
              )}

              {!isOnHold && (
                <div className="text-[11px] text-emerald-700">
                  Payment already verified.
                </div>
              )}
            </div>

            {isOnHold && (
              <button
                type="button"
                onClick={handleVerify}
                disabled={loading}
                className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verify Payment
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {showShot && screenshotUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowShot(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-[24px] bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">
                Payment Screenshot
              </div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
                onClick={() => setShowShot(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto rounded-[18px] bg-slate-50 p-2">
              <img
                src={screenshotUrl}
                alt="UPI payment screenshot"
                className="max-h-[80vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}