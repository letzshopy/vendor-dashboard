import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  getMasterWpBaseUrl,
} from "@/lib/wpClient";

const MASTER_API_KEY =
  process.env.MASTER_API_KEY || "";

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

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      blogid: string;
    }>;
  }
) {
  try {
    if (!MASTER_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Master storefront service is not configured.",
        },
        {
          status: 500,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const { blogid } =
      await context.params;

    const blogId = Number(blogid);

    if (
      !Number.isInteger(blogId) ||
      blogId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid vendor blog ID.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const parsed: unknown = await request
      .json()
      .catch(() => null);

    if (
      !isRecord(parsed) ||
      typeof parsed.suspended !==
        "boolean"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A boolean suspended value is required.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const base = (
      await getMasterWpBaseUrl()
    ).replace(/\/$/, "");

    const response = await fetch(
      `${base}/wp-json/letz/v1/master-vendors/${blogId}/storefront-access`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${MASTER_API_KEY}`,
          "X-Letz-Master-Key":
            MASTER_API_KEY,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          suspended:
            parsed.suspended,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      }
    );

    const result: unknown = await response
      .json()
      .catch(() => null);

    if (
      !response.ok ||
      !isRecord(result)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not update storefront access.",
        },
        {
          status:
            response.status >= 400 &&
            response.status < 500
              ? response.status
              : 502,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        suspended:
          result.storefront_suspended ===
          true,
      },
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    console.error(
      "Master storefront access failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not update storefront access.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
