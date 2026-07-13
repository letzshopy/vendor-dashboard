import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { NextResponse, type NextRequest } from "next/server";

import {
  isMediaPurpose,
  mediaScopeForPurpose,
  type MediaPurpose,
} from "@/lib/mediaPolicy";
import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INTERNAL_TOKEN = process.env.LETZ_INTERNAL_TOKEN || "";
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_REDIRECTS = 3;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
};

type JsonRecord = Record<string, unknown>;

type UploadInput = {
  file: File;
  purpose: MediaPurpose;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function inferLegacyPurpose(request: NextRequest): MediaPurpose {
  const referer = request.headers.get("referer") || "";

  try {
    const pathname = new URL(referer).pathname.toLowerCase();

    if (pathname.includes("/media")) return "media_library";
    if (pathname.includes("/products")) return "product_image";
  } catch {
    // Legacy callers without a valid referrer remain protected system media.
  }

  return "site_image";
}

function resolvePurpose(request: NextRequest, value: unknown): MediaPurpose {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  return isMediaPurpose(normalized)
    ? normalized
    : inferLegacyPurpose(request);
}

function validateFile(file: File): string | null {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return "Images must be 15 MB or smaller.";
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Only JPG, PNG, WebP and GIF images are allowed.";
  }

  return null;
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isPrivateAddress(address: string) {
  const version = isIP(address);
  const normalized = address.toLowerCase();

  if (version === 4) return isPrivateIpv4(address);

  if (version !== 6) return true;

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);

  return mapped ? isPrivateIpv4(mapped[1]) : false;
}

async function assertPublicImageUrl(value: string): Promise<URL> {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid HTTPS image URL.");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new Error("Only public HTTPS image URLs are allowed.");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "metadata.google.internal"
  ) {
    throw new Error("Private image URLs are not allowed.");
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error("Private image URLs are not allowed.");
    }

    return url;
  }

  const addresses = await lookup(hostname, {
    all: true,
    verbatim: true,
  });

  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateAddress(address))
  ) {
    throw new Error("Private image URLs are not allowed.");
  }

  return url;
}

function remoteFilename(url: URL, mime: string) {
  const raw = decodeURIComponent(
    url.pathname.split("/").pop() || "product-image",
  );

  const base = raw
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/\.[a-zA-Z0-9]+$/, "")
    .slice(0, 140);

  return `${base || "product-image"}.${MIME_EXTENSION[mime]}`;
}

async function readLimitedBody(response: Response) {
  if (!response.body) {
    throw new Error("The remote image returned no data.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    total += value.byteLength;

    if (total > MAX_UPLOAD_BYTES) {
      await reader.cancel();
      throw new Error("Remote images must be 15 MB or smaller.");
    }

    chunks.push(value);
  }

  if (total === 0) {
    throw new Error("The remote image is empty.");
  }

  const bytes = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

async function downloadRemoteImage(sourceUrl: string): Promise<File> {
  let current = await assertPublicImageUrl(sourceUrl);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(current, {
      headers: {
        Accept: "image/jpeg,image/png,image/webp,image/gif",
        "User-Agent": "LetzShopy-Media-Importer/1.0",
      },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");

      if (!location || redirect === MAX_REDIRECTS) {
        throw new Error("The image URL redirected too many times.");
      }

      current = await assertPublicImageUrl(
        new URL(location, current).toString(),
      );
      continue;
    }

    if (!response.ok) {
      throw new Error("Could not download the image from that URL.");
    }

    const declaredLength = Number(
      response.headers.get("content-length") || 0,
    );

    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_UPLOAD_BYTES
    ) {
      throw new Error("Remote images must be 15 MB or smaller.");
    }

    const mime = (response.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new Error(
        "The URL must point to a JPG, PNG, WebP or GIF image.",
      );
    }

    const bytes = await readLimitedBody(response);
    const arrayBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(arrayBuffer).set(bytes);

    return new File([arrayBuffer], remoteFilename(current, mime), {
      type: mime,
    });
  }

  throw new Error("Could not download the image.");
}

async function parseUploadInput(
  request: NextRequest,
): Promise<UploadInput> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const parsed: unknown = await request.json().catch(() => null);

    if (!isRecord(parsed)) {
      throw new Error("Invalid media import request.");
    }

    const sourceUrl = String(parsed.source_url || parsed.url || "").trim();

    if (!sourceUrl) {
      throw new Error("Enter an image URL.");
    }

    return {
      file: await downloadRemoteImage(sourceUrl),
      purpose: resolvePurpose(request, parsed.purpose),
    };
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    throw new Error("Select an image to upload.");
  }

  return {
    file,
    purpose: resolvePurpose(request, form?.get("purpose")),
  };
}

