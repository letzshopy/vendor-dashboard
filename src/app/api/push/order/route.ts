import {
  timingSafeEqual,
} from "node:crypto";

import { NextResponse } from "next/server";

import {
  normalizeWebPushSubscription,
  sendWebPush,
  type WebPushPayload,
  type WebPushSubscription,
} from "@/lib/webPush";
import {
  normalizeFcmToken,
  sendFirebasePush,
} from "@/lib/firebasePush";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function privateJson(
  body: unknown,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

function validInternalToken(request: Request): boolean {
  const expected = String(
    process.env.LETZ_INTERNAL_TOKEN || ""
  ).trim();
  const supplied = String(
    request.headers.get("x-letz-auth") || ""
  ).trim();

  if (!expected || !supplied) {
    return false;
  }

  const expectedBytes = Buffer.from(expected, "utf8");
  const suppliedBytes = Buffer.from(supplied, "utf8");

  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

function boundedText(
  value: unknown,
  maxLength: number
): string {
  return typeof value === "string" ||
    typeof value === "number"
    ? String(value)
        .replace(/[\x00-\x1F\x7F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength)
    : "";
}

function formatAmount(
  amount: string,
  currency: string
): string {
  const numeric = Number(amount);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return "";
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${currency} ${numeric.toFixed(2)}`;
  }
}

async function sendWithLimit(
  subscriptions: WebPushSubscription[],
  payload: WebPushPayload,
  concurrency = 4
) {
  const pending = subscriptions.map(
    (subscription, index) => ({
      subscription,
      index,
    })
  );
  const results: Array<{
    subscription: WebPushSubscription;
    ok: boolean;
    expired: boolean;
    status: number;
  }> = [];

  async function worker() {
    while (pending.length > 0) {
      const next = pending.shift();

      if (!next) {
        return;
      }

      const result = await sendWebPush(
        next.subscription,
        payload
      );

      results.push({
        subscription: next.subscription,
        ...result,
      });
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          Math.max(1, concurrency),
          subscriptions.length
        ),
      },
      () => worker()
    )
  );

  return results;
}

export async function POST(request: Request) {
  if (!validInternalToken(request)) {
    return privateJson(
      { error: "Unauthorized" },
      401
    );
  }

  const raw: unknown = await request
    .json()
    .catch(() => null);

  if (!isRecord(raw)) {
    return privateJson(
      { error: "Invalid push event payload." },
      400
    );
  }

  const event = boundedText(raw.event, 40);
  const storeHost = boundedText(
    raw.store_host,
    253
  ).toLowerCase();
  const order = isRecord(raw.order)
    ? raw.order
    : null;
  const orderId = Number(order?.id || 0);
  const orderNumber = boundedText(
    order?.number,
    64
  );
  const amount = boundedText(
    order?.total,
    40
  );
  const currency = boundedText(
    order?.currency,
    8
  ).toUpperCase();

  if (
    event !== "new_order" ||
    !/^[a-z0-9.-]+$/.test(storeHost) ||
    !Number.isSafeInteger(orderId) ||
    orderId < 1 ||
    !orderNumber ||
    !amount ||
    !/^[A-Z]{3}$/.test(currency)
  ) {
    return privateJson(
      { error: "Invalid order push event." },
      400
    );
  }

  const rawSubscriptions = Array.isArray(
    raw.subscriptions
  )
    ? raw.subscriptions.slice(0, 20)
    : [];

  const subscriptions =
    rawSubscriptions
      .map((value) =>
        normalizeWebPushSubscription(value)
      )
      .filter(
        (
          value
        ): value is WebPushSubscription =>
          Boolean(value)
      );

  const nativeTokens =
    (
      Array.isArray(
        raw.native_tokens
      )
        ? raw.native_tokens
        : []
    )
      .slice(0, 20)
      .map((value) =>
        normalizeFcmToken(
          value
        )
      )
      .filter(
        (
          value
        ): value is string =>
          Boolean(value)
      );

  if (
    subscriptions.length === 0 &&
    nativeTokens.length === 0
  ) {
    return privateJson({
      ok: true,
      delivered: 0,
      failed: 0,
      expired_endpoints: [],
      expired_native_tokens: [],
    });
  }

  const displayAmount = formatAmount(
    amount,
    currency
  );

  const payload: WebPushPayload = {
    type: "new_order",
    title: `New order #${orderNumber}`,
    body: displayAmount
      ? `${displayAmount} • Tap to view order`
      : "Tap to view the new order",
    url: `/orders/${orderId}`,
    tag: `letz-order-${orderId}`,
    orderId,
    orderNumber,
  };

  try {
    const [
      webResults,
      nativeResults,
    ] = await Promise.all([
      subscriptions.length > 0
        ? sendWithLimit(
            subscriptions,
            payload
          )
        : Promise.resolve([]),
      nativeTokens.length > 0
        ? Promise.all(
            nativeTokens.map(
              async (token) => ({
                token,
                ...(await sendFirebasePush(
                  token,
                  payload
                )),
              })
            )
          )
        : Promise.resolve([]),
    ]);

    const expiredEndpoints =
      webResults
        .filter(
          (result) =>
            result.expired
        )
        .map(
          (result) =>
            result
              .subscription
              .endpoint
        );

    const expiredNativeTokens =
      nativeResults
        .filter(
          (result) =>
            result.expired
        )
        .map(
          (result) =>
            result.token
        );

    const webDelivered =
      webResults.filter(
        (result) =>
          result.ok
      ).length;

    const nativeDelivered =
      nativeResults.filter(
        (result) =>
          result.ok
      ).length;

    const webFailed =
      webResults.filter(
        (result) =>
          !result.ok &&
          !result.expired
      ).length;

    const nativeFailed =
      nativeResults.filter(
        (result) =>
          !result.ok &&
          !result.expired
      ).length;

    return privateJson({
      ok: true,
      delivered:
        webDelivered +
        nativeDelivered,
      failed:
        webFailed +
        nativeFailed,
      web_delivered:
        webDelivered,
      native_delivered:
        nativeDelivered,
      expired_endpoints:
        expiredEndpoints,
      expired_native_tokens:
        expiredNativeTokens,
    });
  } catch {
    return privateJson(
      {
        error:
          "Push delivery is unavailable.",
      },
      503
    );
  }
}
