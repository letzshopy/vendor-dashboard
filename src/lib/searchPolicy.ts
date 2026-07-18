import { isAxiosError } from "axios";
import {
  isRecord,
  privateJson,
  type JsonRecord,
} from "@/lib/productPolicy";

export type SearchScope = "products" | "orders";

export type SearchResult = {
  id: number;
  label: string;
  subLabel?: string;
  url: string;
};

export function searchScope(value: string | null): SearchScope {
  return value === "orders" ? "orders" : "products";
}

export function searchQuery(value: string | null): string {
  const query = String(value || "").trim();
  if (query.length > 100) throw new RangeError("Search query is too long");
  if (/[\x00-\x1F\x7F]/.test(query)) throw new TypeError("Invalid search query");
  return query;
}

export function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function safeText(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, maximum)
    : "";
}

function safeId(value: unknown): number {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

export function productSearchResult(value: unknown): SearchResult | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  if (!id) return null;
  const name = safeText(value.name, 200) || "(no title)";
  const sku = safeText(value.sku, 100);

  return {
    id,
    label: name,
    ...(sku ? { subLabel: `SKU: ${sku}` } : {}),
    url: `/products/${id}`,
  };
}

export function orderSearchResult(value: unknown): SearchResult | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  if (!id) return null;
  const billing = isRecord(value.billing) ? value.billing : {};
  const name = [
    safeText(billing.first_name, 100),
    safeText(billing.last_name, 100),
  ].filter(Boolean).join(" ").trim();
  const number = safeText(value.number, 100) || String(id);
  const total = safeText(value.total, 50);
  const subParts = [name, total ? `₹${total}` : ""].filter(Boolean);

  return {
    id,
    label: `Order #${number}`,
    ...(subParts.length ? { subLabel: subParts.join(" • ") } : {}),
    url: `/orders/${id}`,
  };
}


export function searchErrorResponse(error: unknown) {
  if (error instanceof TypeError || error instanceof RangeError) {
    return privateJson({ items: [], error: error.message }, 400);
  }

  if (isAxiosError(error)) {
    console.error("Dashboard search upstream request failed", {
      status: Number(error.response?.status || 0) || null,
      code: error.code || null,
    });
    return privateJson({ items: [], error: "Search is temporarily unavailable" }, 502);
  }

  console.error(
    "Dashboard search failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return privateJson({ items: [], error: "Search is temporarily unavailable" }, 500);
}
