import {
  NextRequest,
  NextResponse,
} from "next/server";

import { fetchInternalWp } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 262_144;

type JsonRecord = Record<string, unknown>;

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function privateJson(
  body: unknown,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
    },
  });
}

function boundedQueryValue(
  value: string | null,
  maxLength: number
): string {
  return (value || "")
    .trim()
    .slice(0, maxLength);
}

async function responseJson(
  response: Response
): Promise<unknown> {
  return response
    .json()
    .catch(() => null);
}

export async function GET(
  request: NextRequest
) {
  try {
    const query = new URLSearchParams();
    const source =
      request.nextUrl.searchParams;

    for (const key of [
      "location",
      "location_label",
      "menu_name",
    ]) {
      const value = boundedQueryValue(
        source.get(key),
        160
      );

      if (value) {
        query.set(key, value);
      }
    }

    const rawMenuId =
      boundedQueryValue(
        source.get("menu_id"),
        20
      );

    if (/^\d+$/.test(rawMenuId)) {
      query.set("menu_id", rawMenuId);
    }

    const suffix = query.toString();
    const path =
      "/wp-json/letzshopy/v1/menu" +
      (suffix ? `?${suffix}` : "");

    const response = await fetchInternalWp(
      path,
      { method: "GET" }
    );

    const payload =
      await responseJson(response);

    if (
      !response.ok ||
      !isRecord(payload)
    ) {
      console.error(
        `Menu load request failed with status ${response.status}.`
      );

      return privateJson(
        {
          error:
            "Failed to load store menu.",
        },
        502
      );
    }

    return privateJson(payload);
  } catch (error: unknown) {
    console.error(
      "Menu load proxy failed:",
      error instanceof Error
        ? error.message
        : "Unknown menu error"
    );

    return privateJson(
      {
        error:
          "Failed to load store menu.",
      },
      502
    );
  }
}

export async function POST(
  request: NextRequest
) {
  const contentLength = Number(
    request.headers.get("content-length") ||
      "0"
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_REQUEST_BYTES
  ) {
    return privateJson(
      {
        error:
          "Invalid menu update request.",
      },
      400
    );
  }

  let body: unknown;

  try {
    const text = await request.text();

    if (
      !text ||
      Buffer.byteLength(text, "utf8") >
        MAX_REQUEST_BYTES
    ) {
      throw new Error("Invalid body size");
    }

    body = JSON.parse(text) as unknown;
  } catch {
    return privateJson(
      {
        error:
          "Invalid menu update request.",
      },
      400
    );
  }

  if (!isRecord(body)) {
    return privateJson(
      {
        error:
          "Invalid menu update request.",
      },
      400
    );
  }

  try {
    const response = await fetchInternalWp(
      "/wp-json/letzshopy/v1/menu",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const payload =
      await responseJson(response);

    if (
      !response.ok ||
      !isRecord(payload)
    ) {
      console.error(
        `Menu save request failed with status ${response.status}.`
      );

      const validation =
        response.status === 400 ||
        response.status === 422;

      return privateJson(
        {
          error: validation
            ? "Invalid menu settings."
            : "Failed to save store menu.",
        },
        validation
          ? response.status
          : 502
      );
    }

    return privateJson(payload);
  } catch (error: unknown) {
    console.error(
      "Menu save proxy failed:",
      error instanceof Error
        ? error.message
        : "Unknown menu error"
    );

    return privateJson(
      {
        error:
          "Failed to save store menu.",
      },
      502
    );
  }
}
