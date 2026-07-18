import { isAxiosError } from "axios";
import { NextResponse } from "next/server";

export type JsonRecord = Record<string, unknown>;

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function privateJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

export async function readJsonObject(request: Request): Promise<JsonRecord> {
  const declaredLength = Number(request.headers.get("content-length") || 0);

  if (Number.isFinite(declaredLength) && declaredLength > 64 * 1024) {
    throw new RangeError("Request body is too large");
  }

  const raw = await request.text();

  if (!raw || new TextEncoder().encode(raw).byteLength > 64 * 1024) {
    throw new TypeError(raw ? "Request body is too large" : "Request body is required");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new TypeError("Invalid JSON request body");
  }

  if (!isRecord(parsed)) throw new TypeError("Invalid request body");
  return parsed;
}

export function parseTermId(value: unknown, label = "Term"): number {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new TypeError(`Invalid ${label.toLowerCase()} id`);
  }

  return id;
}

function boundedString(
  value: unknown,
  label: string,
  maxLength: number,
  allowEmpty = false
): string {
  if (typeof value !== "string") throw new TypeError(`${label} must be text`);
  const result = value.trim();
  if (!result && !allowEmpty) throw new TypeError(`${label} is required`);
  if (result.length > maxLength) throw new RangeError(`${label} is too long`);
  return result;
}

function slugValue(value: unknown): string {
  const slug = boundedString(value, "Slug", 200, true).toLowerCase();

  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new TypeError("Slug may contain only lowercase letters, numbers and hyphens");
  }

  return slug;
}

export function categoryPayload(body: JsonRecord): JsonRecord {
  const name = boundedString(body.name, "Category name", 200);
  const parent = body.parent === undefined ? 0 : Number(body.parent);

  if (!Number.isSafeInteger(parent) || parent < 0) {
    throw new TypeError("Invalid parent category");
  }

  const payload: JsonRecord = {
    name,
    parent,
    description: body.description === undefined
      ? ""
      : boundedString(body.description, "Description", 20_000, true),
  };

  if (body.slug !== undefined) {
    const slug = slugValue(body.slug);
    if (slug) payload.slug = slug;
  }

  if (body.image_id !== undefined && body.image_id !== null) {
    const imageId = Number(body.image_id);

    if (!Number.isSafeInteger(imageId) || imageId <= 0) {
      throw new TypeError("Invalid category image");
    }

    payload.image = { id: imageId };
  }

  return payload;
}

export function tagPayload(body: JsonRecord, requireName: boolean): JsonRecord {
  const payload: JsonRecord = {};

  if (body.name !== undefined) {
    payload.name = boundedString(body.name, "Tag name", 200);
  } else if (requireName) {
    throw new TypeError("Tag name is required");
  }

  if (body.slug !== undefined) {
    const slug = slugValue(body.slug);
    if (slug) payload.slug = slug;
  }

  if (body.description !== undefined) {
    payload.description = boundedString(body.description, "Description", 20_000, true);
  }

  if (Object.keys(payload).length === 0) {
    throw new TypeError("No supported tag fields were provided");
  }

  return payload;
}

function safeString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

export function categorySummary(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;
  const id = Number(value.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const image = isRecord(value.image) ? value.image : null;
  const imageId = Number(image?.id || 0);
  const imageUrl = safeString(image?.src, 2_000);

  return {
    id,
    name: safeString(value.name, 200),
    slug: safeString(value.slug, 200),
    parent: Math.max(0, Number(value.parent) || 0),
    description: safeString(value.description, 20_000),
    count: Math.max(0, Number(value.count) || 0),
    image:
      Number.isSafeInteger(imageId) && imageId > 0 && imageUrl
        ? { id: imageId, src: imageUrl }
        : null,
  };
}

export function tagSummary(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;
  const id = Number(value.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  return {
    id,
    name: safeString(value.name, 200),
    slug: safeString(value.slug, 200),
    description: safeString(value.description, 20_000),
    count: Math.max(0, Number(value.count) || 0),
  };
}

export function parseSeoIds(value: unknown): number[] {
  if (!Array.isArray(value)) throw new TypeError("SEO category ids must be a list");

  const ids = Array.from(new Set(value.map((item) => parseTermId(item, "Category"))));

  if (ids.length > 6) throw new RangeError("A maximum of 6 SEO categories can be selected");
  return ids;
}

export function seoResponse(value: unknown, fallbackIds: number[] = []): JsonRecord {
  if (!isRecord(value)) {
    return { ok: true, selectedIds: fallbackIds, min: 3, max: 6 };
  }

  const selectedIds = Array.isArray(value.selectedIds)
    ? value.selectedIds.flatMap((item) => {
        const id = Number(item);
        return Number.isSafeInteger(id) && id > 0 ? [id] : [];
      }).slice(0, 6)
    : fallbackIds;

  return {
    ok: value.ok !== false,
    selectedIds,
    min: 3,
    max: 6,
  };
}

export function taxonomyErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof TypeError || error instanceof RangeError) {
    return privateJson({ error: error.message }, 400);
  }

  if (isAxiosError(error)) {
    const upstreamStatus = Number(error.response?.status || 0);
    const status = [400, 404, 409].includes(upstreamStatus) ? upstreamStatus : 502;
    const data: unknown = error.response?.data;
    const message = isRecord(data) && typeof data.message === "string"
      ? data.message.slice(0, 240)
      : fallback;

    console.error("Taxonomy API request failed", {
      status: upstreamStatus || null,
      code: error.code || null,
    });

    return privateJson({ error: status === 502 ? fallback : message }, status);
  }

  console.error("Taxonomy route failed", error instanceof Error ? error.message : "Unknown error");
  return privateJson({ error: fallback }, 500);
}
