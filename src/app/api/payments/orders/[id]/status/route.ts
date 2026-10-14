import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import { fetchInternalWp } from "@/lib/wpClient";
import {
  isRecord,
  OrderRequestError,
  parseOrderId,
  privateJson,
} from "@/lib/orderPolicy";
import type {
  LivePaymentStatusResponse,
  PaymentProviderKey,
} from "@/types/provider-payment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UPSTREAM_TIMEOUT_MS = 40_000;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function boundedString(
  value: unknown,
  maxLength: number
): string {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function providerKey(
  value: unknown
): PaymentProviderKey | null {
  const normalized = boundedString(
    value,
    40
  ).toLowerCase();

  return normalized === "zoho" ||
    normalized === "payglocal"
    ? normalized
    : null;
}

function upstreamStatus(
  status: number
): number {
  if (
    status === 400 ||
    status === 404 ||
    status === 409
  ) {
    return status;
  }

  return 502;
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const storeFeatureError =
    await requireStoreFeature("payments");

  if (storeFeatureError) {
    return storeFeatureError;
  }

  let orderId: number;

  try {
    const { id } = await context.params;
    orderId = parseOrderId(id);
  } catch (error) {
    if (error instanceof OrderRequestError) {
      return privateJson(
        {
          ok: false,
          error: error.message,
        },
        error.status
      );
    }

    return privateJson(
      {
        ok: false,
        error: "Invalid order.",
      },
      400
    );
  }

  try {
    const response = await fetchInternalWp(
      `/wp-json/letz/v2/payments/orders/${orderId}/status`,
      {
        method: "GET",
        headers: {
          "Cache-Control":
            "no-cache, no-store, max-age=0",
          Pragma: "no-cache",
        },
        cache: "no-store",
      },
      UPSTREAM_TIMEOUT_MS
    );

    const payload: unknown =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      return privateJson(
        {
          ok: false,
          error:
            response.status === 404
              ? "Order not found."
              : response.status === 409
                ? "Live gateway status is not available for this order."
                : "Unable to load payment status.",
        },
        upstreamStatus(response.status)
      );
    }

    if (!isRecord(payload)) {
      throw new Error(
        "Invalid payment status response"
      );
    }

    const key = providerKey(
      payload.provider_key
    );

    const order = isRecord(payload.order)
      ? payload.order
      : null;

    const payment = isRecord(
      payload.payment
    )
      ? payload.payment
      : null;

    const settlement = isRecord(
      payload.settlement
    )
      ? payload.settlement
      : {};

    const reconciliation = isRecord(
      payload.reconciliation
    )
      ? payload.reconciliation
      : null;

    if (
      !key ||
      !order ||
      !payment ||
      !reconciliation
    ) {
      throw new Error(
        "Incomplete payment status response"
      );
    }

    const responseOrderId = Number(
      order.order_id
    );

    if (
      responseOrderId !== orderId ||
      reconciliation.identity_verified !==
        true ||
      payment.identity_verified !== true
    ) {
      throw new Error(
        "Payment status identity verification failed"
      );
    }

    const result: LivePaymentStatusResponse = {
      ok: true,
      providerKey: key,
      order: {
        orderId: responseOrderId,
        orderNumber: boundedString(
          order.order_number,
          80
        ),
        wooStatus: boundedString(
          order.woo_status,
          40
        ),
        paid: order.paid === true,
        amount: boundedString(
          order.amount,
          40
        ),
        currency: boundedString(
          order.currency,
          12
        ),
      },
      payment: {
        provider:
          boundedString(
            payment.provider,
            80
          ) ||
          (key === "zoho"
            ? "Zoho Payments"
            : "PayGlocal"),
        providerKey: key,
        paymentId: boundedString(
          payment.payment_id,
          240
        ),
        sessionId: boundedString(
          payment.session_id,
          320
        ),
        reference: boundedString(
          payment.reference,
          240
        ),
        transactionReference:
          boundedString(
            payment.transaction_reference,
            240
          ),
        invoiceNumber: boundedString(
          payment.invoice_number,
          160
        ),
        paymentMethod: boundedString(
          payment.payment_method,
          120
        ),
        paymentMethodDetail:
          boundedString(
            payment.payment_method_detail,
            160
          ),
        status: boundedString(
          payment.status,
          80
        ),
        friendlyStatus:
          boundedString(
            payment.friendly_status,
            160
          ),
        message: boundedString(
          payment.message,
          500
        ),
        detailedMessage:
          boundedString(
            payment.detailed_message,
            500
          ),
        reasonCode: boundedString(
          payment.reason_code,
          100
        ),
        amount: boundedString(
          payment.amount,
          40
        ),
        currency: boundedString(
          payment.currency,
          12
        ),
        feeAmount: boundedString(
          payment.fee_amount,
          40
        ),
        taxAmount: boundedString(
          payment.tax_amount,
          40
        ),
        totalFeeAmount:
          boundedString(
            payment.total_fee_amount,
            40
          ),
        netAmount: boundedString(
          payment.net_amount,
          40
        ),
        paidAt: boundedString(
          payment.paid_at,
          80
        ),
        identityVerified: true,
      },
      settlement: {
        available:
          settlement.available === true,
        scopeRequired:
          settlement.scope_required === true,
        status: boundedString(
          settlement.status,
          80
        ),
        friendlyStatus:
          boundedString(
            settlement.friendly_status,
            160
          ) ||
          "Settlement status unavailable",
        payoutId: boundedString(
          settlement.payout_id,
          240
        ),
        amount: boundedString(
          settlement.amount,
          40
        ),
        currency: boundedString(
          settlement.currency,
          12
        ),
        initiatedAt: boundedString(
          settlement.initiated_at,
          80
        ),
        processedAt: boundedString(
          settlement.processed_at,
          80
        ),
        bankReference: boundedString(
          settlement.bank_reference,
          240
        ),
      },
    };

    return privateJson(result);
  } catch (error: unknown) {
    console.error(
      "[payments:provider-status]",
      error instanceof Error
        ? error.message
        : "Unknown payment status error"
    );

    return privateJson(
      {
        ok: false,
        error:
          "Unable to load live payment status.",
      },
      502
    );
  }
}
