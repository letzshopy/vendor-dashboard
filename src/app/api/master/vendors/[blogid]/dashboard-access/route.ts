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

function validBlogId(
  value: string
): number | null {
  const blogId = Number(value);

  return Number.isInteger(blogId) &&
    blogId > 0
    ? blogId
    : null;
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
            "Master access service is not configured.",
        },
        {
          status: 500,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const { blogid: rawBlogId } =
      await context.params;

    const blogId =
      validBlogId(rawBlogId);

    if (!blogId) {
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

    const parsedBody: unknown = await request
      .json()
      .catch(() => null);

    if (
      !isRecord(parsedBody) ||
      typeof parsedBody.locked !==
        "boolean"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A boolean locked value is required.",
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
      `${base}/wp-json/letz/v1/master-vendors/${blogId}/dashboard-access`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization:
            `Bearer ${MASTER_API_KEY}`,
          "X-Letz-Master-Key":
            MASTER_API_KEY,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          locked: parsedBody.locked,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      }
    );

    const parsed: unknown = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not update dashboard access.",
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
        locked: parsedBody.locked,
        dashboardAccess:
          isRecord(parsed)
            ? parsed
            : null,
      },
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    console.error(
      "Master dashboard access update failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not update dashboard access.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
