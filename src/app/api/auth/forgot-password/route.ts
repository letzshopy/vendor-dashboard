// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";

const REGISTRY_URL = process.env.REGISTRY_URL; // https://letzshopy.in
const REGISTRY_TOKEN = process.env.REGISTRY_TOKEN; // x-letz-auth value

type RegistryStore = { name: string; store_url: string };
type RegistryOk = { ok: true; email: string; saas_role: string; stores: RegistryStore[] };
type RegistryErr = { ok: false; error?: string };
type RegistryResp = RegistryOk | RegistryErr;

function normalizeBase(url: string) {
  return url.replace(/\/+$/, "");
}

function isRegistryOk(x: any): x is RegistryOk {
  return (
    x &&
    x.ok === true &&
    Array.isArray(x.stores)
  );
}

export async function POST(req: Request) {
  try {
    if (!REGISTRY_URL || !REGISTRY_TOKEN) {
      // Still avoid leaking anything
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const body = await req.json().catch(() => null);
    const email = body?.email?.trim();

    // Always respond ok to avoid email enumeration
    if (!email) return NextResponse.json({ ok: true }, { status: 200 });

    // 1) Lookup vendor in registry (email -> store_url)
    const url = new URL("/wp-json/letz/v1/vendor-by-email", REGISTRY_URL);
    url.searchParams.set("email", email);

    const r = await fetch(url.toString(), {
      headers: { "x-letz-auth": REGISTRY_TOKEN },
      cache: "no-store",
    });

    const data = (await r.json().catch(() => null)) as RegistryResp | null;

    // If vendor not found, still return ok (no leak)
    if (!r.ok || !data || !isRegistryOk(data)) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const storeUrl = data.stores[0]?.store_url;
    if (!storeUrl) return NextResponse.json({ ok: true }, { status: 200 });

    const tenantBase = normalizeBase(storeUrl);

    // 2) Call tenant WP endpoint that triggers WP reset email
    await fetch(`${tenantBase}/wp-json/letz/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ email }),
    }).catch(() => null);

    // Always OK
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    // Always OK (no leak)
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}