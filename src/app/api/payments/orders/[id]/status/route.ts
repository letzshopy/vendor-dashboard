import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import { fetchInternalWp } from "@/lib/wpClient";
import {
  isRecord,
  OrderRequestError,
  parseOrderId,
  privateJson,
} from "@/lib/orderPolicy";

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
                ? "Live PayGlocal status is not available for this order."
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

    const order = isRecord(payload.order)
      ? payload.order
      : null;

    const payglocal = isRecord(
      payload.payglocal
    )
      ? payload.payglocal
      : null;

    const reconciliation = isRecord(
      payload.reconciliation
    )
      ? payload.reconciliation
      : null;

    if (
      !order ||
      !payglocal ||
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
        true
    ) {
      throw new Error(
        "Payment status identity verification failed"
      );
    }

    return privateJson({
      ok: true,
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
        provider: "PayGlocal",
        gid: boundedString(
          payglocal.gid,
          200
        ),
        status: boundedString(
          payglocal.status,
          80
        ),
        friendlyStatus: boundedString(
          payglocal.friendly_status,
          160
        ),
        message: boundedString(
          payglocal.message,
          500
        ),
        detailedMessage: boundedString(
          payglocal.detailed_message,
          500
        ),
        reasonCode: boundedString(
          payglocal.reason_code,
          100
        ),
        amount: boundedString(
          payglocal.amount,
          40
        ),
        currency: boundedString(
          payglocal.currency,
          12
        ),
        identityVerified: true,
      },
    });
  } catch (error: unknown) {
    console.error(
      "[payments:payglocal-status]",
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
