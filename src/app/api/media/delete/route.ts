import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  findAuthorizedStore,
  verifySessionToken,
  type SessionStore,
} from "@/lib/session";

export const dynamic = "force-dynamic";

const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

const TENANT_COOKIE_NAME =
  process.env.TENANT_COOKIE_NAME || "ls_tenant";

const SESSION_SIGNING_SECRET =
  process.env.DASHBOARD_SECRET || "";

const INTERNAL_TOKEN =
  process.env.LETZ_INTERNAL_TOKEN || "";

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

function privateJson(
  body: JsonRecord,
  status: number
) {
  return NextResponse.json(body, {
    status,
    headers: PRIVATE_HEADERS,
  });
}

function parseTenantCookie(
  rawValue: string | undefined
): {
  blog_id?: unknown;
  store_url?: unknown;
} | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      decodeURIComponent(rawValue)
    );

    if (!isRecord(parsed)) {
      return null;
    }

    return {
      blog_id: parsed.blog_id,
      store_url: parsed.store_url,
    };
  } catch {
    return null;
  }
}

async function authorizedStore(
  request: NextRequest
): Promise<
  | { ok: true; store: SessionStore }
  | { ok: false; response: NextResponse }
> {
  if (!SESSION_SIGNING_SECRET) {
    return {
      ok: false,
      response: privateJson(
        {
          ok: false,
          error: "Dashboard authentication is not configured.",
        },
        500
      ),
    };
  }

  const token =
    request.cookies.get(AUTH_COOKIE_NAME)?.value || "";

  const session = await verifySessionToken(
    token,
    SESSION_SIGNING_SECRET
  );

  if (!session) {
    return {
      ok: false,
      response: privateJson(
        {
          ok: false,
          error: "Authentication required.",
        },
        401
      ),
    };
  }

  const tenant = parseTenantCookie(
    request.cookies.get(TENANT_COOKIE_NAME)?.value
  );

  const store = tenant
    ? findAuthorizedStore(session, tenant)
    : null;

  if (!store) {
    return {
      ok: false,
      response: privateJson(
        {
          ok: false,
          error: "Select an authorized store.",
        },
        403
      ),
    };
  }

  return {
    ok: true,
    store,
  };
}

function cleanIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(Number)
        .filter(
          (id) => Number.isInteger(id) && id > 0
        )
    )
  ).slice(0, 100);
}

async function deleteCatalogMedia(
  storeUrl: string,
  ids: number[]
): Promise<{
  response: Response;
  result: JsonRecord | null;
}> {
  const response = await fetch(
    `${storeUrl.replace(/\/$/, "")}/wp-json/letz/v1/media/delete-catalog`,
    {
      method: "POST",
      headers: {
        "X-Letz-Auth": INTERNAL_TOKEN,
        "Content-Type": "application/json",
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
    result: isRecord(parsed) ? parsed : null,
  };
}

function arrayField(
  result: JsonRecord,
  field: "deleted" | "skipped"
) {
  return Array.isArray(result[field])
    ? result[field]
    : [];
}

async function handleDelete(
  request: NextRequest,
  ids: number[]
) {
  if (!INTERNAL_TOKEN) {
    return privateJson(
      {
        ok: false,
        error: "Media service is not configured.",
      },
      500
    );
  }

  const authorization = await authorizedStore(request);

  if (!authorization.ok) {
    return authorization.response;
  }

  const { response, result } =
    await deleteCatalogMedia(
      authorization.store.store_url,
      ids
    );

  if (!response.ok || !result) {
    return privateJson(
      {
        ok: false,
        error: "Media deletion failed.",
      },
      response.status >= 400 && response.status < 500
        ? response.status
        : 502
    );
  }

  const deleted = arrayField(result, "deleted");
  const skipped = arrayField(result, "skipped");

  if (skipped.length > 0) {
    return privateJson(
      {
        ok: false,
        error: "Protected media cannot be deleted.",
        deleted,
        skipped,
      },
      409
    );
  }

  return privateJson(
    {
      ok: true,
      deleted,
    },
    200
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const parsed: unknown = await request
      .json()
      .catch(() => null);

    const ids = isRecord(parsed)
      ? cleanIds(parsed.ids)
      : [];

    if (ids.length === 0) {
      return privateJson(
        {
          ok: false,
          error: "At least one valid media ID is required.",
        },
        400
      );
    }

    return await handleDelete(request, ids);
  } catch (error: unknown) {
    console.error(
      "Bulk media deletion failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return privateJson(
      {
        ok: false,
        error: "Media deletion failed.",
      },
      500
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const id = Number(
      request.nextUrl.searchParams.get("id")
    );

    if (!Number.isInteger(id) || id <= 0) {
      return privateJson(
        {
          ok: false,
          error: "Invalid media ID.",
        },
        400
      );
    }

    return await handleDelete(request, [id]);
  } catch (error: unknown) {
    console.error(
      "Media deletion failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return privateJson(
      {
        ok: false,
        error: "Media deletion failed.",
      },
      500
    );
  }
}
