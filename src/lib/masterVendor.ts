import {
  getMasterWpBaseUrl,
} from "@/lib/wpClient";

const MASTER_API_KEY =
  process.env.MASTER_API_KEY || "";

const UPSTREAM_TIMEOUT_MS = 15_000;

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

function normalizeBlogId(
  value: string
): number | null {
  const blogId = Number(value);

  return Number.isInteger(blogId) &&
    blogId > 0
    ? blogId
    : null;
}

function normalizeStoreUrl(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value.trim());

    if (
      (url.protocol !== "https:" &&
        url.protocol !== "http:") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function masterHeaders():
  Record<string, string> {
  if (!MASTER_API_KEY) {
    throw new Error(
      "Master vendor service is not configured."
    );
  }

  return {
    Accept: "application/json",
    Authorization:
      `Bearer ${MASTER_API_KEY}`,
    "X-Letz-Master-Key":
      MASTER_API_KEY,
  };
}

export async function resolveMasterVendorStoreUrl(
  rawBlogId: string
): Promise<string> {
  const blogId = normalizeBlogId(rawBlogId);

  if (!blogId) {
    throw new Error(
      "Invalid vendor blog ID."
    );
  }

  const masterBase = (
    await getMasterWpBaseUrl()
  ).replace(/\/$/, "");

  const response = await fetch(
    `${masterBase}/wp-json/letz/v1/master-vendors/${blogId}`,
    {
      method: "GET",
      headers: masterHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(
        UPSTREAM_TIMEOUT_MS
      ),
    }
  );

  if (!response.ok) {
    console.error(
      `Master vendor lookup failed with status ${response.status}.`
    );

    throw new Error(
      "Could not resolve the vendor store."
    );
  }

  const payload: unknown =
    await response.json();

  if (!isRecord(payload)) {
    throw new Error(
      "Master vendor response is invalid."
    );
  }

  const site = isRecord(payload.site)
    ? payload.site
    : {};

  const storeUrl = normalizeStoreUrl(
    site.url
  );

  if (!storeUrl) {
    throw new Error(
      "Vendor store URL is invalid."
    );
  }

  return storeUrl;
}