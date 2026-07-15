import { NextResponse, type NextRequest } from "next/server";

import { resolveMasterVendorStoreUrl } from "@/lib/masterVendor";

const MASTER_API_KEY = process.env.MASTER_API_KEY || "";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ blogid: string }> }
) {
  try {
    if (!MASTER_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Master service is not configured." },
        { status: 500, headers: PRIVATE_HEADERS }
      );
    }

    const parsedBody: unknown = await request.json().catch(() => null);
    const body = isRecord(parsedBody) ? parsedBody : {};
    const status = String(body.status || "").trim().toLowerCase();

    if (status !== "active" && status !== "rejected") {
      return NextResponse.json(
        { ok: false, error: "Select approve or reject for domain renewal payment." },
        { status: 400, headers: PRIVATE_HEADERS }
      );
    }

    const { blogid } = await context.params;
    const storeUrl = await resolveMasterVendorStoreUrl(blogid);

    const response = await fetch(`${storeUrl}/wp-json/letz/v1/domain-renewal/review`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MASTER_API_KEY}`,
        "X-Letz-Master-Key": MASTER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    const parsed = await readJson(response);

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: "Could not review domain renewal payment." },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502, headers: PRIVATE_HEADERS }
      );
    }

    return NextResponse.json(parsed, { status: 200, headers: PRIVATE_HEADERS });
  } catch (error: unknown) {
    console.error("Master domain renewal review failed:", error instanceof Error ? error.message : "Unknown error");

    return NextResponse.json(
      { ok: false, error: "Could not review domain renewal payment." },
      { status: 500, headers: PRIVATE_HEADERS }
    );
  }
}
