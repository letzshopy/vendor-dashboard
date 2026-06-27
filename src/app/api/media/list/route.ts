import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

function requireInternalToken() {
  const token = process.env.LETZ_INTERNAL_TOKEN || "";

  if (!token) {
    throw new Error("Missing LETZ_INTERNAL_TOKEN in dashboard env");
  }

  return token;
}

export async function GET(req: Request) {
  try {
    const wpUrl = (await getWpBaseUrl()).replace(/\/$/, "");
    const token = requireInternalToken();

    const url = new URL(req.url);
    const id = url.searchParams.get("id") || "";
    const q = url.searchParams.get("q") || "";
    const type = (url.searchParams.get("type") || "all").toLowerCase();

    const params = new URLSearchParams();
    params.set("per_page", "100");

    if (id) params.set("id", id);
    if (q) params.set("q", q);
    if (type !== "all") params.set("type", type);

    const endpoint = `${wpUrl}/wp-json/letz/v1/media/catalog-list?${params.toString()}`;

    const r = await fetch(endpoint, {
      headers: {
        "X-Letz-Auth": token,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json(
        {
          error: `WP catalog media error (${r.status}) for ${endpoint}: ${t}`,
        },
        { status: 500 }
      );
    }

    const data = await r.json();
    const items = Array.isArray(data?.items) ? data.items : [];

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}