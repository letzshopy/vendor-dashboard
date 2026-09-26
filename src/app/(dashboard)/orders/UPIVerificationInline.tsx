"use client";

import {
  useState,
} from "react";
import {
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  useRouter,
} from "next/navigation";

import {
  BottomSheet,
} from "@/components/ui/bottom-sheet";
import {
  Button,
  buttonClassName,
} from "@/components/ui/button";
import {
  ConfirmDialog,
} from "@/components/ui/confirm-dialog";
import {
  StatusBadge,
} from "@/components/ui/status-badge";
import {
  actionFeedback,
} from "@/lib/actionFeedback";
import type {
  WCOrder,
} from "@/lib/order-utils";

type MetaEntry = {
  key?: string;
  value?: unknown;
};

type UpiOrder =
  WCOrder & {
    meta_data?: MetaEntry[];
    payment_method?: string;
  };

type Props = {
  order: UpiOrder;
};

function getMeta(
  order: UpiOrder,
  key: string
): unknown {
  const meta =
    Array.isArray(
      order.meta_data
    )
      ? order.meta_data
      : [];

  return meta.find(
    (
      entry
    ) =>
      entry?.key ===
      key
  )?.value;
}

function isTruthyMeta(
  value: unknown
): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "yes" ||
    value === "on"
  );
}

function displayMeta(
  value: unknown
): string {
  if (
    typeof value ===
    "string"
  ) {
    return value.trim();
  }

  if (
    typeof value ===
    "number"
  ) {
    return String(
      value
    );
  }

  return "";
}

export function UPIVerificationInline({
  order,
}: Props) {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(false);
  const [
    showDetails,
    setShowDetails,
  ] =
    useState(false);
  const [
    confirmOpen,
    setConfirmOpen,
  ] =
    useState(false);

  const isUpi =
    order.payment_method ===
    "letz_upi";
  const isOnHold =
    order.status ===
    "on-hold";
  const isVerified =
    [
      "processing",
      "completed",
    ].includes(
      String(
        order.status ||
          ""
      ).toLowerCase()
    );

  const transactionId =
    displayMeta(
      getMeta(
        order,
        "_letz_upi_txn"
      )
    );
  const screenshotId =
    getMeta(
      order,
      "_letz_upi_screenshot_id"
    );
  const proofKey =
    displayMeta(
      getMeta(
        order,
        "_letz_upi_proof_key"
      )
    );
  const legacyProofUrl =
    displayMeta(
      getMeta(
        order,
        "_letz_upi_screenshot_url"
      )
    );
  const requirement =
    getMeta(
      order,
      "_letz_upi_require_screenshot"
    );
  const requiresScreenshot =
    requirement ===
    undefined
      ? true
      : isTruthyMeta(
          requirement
        );
  const hasProof =
    Boolean(
      proofKey ||
        screenshotId ||
        legacyProofUrl
    );
  const canVerify =
    Boolean(
      isOnHold &&
        transactionId &&
        (!requiresScreenshot ||
          hasProof)
    );
  const proofUrl =
    `/api/orders/${order.id}/upi-proof`;

  if (!isUpi) {
    return null;
  }

  async function handleVerify() {
    if (
      !canVerify ||
      loading
    ) {
      return;
    }

    const feedbackId =
      `upi-verify-${order.id}`;

    setLoading(true);
    actionFeedback.loading({
      id: feedbackId,
      title:
        "Verifying UPI payment…",
      message:
        `Order #${order.number || order.id}`,
    });

    try {
      const response =
        await fetch(
          "/api/orders/verify-upi",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                orderId:
                  order.id,
              }),
          }
        );

      const parsed:
        unknown =
        await response
          .json()
          .catch(
            () => null
          );

      const errorMessage =
        parsed &&
        typeof parsed ===
          "object" &&
        "error" in
          parsed &&
        typeof (
          parsed as {
            error?: unknown;
          }
        ).error ===
          "string"
          ? (
              parsed as {
                error: string;
              }
            ).error
          : "Payment verification failed.";

      if (
        !response.ok
      ) {
        throw new Error(
          errorMessage
        );
      }

      actionFeedback.success({
        id: feedbackId,
        title:
          "UPI payment verified",
        message:
          `Order #${order.number || order.id} is ready for the next fulfilment step.`,
        durationMs: 3200,
      });

      setConfirmOpen(
        false
      );
      setShowDetails(
        false
      );
      router.refresh();
    } catch (
      error
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "UPI verification failed",
        message:
          error instanceof
          Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });
    } finally {
      setLoading(false);
    }
  }

  const statusBadge =
    isOnHold ? (
      <StatusBadge
        status="on-hold"
        label="Pending verification"
        tone="warning"
      />
    ) : isVerified ? (
      <StatusBadge
        status="verified"
        label="Verified"
        tone="success"
      />
    ) : (
      <StatusBadge
        status={String(
          order.status ||
            "upi"
        )}
        label={String(
          order.status ||
            "UPI order"
        ).replaceAll(
          "-",
          " "
        )}
        tone="neutral"
      />
    );

  return (
    <>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {
          statusBadge
        }

        <button
          type="button"
          onClick={() =>
            setShowDetails(
              true
            )
          }
          className="ls-focus-ring rounded-lg px-1.5 py-1 text-[11px] font-bold text-primary hover:bg-secondary"
        >
          {isOnHold
            ? "Review payment"
            : "View UPI details"}
        </button>
      </div>

      <BottomSheet
        open={
          showDetails
        }
        onOpenChange={
          setShowDetails
        }
        title="UPI payment"
        description={`Order #${order.number || order.id}`}
        popupClassName="md:mx-auto md:max-w-md"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-soft px-3 py-2.5">
            <span className="text-xs font-bold text-muted-foreground">
              Status
            </span>
            {
              statusBadge
            }
          </div>

          {transactionId ? (
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Transaction number
              </div>
              <div className="mt-1 break-all text-sm font-bold text-heading">
                {
                  transactionId
                }
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              Transaction number is missing.
            </div>
          )}

          {hasProof ? (
            <a
              href={
                proofUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName({
                variant:
                  "outline",
                size: "lg",
                className:
                  "w-full",
              })}
            >
              <ExternalLink className="h-4 w-4" />
              View payment proof
            </a>
          ) : requiresScreenshot ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              Required payment proof has not been uploaded.
            </div>
          ) : (
            <div className="rounded-xl bg-surface-soft px-3 py-2.5 text-sm text-muted-foreground">
              Screenshot proof is disabled for this order.
            </div>
          )}

          {isVerified ? (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Payment was already verified.
              </span>
            </div>
          ) : null}

          {isOnHold ? (
            <Button
              size="lg"
              className="w-full"
              disabled={
                !canVerify ||
                loading
              }
              onClick={() =>
                setConfirmOpen(
                  true
                )
              }
            >
              Verify & Confirm Payment
            </Button>
          ) : null}

          {isOnHold &&
          !canVerify ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Verification becomes available after the required transaction details and payment proof are present.
            </p>
          ) : null}
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={
          confirmOpen
        }
        onOpenChange={
          setConfirmOpen
        }
        title="Confirm UPI payment?"
        description="Confirm only after you have checked the transaction number and required payment proof."
        confirmLabel="Verify payment"
        loading={
          loading
        }
        loadingLabel="Verifying…"
        onConfirm={
          handleVerify
        }
      />
    </>
  );
}
