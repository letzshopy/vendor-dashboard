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

async function deleteCatalogMedia(
  base: string,
  ids: number[]
): Promise<{
  response: Response;
  result: JsonRecord | null;
}> {
  const response = await fetch(
    `${base}/wp-json/letz/v1/media/delete-catalog`,
    {
      method: "POST",
      headers: {
        ...wpAuthHeader(),
        "Content-Type":
          "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ ids }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    }
  );

  const parsed: unknown = await response
    .json()
    .catch(() => null);

  return {
    response,
    result: isRecord(parsed)
      ? parsed
      : null,
  };
}

function deletedFrom(
  result: JsonRecord | null
): unknown[] {
  return result &&
    Array.isArray(result.deleted)
    ? result.deleted
    : [];
}

function skippedFrom(
  result: JsonRecord | null
): unknown[] {
  return result &&
    Array.isArray(result.skipped)
    ? result.skipped
    : [];
}

async function handleDelete(
  ids: number[]
) {
  const base = (
    await getWpBaseUrl()
  ).replace(/\/$/, "");

  const { response, result } =
    await deleteCatalogMedia(
      base,
      ids
    );

  if (!response.ok || !result) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Media deletion failed.",
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

  const skipped = skippedFrom(result);

  if (skipped.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Protected media cannot be deleted.",
        deleted:
          deletedFrom(result),
        skipped,
      },
      {
        status: 409,
        headers: PRIVATE_HEADERS,
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      deleted: deletedFrom(result),
    },
    {
      status: 200,
      headers: PRIVATE_HEADERS,
    }
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const parsed: unknown = await request
      .json()
      .catch(() => null);

    const ids =
      isRecord(parsed)
        ? cleanIds(parsed.ids)
        : [];

    if (ids.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "At least one valid media ID is required.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    return await handleDelete(ids);
  } catch (error: unknown) {
    console.error(
      "Bulk media deletion failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Media deletion failed.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const id = Number(
      request.nextUrl.searchParams.get(
        "id"
      )
    );

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

    return await handleDelete([id]);
  } catch (error: unknown) {
    console.error(
      "Media deletion failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Media deletion failed.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