async function uploadToWordPress({ file, purpose }: UploadInput) {
  const scope = mediaScopeForPurpose(purpose);
  const body = new FormData();

  body.append("file", file, file.name.slice(0, 180));
  body.append("scope", scope);
  body.append("purpose", purpose);

  const base = (await getWpBaseUrl()).replace(/\/$/, "");

  const response = await fetch(
    `${base}/wp-json/letz/v1/media/upload`,
    {
      method: "POST",
      headers: {
        "X-Letz-Auth": INTERNAL_TOKEN,
        Accept: "application/json",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    },
  );

  const parsed: unknown = await response.json().catch(() => null);

  if (!response.ok || !isRecord(parsed)) {
    throw new Error("Media upload failed.");
  }

  const id = Number(parsed.id ?? parsed.image_id ?? 0);
  const url = String(
    parsed.url ?? parsed.source_url ?? parsed.image_url ?? "",
  ).trim();

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !/^https?:\/\//i.test(url)
  ) {
    throw new Error("Media upload returned an invalid response.");
  }

  /*
   * Confirm the media classification after upload. This second,
   * idempotent write prevents catalog uploads from disappearing from the
   * vendor Media Library and keeps system media protected even if an older
   * runtime upload handler ignores the multipart classification fields.
   */
  const scopeResponse = await fetch(
    `${base}/wp-json/letz/v1/media/mark-scope`,
    {
      method: "POST",
      headers: {
        "X-Letz-Auth": INTERNAL_TOKEN,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ id, scope, purpose }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );

  const scopeResult: unknown = await scopeResponse
    .json()
    .catch(() => null);

  if (
    !scopeResponse.ok ||
    !isRecord(scopeResult) ||
    scopeResult.scope !== scope ||
    scopeResult.protected !== (scope === "system")
  ) {
    throw new Error("Media classification failed.");
  }

  const imageUrl =
    typeof parsed.image_url === "string" ? parsed.image_url : url;

  return {
    id,
    url,
    source_url: url,
    image_url: imageUrl,
    thumbnail:
      typeof parsed.thumbnail === "string"
        ? parsed.thumbnail
        : imageUrl,
    filename: file.name,
    purpose,
    scope,
    protected: scopeResult.protected === true,
    item: isRecord(parsed.item) ? parsed.item : null,
  };
}

function isClientError(message: string) {
  return /^(Enter|Select|Only|Private|Remote|The URL|The remote|Could not download)/.test(
    message,
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!INTERNAL_TOKEN) {
      return NextResponse.json(
        {
          ok: false,
          error: "Media service is not configured.",
        },
        {
          status: 500,
          headers: PRIVATE_HEADERS,
        },
      );
    }

    const input = await parseUploadInput(request);
    const validationError = validateFile(input.file);

    if (validationError) {
      return NextResponse.json(
        {
          ok: false,
          error: validationError,
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        },
      );
    }

    return NextResponse.json(await uploadToWordPress(input), {
      status: 200,
      headers: PRIVATE_HEADERS,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Media upload failed.";

    console.error("Media upload failed:", message);

    return NextResponse.json(
      {
        ok: false,
        error: isClientError(message) ? message : "Media upload failed.",
      },
      {
        status: isClientError(message) ? 400 : 500,
        headers: PRIVATE_HEADERS,
      },
    );
  }
}
