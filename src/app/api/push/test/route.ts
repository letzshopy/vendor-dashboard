import { NextResponse } from "next/server";

import { getTenantFromCookies } from "@/lib/tenant";
import {
  normalizeWebPushSubscription,
  sendWebPush,
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
  const tenant = await getTenantFromCookies();

  if (!tenant) {
    return privateJson(
      { error: "Unauthorized" },
      401
    );
  }

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

  try {
    const result = await sendWebPush(
      subscription,
      {
        type: "test",
        title: "LetzShopy order alerts enabled",
        body: "You will receive an alert when a new website order arrives.",
        url: "/dashboard",
        tag: "letz-push-test",
      }
    );

    if (!result.ok) {
      return privateJson(
        {
          error:
            result.expired
              ? "This notification subscription has expired."
              : "Test notification could not be delivered.",
        },
        result.expired ? 410 : 502
      );
    }

    return privateJson({
      ok: true,
    });
  } catch {
    return privateJson(
      {
        error: "Test notification is unavailable.",
      },
      503
    );
  }
}
