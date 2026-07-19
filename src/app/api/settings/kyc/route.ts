import {
  NextResponse,
  type NextRequest,
} from "next/server";

import { getWpBaseUrl } from "@/lib/wpClient";

const INTERNAL_TOKEN =
  process.env.LETZ_INTERNAL_TOKEN || "";

const MAX_REQUEST_BYTES = 64 * 1024;

const PRIVATE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function serviceError(
  status = 500
) {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Could not process KYC details.",
    },
    {
      status,
      headers: PRIVATE_HEADERS,
    }
  );
}

async function tenantBase(): Promise<string> {
  return (
    await getWpBaseUrl()
  ).replace(/\/$/, "");
}

async function readUpstream(
  response: Response
): Promise<JsonRecord | null> {
  const parsed: unknown = await response
    .json()
    .catch(() => null);

  return isRecord(parsed)
    ? parsed
    : null;
}

async function saveKyc(
  request: NextRequest
) {
  if (!INTERNAL_TOKEN) {
    return serviceError(500);
  }

  const contentLength = Number(
    request.headers.get("content-length") ||
      "0"
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_REQUEST_BYTES
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "KYC request is too large.",
      },
      {
        status: 413,
        headers: PRIVATE_HEADERS,
      }
    );
  }

  const parsedBody: unknown = await request
    .json()
    .catch(() => null);

  if (!isRecord(parsedBody)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid KYC details.",
      },
      {
        status: 400,
        headers: PRIVATE_HEADERS,
      }
    );
  }

  const base = await tenantBase();

  const response = await fetch(
    `${base}/wp-json/letz/v1/kyc/save`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        "x-letz-auth": INTERNAL_TOKEN,
      },
      body: JSON.stringify(parsedBody),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    }
  );

  const saved = await readUpstream(
    response
  );

  if (!response.ok || !saved) {
    return serviceError(
      response.status >= 400 &&
        response.status < 500
        ? response.status
        : 502
    );
  }

  return NextResponse.json(
    saved,
    {
      status: 200,
      headers: PRIVATE_HEADERS,
    }
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    if (!INTERNAL_TOKEN) {
      return serviceError(500);
    }

    const base = await tenantBase();

    const kycEndpoint = new URL(
      `${base}/wp-json/letz/v1/kyc`
    );

    kycEndpoint.searchParams.set(
      "_ts",
      Date.now().toString()
    );

    const response = await fetch(
      kycEndpoint,
      {
        headers: {
          "x-letz-auth": INTERNAL_TOKEN,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      }
    );

    const kyc = await readUpstream(
      response
    );

    if (!response.ok || !kyc) {
      return serviceError(
        response.status >= 400 &&
          response.status < 500
          ? response.status
          : 502
      );
    }

    return NextResponse.json(
      kyc,
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    console.error(
      "KYC request failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return serviceError(500);
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    return await saveKyc(request);
  } catch (error: unknown) {
    console.error(
      "KYC save failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return serviceError(500);
  }
}

export async function PATCH(
  request: NextRequest
) {
  return POST(request);
}