import { NextResponse } from "next/server";

import { getTenantFromCookies } from "@/lib/tenant";
import { getVapidPublicKey } from "@/lib/webPush";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const tenant = await getTenantFromCookies();

  if (!tenant) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    return NextResponse.json(
      {
        ok: true,
        publicKey: getVapidPublicKey(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Push configuration unavailable:",
      error instanceof Error
        ? error.message
        : "Unknown configuration error"
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Order push notifications are not configured.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
