"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CreditCard,
  Loader2,
  RefreshCw,
} from "lucide-react";

type MetaEntry = {
  key?: string;
  value?: unknown;
};

type OrderLike = {
  id: number;
  number?: string | number;
  status?: string;
  total?: string | number;
  currency?: string;
  payment_method?: string;
  payment_method_title?: string;
  transaction_id?: string;
  date_paid_gmt?: string | null;
  date_paid?: string | null;
  meta_data?: MetaEntry[];
};

type LivePayGlocalStatus = {
  ok: true;
  order: {
    orderId: number;
    orderNumber: string;
    wooStatus: string;
    paid: boolean;
    amount: string;
    currency: string;
  };
  payment: {
    provider: string;
    gid: string;
    status: string;
    friendlyStatus: string;
    message: string;
    detailedMessage: string;
    reasonCode: string;
    amount: string;
    currency: string;
    identityVerified: true;
  };
};

function textValue(
  value: unknown
): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "";
}

function exactMeta(
  order: OrderLike,
  key: string
): string {
  const entries = Array.isArray(
    order.meta_data
  )
    ? order.meta_data
    : [];

  const match = entries.find(
    (entry) => entry?.key === key
  );

  return textValue(match?.value);
}

function formatPaidDate(
  dateGmt?: string | null,
  dateLocal?: string | null
): string {
  const raw = dateGmt
    ? `${dateGmt}Z`
    : dateLocal || "";

  if (!raw) {
    return "Not available";
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(
  amount: string | number | undefined,
  currency = "INR"
): string {
  const numeric = Number(amount);

  if (!Number.isFinite(numeric)) {
    return "Not available";
  }

  try {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency:
          String(currency || "INR")
            .toUpperCase(),
        minimumFractionDigits: 2,
      }
    ).format(numeric);
  } catch {
    return `${String(
      currency || "INR"
    ).toUpperCase()} ${numeric.toFixed(2)}`;
  }
}

function paymentStatusClass(
  label: string
): string {
  const normalized =
    label.toLowerCase();

  if (
    normalized.includes("successful") ||
    normalized === "paid" ||
    normalized === "verified"
  ) {
    return "text-emerald-700";
  }

  if (
    normalized.includes("declined") ||
    normalized.includes("failed") ||
    normalized.includes("cancelled") ||
    normalized === "not paid"
  ) {
    return "text-rose-700";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("progress") ||
    normalized.includes("started") ||
    normalized.includes("review") ||
    normalized.includes("authorised")
  ) {
    return "text-amber-700";
  }

  return "text-slate-700";
}

function friendlyWooStatus(
  status: string
): string {
  const normalized =
    String(status || "")
      .trim()
      .toLowerCase();

  const labels: Record<string, string> = {
    pending: "Pending payment",
    processing: "Processing",
    "on-hold": "On hold",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
    failed: "Failed",
  };

  return (
    labels[normalized] ||
    normalized.replace(/[-_]+/g, " ") ||
    "Not available"
  );
}

