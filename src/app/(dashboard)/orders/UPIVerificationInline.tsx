"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import type { WCOrder } from "@/lib/order-utils";

type MetaEntry = {
  key?: string;
  value?: unknown;
};

type UpiOrder = WCOrder & {
  meta_data?: MetaEntry[];
  payment_method?: string;
};

type Props = {
  order: UpiOrder;
};

function getMeta(order: UpiOrder, key: string): unknown {
  const meta = Array.isArray(order.meta_data)
    ? order.meta_data
    : [];
  return meta.find((entry) => entry?.key === key)?.value;
}

function isTruthyMeta(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "yes" ||
    value === "on"
  );
}

function displayMeta(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

export function UPIVerificationInline({ order }: Props) {
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const isUpi = order.payment_method === "letz_upi";
  const isOnHold = order.status === "on-hold";
  const isVerified = ["processing", "completed"].includes(
    String(order.status || "").toLowerCase()
  );
  const transactionId = displayMeta(
    getMeta(order, "_letz_upi_txn")
  );
  const screenshotId = getMeta(
    order,
    "_letz_upi_screenshot_id"
  );
  const proofKey = displayMeta(
    getMeta(order, "_letz_upi_proof_key")
  );
  const legacyProofUrl = displayMeta(
    getMeta(order, "_letz_upi_screenshot_url")
  );
  const requirement = getMeta(
    order,
    "_letz_upi_require_screenshot"
  );
  const requiresScreenshot =
    requirement === undefined ? true : isTruthyMeta(requirement);
  const hasProof = Boolean(
    proofKey || screenshotId || legacyProofUrl
  );
  const canVerify = Boolean(
    isOnHold &&
      transactionId &&
      (!requiresScreenshot || hasProof)
  );
  const proofUrl = `/api/orders/${order.id}/upi-proof`;

  if (!isUpi) return null;

  async function handleVerify() {
    if (!canVerify || loading) return;

    const confirmed = window.confirm(
      "Confirm that you checked the UPI transaction and payment proof?"
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch("/api/orders/verify-upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const parsed: unknown = await response
        .json()
        .catch(() => null);
      const error =
        parsed &&
        typeof parsed === "object" &&
        "error" in parsed &&
        typeof parsed.error === "string"
          ? parsed.error
          : "Payment verification failed.";

      if (!response.ok) {
        window.alert(error);
        return;
      }

      window.alert("UPI payment verified successfully.");
      window.location.reload();
    } catch (error) {
      console.error("UPI verification request failed", error);
      window.alert("Payment verification failed.");
    } finally {
      setLoading(false);
    }
  }

  const statusBadge = isOnHold ? (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
      Pending verification
    </span>
  ) : isVerified ? (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
      {String(order.status || "UPI order").replaceAll("-", " ")}
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
          {isOnHold ? "Review payment" : "View UPI details"}
        </button>
      </div>

      {showDetails ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 md:items-center md:p-6"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:max-h-[90dvh] md:rounded-[28px]"
            onClick={(event: MouseEvent<HTMLDivElement>) =>
              event.stopPropagation()
            }
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
                  aria-label="Close payment details"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-700 hover:bg-slate-200"
                  onClick={() => setShowDetails(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-sm text-slate-700">
              {transactionId ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Transaction number
                  </div>
                  <div className="mt-1 break-all rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                    {transactionId}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Transaction number is missing.
                </div>
              )}

              {hasProof ? (
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View payment proof
                </a>
              ) : requiresScreenshot ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Required payment proof has not been uploaded.
                </div>
              ) : (
                <div className="text-sm text-slate-600">
                  Screenshot proof is disabled for this order.
                </div>
              )}

              {isVerified ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Payment was already verified.
                </div>
              ) : null}

              {isOnHold ? (
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={!canVerify || loading}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Verifying..."
                    : "Verify & Confirm Payment"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
