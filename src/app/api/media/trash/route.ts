import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  getStoreInternalAuthHeader,
  getWpBaseUrl,
} from "@/lib/wpClient";

export const dynamic =
  "force-dynamic";

const PRIVATE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
};

type JsonRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown
): value is JsonRecord {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
  );
}

function cleanIds(
  value: unknown
): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(Number)
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0
        )
    )
  ).slice(0, 100);
}

async function storeFetch(
  path: string,
  init: RequestInit
) {
  const base = (
    await getWpBaseUrl()
  ).replace(/\/$/, "");

  return fetch(
    `${base}/wp-json/letz/v1/${path}`,
    {
      ...init,
      headers: {
        ...(await getStoreInternalAuthHeader()),
        Accept:
          "application/json",
        ...(init.headers ||
          {}),
      },
      cache: "no-store",
      signal:
        AbortSignal.timeout(
          20_000
        ),
    }
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const params =
      new URLSearchParams({
        per_page: "100",
      });

    const query =
      request.nextUrl.searchParams
        .get("q")
        ?.trim()
        .slice(0, 120) ||
      "";

    const type =
      request.nextUrl.searchParams
        .get("type")
        ?.trim()
        .toLowerCase() ||
      "all";

    if (query) {
      params.set(
        "q",
        query
      );
    }

    if (
      type !== "all"
    ) {
      params.set(
        "type",
        type
      );
    }

    const response =
      await storeFetch(
        `media/trash-list?${params.toString()}`,
        {
          method:
            "GET",
        }
      );

    const parsed: unknown =
      await response
        .json()
        .catch(
          () => null
        );

    if (
      !response.ok ||
      !isRecord(parsed)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not load media trash.",
        },
        {
          status:
            response.status >=
              400 &&
            response.status <
              500
              ? response.status
              : 502,
          headers:
            PRIVATE_HEADERS,
        }
      );
    }

    return NextResponse.json(
      {
        items:
          Array.isArray(
            parsed.items
          )
            ? parsed.items
            : [],
      },
      {
        status: 200,
        headers:
          PRIVATE_HEADERS,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Media trash list failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not load media trash.",
      },
      {
        status: 500,
        headers:
          PRIVATE_HEADERS,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body: unknown =
      await request
        .json()
        .catch(
          () => null
        );

    if (!isRecord(body)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid trash request.",
        },
        {
          status: 400,
          headers:
            PRIVATE_HEADERS,
        }
      );
    }

    const action =
      String(
        body.action ||
          ""
      )
        .trim()
        .toLowerCase();

    const ids =
      cleanIds(
        body.ids
      );

    if (
      ![
        "restore",
        "delete",
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid trash action.",
        },
        {
          status: 400,
          headers:
            PRIVATE_HEADERS,
        }
      );
    }

    if (!ids.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "At least one valid media ID is required.",
        },
        {
          status: 400,
          headers:
            PRIVATE_HEADERS,
        }
      );
    }

    const endpoint =
      action ===
      "restore"
        ? "media/restore-trash"
        : "media/delete-trash";

    const response =
      await storeFetch(
        endpoint,
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              ids,
            }),
        }
      );

    const parsed: unknown =
      await response
        .json()
        .catch(
          () => null
        );

    if (
      !response.ok ||
      !isRecord(parsed)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            action ===
            "restore"
              ? "Could not restore media."
              : "Could not permanently delete media.",
        },
        {
          status:
            response.status >=
              400 &&
            response.status <
              500
              ? response.status
              : 502,
          headers:
            PRIVATE_HEADERS,
        }
      );
    }

    const skipped =
      Array.isArray(
        parsed.skipped
      )
        ? parsed.skipped
        : [];

    if (skipped.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            action ===
            "restore"
              ? "Some media could not be restored."
              : "Some media could not be deleted.",
          ...parsed,
        },
        {
          status: 409,
          headers:
            PRIVATE_HEADERS,
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        ...parsed,
      },
      {
        status: 200,
        headers:
          PRIVATE_HEADERS,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Media trash action failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Media trash action failed.",
      },
      {
        status: 500,
        headers:
          PRIVATE_HEADERS,
      }
    );
  }
}
