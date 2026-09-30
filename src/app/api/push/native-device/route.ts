import {
  NextResponse,
} from "next/server";

import {
  fetchInternalWp,
} from "@/lib/wpClient";

export const dynamic =
  "force-dynamic";
export const runtime =
  "nodejs";

type JsonRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown
): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function privateJson(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, max-age=0",
      },
    }
  );
}

function normalizeToken(
  value: unknown
): string {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  const token =
    value.trim();

  if (
    token.length < 20 ||
    token.length > 4096 ||
    /[\s\x00-\x1F\x7F]/.test(
      token
    )
  ) {
    return "";
  }

  return token;
}

export async function POST(
  request: Request
) {
  const body: unknown =
    await request
      .json()
      .catch(() => null);

  if (!isRecord(body)) {
    return privateJson(
      {
        error:
          "Invalid native notification payload.",
      },
      400
    );
  }

  const token =
    normalizeToken(
      body.token
    );

  if (!token) {
    return privateJson(
      {
        error:
          "Invalid notification token.",
      },
      400
    );
  }

  if (
    process.env.VERCEL_ENV !==
    "production"
  ) {
    return privateJson({
      ok: true,
      enabled: true,
      preview: true,
    });
  }

  try {
    const response =
      await fetchInternalWp(
        "/wp-json/letz/v2/push/native-devices",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            token,
            platform:
              "android",
          }),
        }
      );

    const payload: unknown =
      await response
        .json()
        .catch(
          () => null
        );

    if (!response.ok) {
      return privateJson(
        {
          error:
            isRecord(payload) &&
            typeof payload.message ===
              "string"
              ? payload.message
              : "Unable to register this phone for notifications.",
        },
        response.status
      );
    }

    return privateJson({
      ok: true,
      enabled: true,
    });
  } catch {
    return privateJson(
      {
        error:
          "Unable to register this phone for notifications.",
      },
      502
    );
  }
}

export async function DELETE(
  request: Request
) {
  const body: unknown =
    await request
      .json()
      .catch(() => null);

  if (!isRecord(body)) {
    return privateJson(
      {
        error:
          "Invalid native notification payload.",
      },
      400
    );
  }

  const token =
    normalizeToken(
      body.token
    );

  if (!token) {
    return privateJson(
      {
        error:
          "Invalid notification token.",
      },
      400
    );
  }

  if (
    process.env.VERCEL_ENV !==
    "production"
  ) {
    return privateJson({
      ok: true,
      enabled: false,
      preview: true,
    });
  }

  try {
    const response =
      await fetchInternalWp(
        "/wp-json/letz/v2/push/native-devices",
        {
          method:
            "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              token,
              platform:
                "android",
            }),
        }
      );

    if (!response.ok) {
      return privateJson(
        {
          error:
            "Unable to disable notifications on this phone.",
        },
        response.status
      );
    }

    return privateJson({
      ok: true,
      enabled: false,
    });
  } catch {
    return privateJson(
      {
        error:
          "Unable to disable notifications on this phone.",
      },
      502
    );
  }
}
