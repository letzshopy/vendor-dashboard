import type {
  ManualUpiPaymentData,
  PaymentLedgerRow,
  PaymentLedgerStatus,
  PaymentMethodKind,
  PaymentReference,
} from "@/types/payment-ledger";

type MetaEntry = {
  key?: string;
  value?: unknown;
};

export type PaymentLedgerOrderLike = {
  id: number;
  number?: string | number;

  status?: string;

  total?: string | number;
  currency?: string;

  date_created_gmt?: string;

  date_paid_gmt?: string | null;
  date_paid?: string | null;

  payment_method?: string;
  payment_method_title?: string;

  transaction_id?: string;

  billing?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };

  meta_data?: MetaEntry[];
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
  order: PaymentLedgerOrderLike,
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

function normalizedStatus(
  value: unknown
): string {
  return textValue(value)
    .toLowerCase();
}

function paymentMethodKind(
  paymentMethod: string
): PaymentMethodKind {
  switch (
    paymentMethod
      .trim()
      .toLowerCase()
  ) {
    case "payglocal_payment_gateway":
      return "payglocal";

    case "letz_upi":
      return "manual_upi";

    case "bacs":
      return "bank_transfer";

    case "cod":
      return "cod";

    default:
      return "other";
  }
}

function methodTitle(
  kind: PaymentMethodKind,
  originalTitle: string,
  originalMethod: string
): string {
  switch (kind) {
    case "payglocal":
      return "PayGlocal";

    case "manual_upi":
      return "Manual UPI";

    case "bank_transfer":
      return "Direct Bank Transfer";

    case "cod":
      return "Cash on Delivery";

    default:
      return (
        originalTitle ||
        originalMethod ||
        "Not specified"
      );
  }
}

function paymentStatus(
  kind: PaymentMethodKind,
  wooStatus: string,
  paidRecorded: boolean,
  manualUpi: ManualUpiPaymentData | null
): PaymentLedgerStatus {
  if (kind === "payglocal") {
    return {
      code: "check-live-status",
      label: "Check live status",
      source: "payglocal-live-required",
    };
  }

  if (kind === "manual_upi") {
    if (manualUpi?.verifiedAt) {
      return {
        code: "verified",
        label: "Verified",
        source: "manual-upi",
      };
    }

    if (paidRecorded) {
      return {
        code: "paid-in-woocommerce",
        label: "Paid in WooCommerce",
        source: "woocommerce",
      };
    }

    if (wooStatus === "on-hold") {
      return {
        code: "pending-verification",
        label: "Pending verification",
        source: "manual-upi",
      };
    }

    if (wooStatus === "failed") {
      return {
        code: "failed",
        label: "Failed",
        source: "woocommerce",
      };
    }

    if (wooStatus === "cancelled") {
      return {
        code: "not-paid",
        label: "Not paid",
        source: "woocommerce",
      };
    }

    return {
      code: "unknown",
      label: "Payment status unavailable",
      source: "unavailable",
    };
  }

  if (kind === "bank_transfer") {
    if (paidRecorded) {
      return {
        code: "paid-in-woocommerce",
        label: "Paid in WooCommerce",
        source: "woocommerce",
      };
    }

    if (
      wooStatus === "failed" ||
      wooStatus === "cancelled"
    ) {
      return {
        code: "not-paid",
        label: "Not paid",
        source: "woocommerce",
      };
    }

    return {
      code: "pending-bank-transfer",
      label: "Pending bank transfer",
      source: "woocommerce",
    };
  }

  if (kind === "cod") {
    if (paidRecorded) {
      return {
        code: "paid-in-woocommerce",
        label: "Paid",
        source: "woocommerce",
      };
    }

    if (
      wooStatus === "failed" ||
      wooStatus === "cancelled"
    ) {
      return {
        code: "not-paid",
        label: "Not paid",
        source: "woocommerce",
      };
    }

    return {
      code: "pay-on-delivery",
      label: "Pay on delivery",
      source: "woocommerce",
    };
  }

  if (paidRecorded) {
    return {
      code: "paid-in-woocommerce",
      label: "Paid in WooCommerce",
      source: "woocommerce",
    };
  }

  if (wooStatus === "failed") {
    return {
      code: "failed",
      label: "Failed",
      source: "woocommerce",
    };
  }

  if (wooStatus === "cancelled") {
    return {
      code: "not-paid",
      label: "Not paid",
      source: "woocommerce",
    };
  }

  return {
    code: "unknown",
    label: "Payment status unavailable",
    source: "unavailable",
  };
}

