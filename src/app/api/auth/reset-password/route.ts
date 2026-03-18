import { NextResponse } from "next/server";

const REGISTRY_URL = process.env.REGISTRY_URL;
const REGISTRY_TOKEN = process.env.REGISTRY_TOKEN;

type RegistryStore = { name: string; store_url: string };
type RegistryOk = {
  ok: true;
  email: string;
  saas_role: string;
  stores: RegistryStore[];
};
type RegistryErr = { ok: false; error?: string };
type RegistryResp = RegistryOk | RegistryErr;

function normalizeBase(url: string) {
  return String(url || "").replace(/\/+$/, "");
}

function isRegistryOk(x: any): x is RegistryOk {
  return x && x.ok === true && Array.isArray(x.stores);
}

export async function POST(req: Request) {
  try {
    if (!REGISTRY_URL || !REGISTRY_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Reset service is not configured." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();
    const token = String(body?.token || "").trim();
    const newPassword = String(body?.new_password || "");

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const url = new URL("/wp-json/letz/v1/vendor-by-email", REGISTRY_URL);
    url.searchParams.set("email", email);

    const r = await fetch(url.toString(), {
      headers: { "x-letz-auth": REGISTRY_TOKEN },
      cache: "no-store",
    });

    const data = (await r.json().catch(() => null)) as RegistryResp | null;

    if (!r.ok || !data || !isRegistryOk(data)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    const storeUrl = data.stores[0]?.store_url;
    if (!storeUrl) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    const tenantBase = normalizeBase(storeUrl);

    const tenantRes = await fetch(`${tenantBase}/wp-json/letz/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        email,
        token,
        new_password: newPassword,
      }),
    });

    const text = await tenantRes.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}

    if (!tenantRes.ok) {
      return NextResponse.json(
        { ok: false, error: json?.message || json?.error || "Invalid or expired reset link." },
        { status: tenantRes.status || 400 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Could not reset password." },
      { status: 500 }
    );
  }
}