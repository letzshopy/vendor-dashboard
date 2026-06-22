import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

function getWpAuthEnv() {
  const user = process.env.WP_USER || "";
  const appPass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");

  const missing: string[] = [];
  if (!user) missing.push("WP_USER");
  if (!appPass) missing.push("WP_APP_PASSWORD");

  if (missing.length) throw new Error(`Missing env var(s): ${missing.join(", ")}`);

  const auth = Buffer.from(`${user}:${appPass}`).toString("base64");
  return { auth };
}

async function deleteCatalogMedia(wpUrl: string, auth: string, ids: number[]) {
  const r = await fetch(`${wpUrl}/wp-json/letz/v1/media/delete-catalog`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ ids }),
    cache: "no-store",
  });

  const text = await r.text();
  let data: any = {};

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!r.ok) {
    throw new Error(data?.message || data?.error || `WP delete failed (${r.status}): ${text}`);
  }

  return data;
}

export async function POST(req: Request) {
  try {
    const wpUrl = (await getWpBaseUrl()).replace(/\/$/, "");
    const { auth } = getWpAuthEnv();

    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids (number[]) required" }, { status: 400 });
    }

    const cleanIds = ids
      .map((raw) => Number(raw))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (!cleanIds.length) {
      return NextResponse.json({ error: "No valid ids provided" }, { status: 400 });
    }

    const result = await deleteCatalogMedia(wpUrl, auth, cleanIds);

    if (Array.isArray(result?.skipped) && result.skipped.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Some media files are protected and were not deleted.",
          deleted: result.deleted || [],
          skipped: result.skipped,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, deleted: result.deleted || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const wpUrl = (await getWpBaseUrl()).replace(/\/$/, "");
    const { auth } = getWpAuthEnv();

    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const result = await deleteCatalogMedia(wpUrl, auth, [id]);

    if (Array.isArray(result?.skipped) && result.skipped.length > 0) {
      return NextResponse.json(
        { ok: false, error: "This media file is protected and cannot be deleted.", skipped: result.skipped },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true, deleted: result.deleted || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}