function paymentReference(
  kind: PaymentMethodKind,
  order: PaymentLedgerOrderLike,
  manualUpi: ManualUpiPaymentData | null
): PaymentReference | null {
  if (kind === "payglocal") {
    const gid = exactMeta(
      order,
      "_payglocal_gid"
    );

    return gid
      ? {
          label: "PayGlocal GID",
          value: gid,
        }
      : null;
  }

  if (kind === "manual_upi") {
    return manualUpi?.transactionId
      ? {
          label: "UPI Transaction ID / UTR",
          value: manualUpi.transactionId,
        }
      : null;
  }

  if (kind === "cod") {
    return null;
  }

  const transactionId = textValue(
    order.transaction_id
  );

  return transactionId
    ? {
        label: "Transaction reference",
        value: transactionId,
      }
    : null;
}

function manualUpiData(
  order: PaymentLedgerOrderLike,
  kind: PaymentMethodKind
): ManualUpiPaymentData | null {
  if (kind !== "manual_upi") {
    return null;
  }

  return {
    transactionId: exactMeta(
      order,
      "_letz_upi_txn"
    ),

    verifiedAt: exactMeta(
      order,
      "_letz_upi_verified_at"
    ),

    proofAvailable: Boolean(
      exactMeta(
        order,
        "_letz_upi_proof_key"
      ) ||
        exactMeta(
          order,
          "_letz_upi_screenshot_id"
        ) ||
        exactMeta(
          order,
          "_letz_upi_screenshot_url"
        )
    ),
  };
}

export function normalizePaymentLedgerRow(
  order: PaymentLedgerOrderLike
): PaymentLedgerRow {
  const paymentMethod = textValue(
    order.payment_method
  );

  const originalTitle = textValue(
    order.payment_method_title
  );

  const kind = paymentMethodKind(
    paymentMethod
  );

  const wooStatus = normalizedStatus(
    order.status
  );

  const paidRecorded = Boolean(
    textValue(order.date_paid_gmt) ||
      textValue(order.date_paid)
  );

  const manualUpi = manualUpiData(
    order,
    kind
  );

  const firstName = textValue(
    order.billing?.first_name
  );

  const lastName = textValue(
    order.billing?.last_name
  );

  const customerName = [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    orderId: order.id,

    orderNumber:
      textValue(order.number) ||
      String(order.id),

    createdAtGmt: textValue(
      order.date_created_gmt
    ),

    customer: {
      name: customerName,
      email: textValue(
        order.billing?.email
      ),
      phone: textValue(
        order.billing?.phone
      ),
    },

    amount:
      textValue(order.total) || "0",

    currency:
      textValue(order.currency)
        .toUpperCase() || "INR",

    paymentMethod: {
      id: paymentMethod,
      title: methodTitle(
        kind,
        originalTitle,
        paymentMethod
      ),
      kind,
    },

    paymentStatus: paymentStatus(
      kind,
      wooStatus,
      paidRecorded,
      manualUpi
    ),

    woo: {
      orderStatus: wooStatus,

      paidRecorded,

      paidAtGmt: textValue(
        order.date_paid_gmt
      ),

      transactionId: textValue(
        order.transaction_id
      ),
    },

    reference: paymentReference(
      kind,
      order,
      manualUpi
    ),

    manualUpi,

    payglocal:
      kind === "payglocal"
        ? {
            requiresLiveStatus: true,
            live: null,
          }
        : null,
  };
}
