import { NextResponse } from "next/server";

import { fetchInternalWp } from "@/lib/wpClient";
import {
  normalizeWebPushSubscription,
} from "@/lib/webPush";

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

export async function POST(request: Request) {
  const body: unknown = await request
    .json()
    .catch(() => null);

  if (!isRecord(body)) {
    return privateJson(
      { error: "Invalid push subscription payload." },
      400
    );
  }

  const subscription =
    normalizeWebPushSubscription(body.subscription);

  if (!subscription) {
    return privateJson(
      { error: "Invalid push subscription." },
      400
    );
  }

  if (process.env.VERCEL_ENV !== "production") {
    return privateJson({
      ok: true,
      enabled: true,
      preview: true,
    });
  }

  try {
    const response = await fetchInternalWp(
      "/wp-json/letz/v2/push/subscriptions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription,
        }),
      }
    );

    const payload: unknown = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      return privateJson(
        {
          error:
            isRecord(payload) &&
            typeof payload.message === "string"
              ? payload.message
              : "Unable to enable order notifications.",
        },
        response.status
      );
    }

    return privateJson({
      ok: true,
      enabled: true,
    });
  } catch {
    return privateJson(
      {
        error: "Unable to enable order notifications.",
      },
      502
    );
  }
}

export async function DELETE(request: Request) {
  const body: unknown = await request
    .json()
    .catch(() => null);

  if (
    !isRecord(body) ||
    typeof body.endpoint !== "string"
  ) {
    return privateJson(
      { error: "Push endpoint is required." },
      400
    );
  }

  const endpoint = body.endpoint.trim();

  if (
    endpoint.length < 20 ||
    endpoint.length > 4096 ||
    !endpoint.startsWith("https://")
  ) {
    return privateJson(
      { error: "Invalid push endpoint." },
      400
    );
  }

  if (process.env.VERCEL_ENV !== "production") {
    return privateJson({
      ok: true,
      enabled: false,
      preview: true,
    });
  }

  try {
    const response = await fetchInternalWp(
      "/wp-json/letz/v2/push/subscriptions",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint,
        }),
      }
    );

    if (!response.ok) {
      return privateJson(
        {
          error: "Unable to disable order notifications.",
        },
        response.status
      );
    }

    return privateJson({
      ok: true,
      enabled: false,
    });
  } catch {
    return privateJson(
      {
        error: "Unable to disable order notifications.",
      },
      502
    );
  }
}
