import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  getStoreInternalAuthHeader,
  getWpBaseUrl,
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

export async function GET(
  request: NextRequest
) {
  try {
    const idValue =
      request.nextUrl.searchParams
        .get("id")
        ?.trim() || "";

    const query =
      request.nextUrl.searchParams
        .get("q")
        ?.trim()
        .slice(0, 120) || "";

    const type =
      request.nextUrl.searchParams
        .get("type")
        ?.trim()
        .toLowerCase() || "all";

    if (
      idValue &&
      (
        !/^\d+$/.test(idValue) ||
        Number(idValue) <= 0
      )
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

    if (
      ![
        "all",
        "image",
        "video",
        "audio",
        "doc",
        "application",
      ].includes(type)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid media filter.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const params =
      new URLSearchParams({
        per_page: "100",
      });

    if (idValue) {
      params.set("id", idValue);
    }

    if (query) {
      params.set("q", query);
    }

    if (type !== "all") {
      params.set("type", type);
    }

    const base = (
      await getWpBaseUrl()
    ).replace(/\/$/, "");

    const response = await fetch(
      `${base}/wp-json/letz/v1/media/catalog-list?${params.toString()}`,
      {
        headers: {
          ...(await getStoreInternalAuthHeader()),
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      }
    );

    const parsed: unknown = await response
      .json()
      .catch(() => null);

    if (
      !response.ok ||
      !isRecord(parsed)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not load media.",
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
        items: Array.isArray(
          parsed.items
        )
          ? parsed.items
          : [],
      },
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    console.error(
      "Media list failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Could not load media.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
