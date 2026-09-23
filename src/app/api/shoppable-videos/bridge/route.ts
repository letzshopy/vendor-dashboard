import { NextRequest, NextResponse } from "next/server";
import { fetchInternalWp } from "@/lib/wpClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

const PATHS = {
  status: "/wp-json/letz/v2/shoppable/status",
  products: "/wp-json/letz/v2/shoppable/products",
  categories: "/wp-json/letz/v2/shoppable/categories",
} as const;

const ACTIONS = {
  ticket: {
    path: "/wp-json/letz/v2/shoppable/upload-ticket",
    method: "POST",
  },
  publish: {
    path: "/wp-json/letz/v2/shoppable/publish",
    method: "POST",
  },
  update: {
    path: "/wp-json/letz/v2/shoppable/update",
    method: "PUT",
  },
  adopt: {
    path: "/wp-json/letz/v2/shoppable/adopt-existing",
    method: "POST",
  },
  delete: {
    path: "/wp-json/letz/v2/shoppable/delete",
    method: "DELETE",
  },
} as const;

type BridgeType = keyof typeof PATHS;
type ActionType = keyof typeof ACTIONS;
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function errorMessage(value: unknown, fallback: string) {
  if (!isRecord(value)) return fallback;

  if (typeof value.message === "string" && value.message.trim()) {
    return value.message;
  }

  if (typeof value.error === "string" && value.error.trim()) {
    return value.error;
  }

  return fallback;
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "status";

  if (!(type in PATHS)) {
    return NextResponse.json(
      { ok: false, error: "Invalid shoppable video request." },
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  const query = (request.nextUrl.searchParams.get("q") || "")
    .trim()
    .slice(0, 100);

  const params = new URLSearchParams();

  if (query && type !== "status") {
    params.set("q", query);
  }

  const target = PATHS[type as BridgeType];
  const targetPath =
    params.size > 0
      ? `${target}?${params.toString()}`
      : target;

  try {
    const response = await fetchInternalWp(
      targetPath,
      {
        method: "GET",
        cache: "no-store",
      },
      15_000
    );

    const json: unknown = await response
      .json()
      .catch(() => null);

    if (!response.ok || !isRecord(json)) {
      return NextResponse.json(
        {
          ok: false,
          error: errorMessage(
            json,
            "Shoppable video bridge is not ready for this store."
          ),
        },
        {
          status: response.status === 404 ? 503 : response.status,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    return NextResponse.json(json, {
      status: 200,
      headers: PRIVATE_HEADERS,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to contact the store's shoppable video bridge.",
      },
      {
        status: 502,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  const body: unknown = await request
    .json()
    .catch(() => null);

  if (!isRecord(body) || typeof body.action !== "string") {
    return NextResponse.json(
      { ok: false, error: "Invalid shoppable video action." },
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  const action = body.action as ActionType;

  if (!(action in ACTIONS)) {
    return NextResponse.json(
      { ok: false, error: "Unsupported shoppable video action." },
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  const config = ACTIONS[action];
  const payload: JsonRecord = { ...body };

  delete payload.action;

  if (action === "publish") {
    const mediaId = Number(payload.media_id || 0);

    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Uploaded video is required." },
        { status: 400, headers: PRIVATE_HEADERS }
      );
    }

    payload.media_id = mediaId;
    payload.title =
      typeof payload.title === "string"
        ? payload.title.trim().slice(0, 180)
        : "";
    payload.product_ids = Array.isArray(payload.product_ids)
      ? payload.product_ids.slice(0, 20)
      : [];
    payload.category_ids = Array.isArray(payload.category_ids)
      ? payload.category_ids.slice(0, 10)
      : [];
  }

  if (action === "ticket") {
    payload.kind =
      payload.kind === "thumbnail"
        ? "thumbnail"
        : "video";
  }

  if (action === "update") {
    const storyId = Number(payload.story_id || 0);

    if (!Number.isInteger(storyId) || storyId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Story ID is required." },
        { status: 400, headers: PRIVATE_HEADERS }
      );
    }

    payload.story_id = storyId;
    payload.title =
      typeof payload.title === "string"
        ? payload.title.trim().slice(0, 180)
        : "";
    payload.product_ids = Array.isArray(payload.product_ids)
      ? payload.product_ids.slice(0, 20)
      : [];
    payload.category_ids = Array.isArray(payload.category_ids)
      ? payload.category_ids.slice(0, 10)
      : [];

    if ("replacement_media_id" in payload) {
      payload.replacement_media_id = Number(
        payload.replacement_media_id || 0
      );
    }

    if ("thumbnail_media_id" in payload) {
      payload.thumbnail_media_id = Number(
        payload.thumbnail_media_id || 0
      );
    }
  }

  if (action === "delete") {
    const storyId = Number(payload.story_id || 0);

    if (!Number.isInteger(storyId) || storyId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Story ID is required." },
        { status: 400, headers: PRIVATE_HEADERS }
      );
    }

    payload.story_id = storyId;
  }

  try {
    const response = await fetchInternalWp(
      config.path,
      {
        method: config.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
      action === "publish" ? 25_000 : 20_000
    );

    const json: unknown = await response
      .json()
      .catch(() => null);

    if (!response.ok || !isRecord(json)) {
      return NextResponse.json(
        {
          ok: false,
          error: errorMessage(
            json,
            "The shoppable video action could not be completed."
          ),
        },
        {
          status: response.status >= 400 ? response.status : 502,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    if (
      action === "adopt" &&
      process.env.VERCEL_ENV !== "production"
    ) {
      const adopted = Array.isArray(json.adopted)
        ? json.adopted.length
        : 0;
      const skipped = Array.isArray(json.skipped)
        ? json.skipped
        : [];

      console.info("shoppable-adopt-summary", {
        adopted,
        skipped,
      });
    }

    return NextResponse.json(json, {
      status: response.status,
      headers: PRIVATE_HEADERS,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to contact the store's shoppable video bridge.",
      },
      {
        status: 502,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
