import { NextRequest } from "next/server";

import { isRecord, privateJson } from "@/lib/orderPolicy";
import {
  getStoreWpAuthorizationHeader,
  getWpBaseUrl,
} from "@/lib/wpClient";
export const dynamic = "force-dynamic";

const MAX_SEARCH_LENGTH = 120;
const UPSTREAM_TIMEOUT_MS = 20_000;

function boundedText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";

  return value
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function positiveInteger(
  value: string | null,
  fallback: number,
  maximum: number
): number {
  if (!value || !/^\d+$/.test(value)) return fallback;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1
    ? Math.min(parsed, maximum)
    : fallback;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const baseUrl = await getWpBaseUrl();
    const query = new URLSearchParams({
      per_page: String(
        positiveInteger(
          request.nextUrl.searchParams.get("per_page"),
          100,
          100
        )
      ),
      _fields: "id,title,slug,link,status",
    });
    const search = boundedText(
      request.nextUrl.searchParams.get("search"),
      MAX_SEARCH_LENGTH
    );

    if (search) query.set("search", search);

    const response = await fetch(
      `${baseUrl}/wp-json/wp/v2/pages?${query.toString()}`,
      {
        method: "GET",
        headers: { ...(await getStoreWpAuthorizationHeader()), Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      }
    );
    const payload = await readJson(response);

    if (!response.ok || !Array.isArray(payload)) {
      console.error(
        `WordPress page list failed with status ${response.status}.`
      );
      return privateJson({ error: "Failed to load store pages." }, 502);
    }

    const items = payload.flatMap((value: unknown) => {
      if (!isRecord(value)) return [];

      const id = Number(value.id);
      if (!Number.isSafeInteger(id) || id < 1) return [];

      const title = isRecord(value.title)
        ? boundedText(value.title.rendered, 240)
        : "";
      const slug = boundedText(value.slug, 200);
      const link = boundedText(value.link, 2_048);
      const status = boundedText(value.status, 32) || "publish";

      return [{
        id,
        name: title || slug || `Page #${id}`,
        slug,
        url:
          /^https?:\/\//i.test(link) || link.startsWith("/")
            ? link
            : "/",
        status,
      }];
    });

    return privateJson({ items });
  } catch (error: unknown) {
    console.error(
      "WordPress page list failed:",
      error instanceof Error
        ? error.message
        : "Unknown WordPress page error"
    );
    return privateJson({ error: "Failed to load store pages." }, 502);
  }
}
