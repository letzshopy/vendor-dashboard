import { NextResponse } from "next/server";

import { fetchInternalWp } from "@/lib/wpClient";

const MAX_SETTINGS_BYTES = 262_144;
const UPSTREAM_TIMEOUT_MS = 20_000;

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
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

async function readJson(
  response: Response
): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function validationMessage(
  payload: unknown,
  fallback: string
): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  for (const key of ["message", "error"]) {
    const value = payload[key];

    if (typeof value === "string") {
      const message = value.trim();

      if (message) {
        return message.slice(0, 300);
      }
    }
  }

  return fallback;
}

function isValidationStatus(
  status: number
): boolean {
  return status === 400 || status === 422;
}

export async function proxySettingsGet(
  path: string,
  label: string
): Promise<NextResponse> {
  try {
    const response = await fetchInternalWp(
      path,
      { method: "GET" },
      UPSTREAM_TIMEOUT_MS
    );

    const payload = await readJson(response);

    if (!response.ok || payload === null) {
      console.error(
        `${label} load failed with status ${response.status}.`
      );

      return privateJson(
        { error: `Failed to load ${label}.` },
        502
      );
    }

    return privateJson(payload);
  } catch (error: unknown) {
    console.error(
      `${label} load failed:`,
      error instanceof Error
        ? error.message
        : "Unknown settings error"
    );

    return privateJson(
      { error: `Failed to load ${label}.` },
      502
    );
  }
}

export async function proxySettingsPatch(
  request: Request,
  path: string,
  label: string
): Promise<NextResponse> {
  const contentLength = Number(
    request.headers.get("content-length") || "0"
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_SETTINGS_BYTES
  ) {
    return privateJson(
      { error: `Invalid ${label} request.` },
      400
    );
  }

  let payload: unknown;

  try {
    const text = await request.text();

    if (
      !text ||
      Buffer.byteLength(text, "utf8") >
        MAX_SETTINGS_BYTES
    ) {
      throw new Error("Invalid body size");
    }

    payload = JSON.parse(text) as unknown;
  } catch {
    return privateJson(
      { error: `Invalid ${label} request.` },
      400
    );
  }

  if (!isRecord(payload)) {
    return privateJson(
      { error: `Invalid ${label} request.` },
      400
    );
  }

  try {
    const response = await fetchInternalWp(
      path,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      UPSTREAM_TIMEOUT_MS
    );

    const responsePayload =
      await readJson(response);

    if (!response.ok || responsePayload === null) {
      console.error(
        `${label} save failed with status ${response.status}.`
      );

      const validation =
        isValidationStatus(response.status);

      return privateJson(
        {
          error: validation
            ? validationMessage(
                responsePayload,
                `Invalid ${label} settings.`
              )
            : `Failed to save ${label}.`,
        },
        validation ? response.status : 502
      );
    }

    return privateJson(responsePayload);
  } catch (error: unknown) {
    console.error(
      `${label} save failed:`,
      error instanceof Error
        ? error.message
        : "Unknown settings error"
    );

    return privateJson(
      { error: `Failed to save ${label}.` },
      502
    );
  }
}
