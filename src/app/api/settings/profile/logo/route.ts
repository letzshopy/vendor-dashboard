import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import { getTenantFromCookies } from "@/lib/tenant";
import { proxySettingsGet } from "@/lib/settingsProxy";

const WORDPRESS_PATH =
  "/wp-json/letz/v1/profile-settings";

const MAX_LOGO_BYTES =
  5 * 1024 * 1024;

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

function normalizeHost(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function errorResponse(
  message: string,
  status: number
) {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control":
          "no-store, private",
      },
    }
  );
}

export async function GET() {
  const storeFeatureError = await requireStoreFeature("profile");
  if (storeFeatureError) return storeFeatureError;

  const tenant =
    await getTenantFromCookies();

  if (!tenant) {
    return errorResponse(
      "Unauthorized.",
      401
    );
  }

  const profileResponse =
    await proxySettingsGet(
      WORDPRESS_PATH,
      "profile settings"
    );

  if (!profileResponse.ok) {
    return errorResponse(
      "Store logo could not be loaded.",
      502
    );
  }

  const profile: unknown =
    await profileResponse
      .json()
      .catch(() => null);

  if (!isRecord(profile)) {
    return errorResponse(
      "Store logo is not configured.",
      404
    );
  }

  const business =
    isRecord(profile.business)
      ? profile.business
      : {};

  const logoValue =
    typeof business.logoUrl ===
    "string"
      ? business.logoUrl.trim()
      : "";

  if (!logoValue) {
    return errorResponse(
      "Store logo is not configured.",
      404
    );
  }

  let logoUrl: URL;
  let storeUrl: URL;

  try {
    logoUrl = new URL(logoValue);
    storeUrl = new URL(
      tenant.store_url
    );
  } catch {
    return errorResponse(
      "Store logo URL is invalid.",
      400
    );
  }

  if (
    !["http:", "https:"].includes(
      logoUrl.protocol
    )
  ) {
    return errorResponse(
      "Store logo URL is not allowed.",
      400
    );
  }

  if (
    normalizeHost(
      logoUrl.hostname
    ) !==
    normalizeHost(
      storeUrl.hostname
    )
  ) {
    return errorResponse(
      "Store logo host is not allowed.",
      400
    );
  }

  let upstream: Response;

  try {
    upstream = await fetch(
      logoUrl.toString(),
      {
        cache: "no-store",
        redirect: "manual",
      }
    );
  } catch {
    return errorResponse(
      "Store logo could not be loaded.",
      502
    );
  }

  if (
    upstream.status >= 300 &&
    upstream.status < 400
  ) {
    return errorResponse(
      "Store logo redirect is not allowed.",
      502
    );
  }

  if (!upstream.ok) {
    return errorResponse(
      "Store logo could not be loaded.",
      502
    );
  }

  const contentType =
    (
      upstream.headers.get(
        "content-type"
      ) || ""
    )
      .split(";")[0]
      .trim()
      .toLowerCase();

  if (
    !contentType.startsWith(
      "image/"
    )
  ) {
    return errorResponse(
      "Store logo response is not an image.",
      502
    );
  }

  const bytes =
    await upstream.arrayBuffer();

  if (
    bytes.byteLength === 0 ||
    bytes.byteLength >
      MAX_LOGO_BYTES
  ) {
    return errorResponse(
      "Store logo file size is invalid.",
      502
    );
  }

  return new Response(
    bytes,
    {
      status: 200,
      headers: {
        "Content-Type":
          contentType,
        "Cache-Control":
          "private, max-age=300",
        "X-Content-Type-Options":
          "nosniff",
      },
    }
  );
}
