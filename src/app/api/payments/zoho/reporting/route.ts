import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import { fetchInternalWp } from "@/lib/wpClient";
import { privateJson } from "@/lib/orderPolicy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UPSTREAM_TIMEOUT_MS = 20_000;

type JsonRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function boundedString(
  value: unknown,
  maxLength: number
): string {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

async function proxy(
  path: string,
  method: "GET" | "POST"
) {
  const response =
    await fetchInternalWp(
      path,
      {
        method,
        headers: {
          "Cache-Control":
            "no-cache, no-store, max-age=0",
          Pragma: "no-cache",
        },
        cache: "no-store",
      },
      UPSTREAM_TIMEOUT_MS
    );

  const payload: unknown =
    await response
      .json()
      .catch(() => null);

  if (
    !response.ok ||
    !isRecord(payload)
  ) {
    return privateJson(
      {
        ok: false,
        error:
          response.status === 409
            ? "Zoho settlement reporting is not ready for this store."
            : "Unable to update Zoho settlement reporting.",
      },
      response.status === 400 ||
        response.status === 401 ||
        response.status === 403 ||
        response.status === 409
        ? response.status
        : 502
    );
  }

  return privateJson(payload);
}

export async function GET() {
  const storeFeatureError =
    await requireStoreFeature("payments");

  if (storeFeatureError) {
    return storeFeatureError;
  }

  const response =
    await fetchInternalWp(
      "/wp-json/letz/v2/payments/zoho/reporting/status",
      {
        method: "GET",
        cache: "no-store",
      },
      UPSTREAM_TIMEOUT_MS
    );

  const payload: unknown =
    await response
      .json()
      .catch(() => null);

  if (
    !response.ok ||
    !isRecord(payload)
  ) {
    return privateJson(
      {
        ok: false,
        connected: false,
        callbackUrl: "",
        error:
          "Unable to read Zoho settlement reporting status.",
      },
      response.status === 409
        ? 409
        : 502
    );
  }

  return privateJson({
    ok: true,
    connected:
      payload.connected === true,
    connectedAt:
      Number(payload.connected_at) ||
      0,
    callbackUrl: boundedString(
      payload.callback_url,
      2_048
    ),
  });
}

export async function POST() {
  const storeFeatureError =
    await requireStoreFeature("payments");

  if (storeFeatureError) {
    return storeFeatureError;
  }

  const response =
    await fetchInternalWp(
      "/wp-json/letz/v2/payments/zoho/reporting/connect",
      {
        method: "POST",
        cache: "no-store",
      },
      UPSTREAM_TIMEOUT_MS
    );

  const payload: unknown =
    await response
      .json()
      .catch(() => null);

  if (
    !response.ok ||
    !isRecord(payload)
  ) {
    return privateJson(
      {
        ok: false,
        error:
          "Unable to start Zoho settlement reporting authorization.",
      },
      response.status === 409
        ? 409
        : 502
    );
  }

  const authorizationUrl =
    boundedString(
      payload.authorization_url,
      4_096
    );

  if (!authorizationUrl) {
    return privateJson(
      {
        ok: false,
        error:
          "Zoho authorization URL is unavailable.",
      },
      502
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(
      authorizationUrl
    );
  } catch {
    return privateJson(
      {
        ok: false,
        error:
          "Zoho authorization URL is invalid.",
      },
      502
    );
  }

  if (
    parsed.protocol !== "https:" ||
    !/^accounts\.zoho\.(in|com)$/i.test(
      parsed.hostname
    )
  ) {
    return privateJson(
      {
        ok: false,
        error:
          "Zoho authorization URL failed validation.",
      },
      502
    );
  }

  return privateJson({
    ok: true,
    authorizationUrl,
    callbackUrl: boundedString(
      payload.callback_url,
      2_048
    ),
  });
}

export async function DELETE() {
  const storeFeatureError =
    await requireStoreFeature("payments");

  if (storeFeatureError) {
    return storeFeatureError;
  }

  return proxy(
    "/wp-json/letz/v2/payments/zoho/reporting/disconnect",
    "POST"
  );
}
