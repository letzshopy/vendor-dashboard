import { NextResponse } from "next/server";

import { fetchInternalWp } from "@/lib/wpClient";

const WORDPRESS_PATH =
  "/wp-json/letz/v1/shipment-fulfillment";
const MAX_REQUEST_BYTES = 32_768;
const UPSTREAM_TIMEOUT_MS = 20_000;

type JsonRecord = Record<string, unknown>;

type ShipmentFulfillmentSettings = {
  mode: "shift" | "self";
  pickup: {
    name: string;
    phone: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
  };
};

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function boundedText(
  value: unknown,
  maxLength: number
): string {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function normalizeSettings(
  value: unknown
): ShipmentFulfillmentSettings {
  const root = isRecord(value) ? value : {};
  const pickup = isRecord(root.pickup)
    ? root.pickup
    : {};

  return {
    mode:
      root.mode === "shift"
        ? "shift"
        : "self",
    pickup: {
      name: boundedText(pickup.name, 160),
      phone: boundedText(
        pickup.phone,
        40
      ),
      address1: boundedText(
        pickup.address1,
        300
      ),
      address2: boundedText(
        pickup.address2,
        300
      ),
      city: boundedText(
        pickup.city,
        120
      ),
      state: boundedText(
        pickup.state,
        120
      ),
      postcode: boundedText(
        pickup.postcode,
        20
      ),
    },
  };
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
  return response
    .json()
    .catch(() => null);
}

export async function GET() {
  try {
    const response = await fetchInternalWp(
      WORDPRESS_PATH,
      { method: "GET" },
      UPSTREAM_TIMEOUT_MS
    );

    const payload =
      await readJson(response);

    if (
      !response.ok ||
      !isRecord(payload)
    ) {
      console.error(
        `Shipment fulfilment load failed with status ${response.status}.`
      );

      return privateJson(
        {
          error:
            "Failed to load shipment fulfilment settings.",
        },
        502
      );
    }

    return privateJson(
      normalizeSettings(payload)
    );
  } catch (error: unknown) {
    console.error(
      "Shipment fulfilment load failed:",
      error instanceof Error
        ? error.message
        : "Unknown fulfilment error"
    );

    return privateJson(
      {
        error:
          "Failed to load shipment fulfilment settings.",
      },
      502
    );
  }
}

export async function PUT(
  request: Request
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
          "Invalid shipment fulfilment request.",
      },
      400
    );
  }

  let payload: unknown;

  try {
    const text = await request.text();

    if (
      !text ||
      Buffer.byteLength(text, "utf8") >
        MAX_REQUEST_BYTES
    ) {
      throw new Error("Invalid body size");
    }

    payload = JSON.parse(text) as unknown;
  } catch {
    return privateJson(
      {
        error:
          "Invalid shipment fulfilment request.",
      },
      400
    );
  }

  if (!isRecord(payload)) {
    return privateJson(
      {
        error:
          "Invalid shipment fulfilment request.",
      },
      400
    );
  }

  const settings =
    normalizeSettings(payload);

  if (
    settings.mode === "shift" &&
    (!settings.pickup.name ||
      !settings.pickup.phone ||
      !settings.pickup.address1 ||
      !settings.pickup.city ||
      !settings.pickup.state ||
      !settings.pickup.postcode)
  ) {
    return privateJson(
      {
        error:
          "Complete the pickup address before enabling Shift fulfilment.",
      },
      400
    );
  }

  try {
    const response = await fetchInternalWp(
      WORDPRESS_PATH,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(settings),
      },
      UPSTREAM_TIMEOUT_MS
    );

    const responsePayload =
      await readJson(response);

    if (
      !response.ok ||
      !isRecord(responsePayload)
    ) {
      console.error(
        `Shipment fulfilment save failed with status ${response.status}.`
      );

      const validation =
        response.status === 400 ||
        response.status === 422;

      return privateJson(
        {
          error: validation
            ? "Invalid shipment fulfilment settings."
            : "Failed to save shipment fulfilment settings.",
        },
        validation
          ? response.status
          : 502
      );
    }

    return privateJson(
      normalizeSettings(
        responsePayload
      )
    );
  } catch (error: unknown) {
    console.error(
      "Shipment fulfilment save failed:",
      error instanceof Error
        ? error.message
        : "Unknown fulfilment error"
    );

    return privateJson(
      {
        error:
          "Failed to save shipment fulfilment settings.",
      },
      502
    );
  }
}
