import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import { fetchInternalWp } from "@/lib/wpClient";
import {
  isRecord,
  logOrderError,
  parseBoundedString,
  parseOrderId,
  privateJson,
  readJsonObject,
  requestErrorResponse,
} from "@/lib/orderPolicy";

function safeRuntimeMessage(
  value: unknown
): string | null {
  if (
    !isRecord(value) ||
    typeof value.message !== "string"
  ) {
    return null;
  }

  try {
    return parseBoundedString(
      value.message,
      "Payment verification response",
      200,
      { required: true }
    );
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const storeFeatureError =
    await requireStoreFeature("upi");

  if (storeFeatureError) {
    return storeFeatureError;
  }

  try {
    const body = await readJsonObject(
      request,
      8 * 1024
    );

    const orderId = parseOrderId(
      body.orderId
    );

    const response = await fetchInternalWp(
      `/wp-json/letz/v1/orders/${orderId}/verify-upi`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    const result: unknown =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      const status =
        [400, 404, 409].includes(
          response.status
        )
          ? response.status
          : 502;

      return privateJson(
        {
          ok: false,
          error:
            safeRuntimeMessage(result) ||
            "Payment verification failed.",
        },
        status
      );
    }

    if (
      !isRecord(result) ||
      result.ok !== true
    ) {
      throw new Error(
        "Unexpected payment verification response"
      );
    }

    return privateJson({
      ok: true,
      orderId,
      status:
        typeof result.status === "string"
          ? result.status
          : "processing",
    });
  } catch (error) {
    logOrderError(
      "verify-upi",
      error
    );

    return requestErrorResponse(
      error,
      "Payment verification failed."
    );
  }
}