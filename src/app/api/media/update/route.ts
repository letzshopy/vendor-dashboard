import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  getWpBaseUrl,
  wpAuthHeader,
} from "@/lib/wpClient";

export const dynamic = "force-dynamic";

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

export async function PATCH(
  request: NextRequest
) {
  try {
    const parsed: unknown = await request
      .json()
      .catch(() => null);

    if (!isRecord(parsed)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid media update.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const id = Number(parsed.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid media ID.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const title =
      typeof parsed.title === "string"
        ? parsed.title.trim().slice(0, 180)
        : "";

    const slug =
      typeof parsed.slug === "string"
        ? parsed.slug.trim().slice(0, 180)
        : "";

    if (!title && !slug) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Title or slug is required.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const base = (
      await getWpBaseUrl()
    ).replace(/\/$/, "");

    const response = await fetch(
      `${base}/wp-json/letz/v1/media/catalog/${id}`,
      {
        method: "PATCH",
        headers: {
          ...wpAuthHeader(),
          "Content-Type":
            "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          title,
          slug,
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
            "Media update failed.",
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
        item: isRecord(result.item)
          ? result.item
          : result,
      },
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    console.error(
      "Media update failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Media update failed.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
