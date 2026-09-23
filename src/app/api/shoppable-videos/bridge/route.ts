import { NextRequest, NextResponse } from "next/server";
import { fetchInternalWp } from "@/lib/wpClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

const PATHS = {
  status: "/wp-json/letz/v2/shoppable/status",
  products: "/wp-json/letz/v2/shoppable/products",
  categories: "/wp-json/letz/v2/shoppable/categories",
} as const;

type BridgeType = keyof typeof PATHS;

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "status";
  if (!(type in PATHS)) {
    return NextResponse.json(
      { ok: false, error: "Invalid shoppable video request." },
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
  const params = new URLSearchParams();
  if (query && type !== "status") params.set("q", query);
  const target = PATHS[type as BridgeType];
  const path = params.size > 0 ? `${target}?${params.toString()}` : target;

  try {
    const response = await fetchInternalWp(path, {
      method: "GET",
      cache: "no-store",
    }, 15_000);
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok || !json || typeof json !== "object") {
      return NextResponse.json(
        { ok: false, error: "Shoppable video bridge is not ready for this store." },
        { status: response.status === 404 ? 503 : response.status, headers: PRIVATE_HEADERS }
      );
    }
    return NextResponse.json(json, { status: 200, headers: PRIVATE_HEADERS });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to contact the store's shoppable video bridge." },
      { status: 502, headers: PRIVATE_HEADERS }
    );
  }
}
