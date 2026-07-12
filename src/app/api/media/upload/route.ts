import {
  NextResponse,
  type NextRequest,
} from "next/server";

import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

const INTERNAL_TOKEN =
  process.env.LETZ_INTERNAL_TOKEN || "";

const MAX_UPLOAD_BYTES =
  15 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const PRIVATE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
};

type JsonRecord = Record<string, unknown>;
type MediaScope = "catalog" | "system";

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function inferScope(
  request: NextRequest,
  explicitScope: FormDataEntryValue | null
): MediaScope {
  const scope = String(
    explicitScope || ""
  )
    .trim()
    .toLowerCase();

  if (
    scope === "catalog" ||
    scope === "system"
  ) {
    return scope;
  }

  const referer =
    request.headers.get("referer") || "";

  try {
    const pathname =
      new URL(referer).pathname
        .toLowerCase();

    return (
      pathname.includes("/media") ||
      pathname.includes("/products") ||
      pathname.includes("/categories")
    )
      ? "catalog"
      : "system";
  } catch {
    return "system";
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    if (!INTERNAL_TOKEN) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Media service is not configured.",
        },
        {
          status: 500,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const form = await request
      .formData()
      .catch(() => null);

    const file = form?.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Select an image to upload.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    if (
      file.size <= 0 ||
      file.size > MAX_UPLOAD_BYTES
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Images must be 15 MB or smaller.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    if (
      !ALLOWED_MIME_TYPES.has(file.type)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Only JPG, PNG, WebP and GIF images are allowed.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const scope = inferScope(
      request,
      form?.get("scope") || null
    );

    const body = new FormData();

    body.append(
      "file",
      file,
      file.name.slice(0, 180)
    );

    body.append("scope", scope);
    body.append(
      "purpose",
      scope === "catalog"
        ? "product_or_category"
        : "site_design_or_internal"
    );

    const base = (
      await getWpBaseUrl()
    ).replace(/\/$/, "");

    const response = await fetch(
      `${base}/wp-json/letz/v1/media/upload`,
      {
        method: "POST",
        headers: {
          "X-Letz-Auth":
            INTERNAL_TOKEN,
          Accept: "application/json",
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      }
    );

    const parsed: unknown = await response
      .json()
      .catch(() => null);

    if (
      !response.ok ||
      !isRecord(parsed)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Media upload failed.",
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

    const id = Number(
      parsed.id ??
      parsed.image_id ??
      0
    );

    const url = String(
      parsed.url ??
      parsed.source_url ??
      parsed.image_url ??
      ""
    ).trim();

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !/^https?:\/\//i.test(url)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Media upload returned an invalid response.",
        },
        {
          status: 502,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const imageUrl =
      typeof parsed.image_url ===
      "string"
        ? parsed.image_url
        : url;

    const thumbnail =
      typeof parsed.thumbnail ===
      "string"
        ? parsed.thumbnail
        : imageUrl;

    return NextResponse.json(
      {
        id,
        url,
        source_url: url,
        image_url: imageUrl,
        thumbnail,
        scope,
        protected:
          parsed.protected === true ||
          scope === "system",
        item: isRecord(parsed.item)
          ? parsed.item
          : null,
      },
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    console.error(
      "Media upload failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Media upload failed.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