function InfoTile({
  label,
  value,
  valueClassName = "",
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
      <div
        className={[
          "mt-1 break-words text-sm font-semibold text-slate-900",
          mono
            ? "font-mono text-xs"
            : "",
          valueClassName,
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

export default function OrderPaymentInformation({
  order,
}: {
  order: OrderLike;
}) {
  const method =
    String(
      order.payment_method || ""
    ).toLowerCase();

  const isPayGlocal =
    method ===
    "payglocal_payment_gateway";

  const isManualUpi =
    method === "letz_upi";

  const isCod =
    method === "cod";

  const isBankTransfer =
    method === "bacs";

  const [liveStatus, setLiveStatus] =
    useState<LivePayGlocalStatus | null>(
      null
    );

  const [liveLoading, setLiveLoading] =
    useState(false);

  const [liveError, setLiveError] =
    useState("");

  const loadLiveStatus =
    useCallback(async () => {
      if (
        !isPayGlocal ||
        !Number.isInteger(order.id) ||
        order.id < 1
      ) {
        return;
      }

      setLiveLoading(true);
      setLiveError("");

      try {
        const response = await fetch(
          `/api/payments/orders/${order.id}/status`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const payload: unknown =
          await response
            .json()
            .catch(() => null);

        if (
          !response.ok ||
          !payload ||
          typeof payload !== "object" ||
          Array.isArray(payload)
        ) {
          const errorMessage =
            payload &&
            typeof payload === "object" &&
            !Array.isArray(payload) &&
            typeof (
              payload as Record<
                string,
                unknown
              >
            ).error === "string"
              ? String(
                  (
                    payload as Record<
                      string,
                      unknown
                    >
                  ).error
                )
              : "Live payment status is unavailable.";

          throw new Error(errorMessage);
        }

        const result =
          payload as Partial<LivePayGlocalStatus>;

        if (
          result.ok !== true ||
          !result.payment ||
          !result.order ||
          result.payment
            .identityVerified !== true
        ) {
          throw new Error(
            "Live payment status could not be verified."
          );
        }

        setLiveStatus(
          result as LivePayGlocalStatus
        );
      } catch (error) {
        setLiveStatus(null);
        setLiveError(
          error instanceof Error
            ? error.message
            : "Live payment status is unavailable."
        );
      } finally {
        setLiveLoading(false);
      }
    }, [isPayGlocal, order.id]);

  useEffect(() => {
    if (isPayGlocal) {
      void loadLiveStatus();
    } else {
      setLiveStatus(null);
      setLiveError("");
      setLiveLoading(false);
    }
  }, [
    isPayGlocal,
    loadLiveStatus,
  ]);

  const manualUpi = useMemo(
    () => ({
      transaction:
        exactMeta(
          order,
          "_letz_upi_txn"
        ),
      verifiedAt:
        exactMeta(
          order,
          "_letz_upi_verified_at"
        ),
      proofKey:
        exactMeta(
          order,
          "_letz_upi_proof_key"
        ),
      legacyProofId:
        exactMeta(
          order,
          "_letz_upi_screenshot_id"
        ),
      legacyProofUrl:
        exactMeta(
          order,
          "_letz_upi_screenshot_url"
        ),
    }),
    [order]
  );

  const wooStatus =
    String(order.status || "");

  const displayedWooStatus =
    wooStatus ||
    liveStatus?.order.wooStatus ||
    "";

  const hasPaidDate = Boolean(
    order.date_paid_gmt ||
      order.date_paid
  );

  const methodLabel =
    isPayGlocal
      ? "PayGlocal"
      : isManualUpi
        ? "Manual UPI"
        : isCod
          ? "Cash on Delivery"
          : isBankTransfer
            ? "Direct Bank Transfer"
            : order.payment_method_title ||
              method ||
              "Not specified";

  let paymentStatus =
    "Pending";

  if (isPayGlocal) {
    paymentStatus =
      liveStatus?.payment
        .friendlyStatus ||
      (liveLoading
        ? "Checking live statusÃ¢â‚¬Â¦"
        : liveError
          ? "Live status unavailable"
          : "Payment status unavailable");
  } else if (isManualUpi) {
    if (manualUpi.verifiedAt) {
      paymentStatus = "Verified";
    } else if (hasPaidDate) {
      paymentStatus =
        "Paid in WooCommerce";
    } else if (
      wooStatus === "on-hold"
    ) {
      paymentStatus =
        "Pending verification";
    } else if (
      wooStatus === "failed"
    ) {
      paymentStatus = "Failed";
    } else if (
      wooStatus === "cancelled"
    ) {
      paymentStatus = "Not paid";
    }
  } else if (isCod) {
    if (hasPaidDate) {
      paymentStatus = "Paid";
    } else if (
      wooStatus === "failed" ||
      wooStatus === "cancelled"
    ) {
      paymentStatus = "Not paid";
    } else {
      paymentStatus =
        "Pay on delivery";
    }
  } else if (isBankTransfer) {
    if (hasPaidDate) {
      paymentStatus = "Paid";
    } else if (
      wooStatus === "failed" ||
      wooStatus === "cancelled"
    ) {
      paymentStatus = "Not paid";
    } else {
      paymentStatus =
        "Pending bank transfer";
    }
  } else if (hasPaidDate) {
    paymentStatus = "Paid";
  } else if (
    wooStatus === "failed" ||
    wooStatus === "cancelled"
  ) {
    paymentStatus = "Not paid";
  }

  const referenceLabel =
    isPayGlocal
      ? "PayGlocal GID"
      : isManualUpi
        ? "UPI Transaction ID / UTR"
        : isBankTransfer
          ? "Transaction reference"
          : "Transaction reference";

  const referenceValue =
    isPayGlocal
      ? liveStatus?.payment.gid || ""
      : isManualUpi
        ? manualUpi.transaction
        : String(
            order.transaction_id || ""
          ).trim();

  const hasManualProof =
    Boolean(
      manualUpi.proofKey ||
      manualUpi.legacyProofId ||
      manualUpi.legacyProofUrl
    );

  const displayAmount =
    isPayGlocal &&
    liveStatus
      ? formatMoney(
          liveStatus.payment.amount,
          liveStatus.payment.currency
        )
      : formatMoney(
          order.total,
          order.currency
        );

  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#faf7ff] via-white to-[#f4fbff] px-4 py-4 md:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-50 text-violet-700 shadow-sm">
              <CreditCard className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
                Payment Information
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Payment method and transaction status
              </p>
            </div>
          </div>

          {isPayGlocal ? (
            <button
              type="button"
              onClick={() =>
                void loadLiveStatus()
              }
              disabled={liveLoading}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {liveLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-4 md:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <InfoTile
            label="Payment method"
            value={methodLabel}
          />

          <InfoTile
            label="Payment status"
            value={paymentStatus}
            valueClassName={
              paymentStatusClass(
                paymentStatus
              )
            }
          />

          <InfoTile
            label="Woo order status"
            value={friendlyWooStatus(
              displayedWooStatus
            )}
          />

          <InfoTile
            label="Amount"
            value={displayAmount}
          />

          <InfoTile
            label={referenceLabel}
            value={
              referenceValue ||
              (isCod
                ? "Not applicable"
                : "Not available")
            }
            mono={Boolean(
              referenceValue
            )}
          />

          {!isPayGlocal ? (
            <InfoTile
              label="Paid on"
              value={
                hasPaidDate
                  ? formatPaidDate(
                      order.date_paid_gmt,
                      order.date_paid
                    )
                  : "Not available"
              }
            />
          ) : null}

          {isPayGlocal ? (
            <>
              <InfoTile
                label="Provider status"
                value={
                  liveStatus?.payment
                    .status ||
                  (liveLoading
                    ? "CheckingÃ¢â‚¬Â¦"
                    : "Not available")
                }
              />

              <InfoTile
                label="Reason code"
                value={
                  liveStatus?.payment
                    .reasonCode ||
                  "Not available"
                }
              />

              <InfoTile
                label="Identity check"
                value={
                  liveStatus?.payment
                    .identityVerified
                    ? "Verified"
                    : liveLoading
                      ? "CheckingÃ¢â‚¬Â¦"
                      : "Not available"
                }
                valueClassName={
                  liveStatus?.payment
                    .identityVerified
                    ? "text-emerald-700"
                    : ""
                }
              />
            </>
          ) : null}
        </div>

        {isPayGlocal &&
        liveStatus?.payment
          .detailedMessage ? (
          <div className="mt-3 rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Gateway message
            </div>
            <div className="mt-1 text-sm text-slate-700">
              {
                liveStatus.payment
                  .detailedMessage
              }
            </div>
          </div>
        ) : null}

        {isPayGlocal &&
        liveError ? (
          <div className="mt-3 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {liveError}
          </div>
        ) : null}

        {isManualUpi &&
        hasManualProof ? (
          <div className="mt-3">
            <a
              href={`/api/orders/${order.id}/upi-proof`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              View payment proof
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
