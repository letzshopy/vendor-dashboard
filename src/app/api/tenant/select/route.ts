import { NextResponse } from "next/server";

const TENANT_COOKIE_NAME = process.env.TENANT_COOKIE_NAME || "ls_tenant";

function normalizeBase(url: string) {
  return String(url || "").replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const { blog_id, store_name, store_url } = await req.json();

    if (!blog_id || !store_url) {
      return NextResponse.json({ ok: false, error: "blog_id and store_url required" }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });

    res.cookies.set(
      TENANT_COOKIE_NAME,
      JSON.stringify({
        blog_id: Number(blog_id),
        store_name: String(store_name || ""),
        store_url: normalizeBase(store_url),
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8,
      }
    );

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}