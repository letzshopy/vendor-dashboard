import { NextResponse } from "next/server";
import crypto from "crypto";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";
const TENANT_COOKIE_NAME = process.env.TENANT_COOKIE_NAME || "ls_tenant";
const ROLE_COOKIE_NAME = "ls_role";
const SESSION_SIGNING_SECRET = process.env.DASHBOARD_SECRET;
const MASTER_WP_URL = process.env.MASTER_WP_URL;

type MasterStore = {
  blog_id: number;
  store_name: string;
  store_url: string;
};

type MasterLoginOk = {
  ok: true;
  role: "master_admin" | "vendor_admin" | "store_owner";
  stores: MasterStore[];
};

type MasterLoginErr = { ok: false; message?: string };

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(payload: any, secret: string) {
  const json = JSON.stringify(payload);
  const body = b64url(json);
  const sig = crypto.createHmac("sha256", secret).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

function normalizeBase(url: string) {
  return String(url || "").replace(/\/+$/, "");
}

async function readBody(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    return {
      email: body?.email?.trim() || "",
      password: body?.password || "",
      next: body?.next || "",
      mode: "json" as const,
    };
  }

  const form = await req.formData().catch(() => null);
  return {
    email: String(form?.get("email") || "").trim(),
    password: String(form?.get("password") || ""),
    next: String(form?.get("next") || ""),
    mode: "form" as const,
  };
}

function setCommonCookies(
  res: NextResponse,
  role: "master_admin" | "vendor_admin" | "store_owner",
  authToken: string
) {
  res.cookies.set(AUTH_COOKIE_NAME, authToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  res.cookies.set(ROLE_COOKIE_NAME, role, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

function setTenantCookie(res: NextResponse, store: MasterStore) {
  const tenantPayload = {
    blog_id: store.blog_id,
    store_name: store.store_name,
    store_url: normalizeBase(store.store_url),
  };

  res.cookies.set(TENANT_COOKIE_NAME, encodeURIComponent(JSON.stringify(tenantPayload)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function POST(req: Request) {
  try {
    if (!SESSION_SIGNING_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Server auth not configured (DASHBOARD_SECRET missing)." },
        { status: 500 }
      );
    }

    if (!MASTER_WP_URL) {
      return NextResponse.json(
        { ok: false, error: "MASTER_WP_URL missing in env." },
        { status: 500 }
      );
    }

    const { email, password, next, mode } = await readBody(req);

    if (!email || !password) {
      if (mode === "form") {
        return NextResponse.redirect(new URL("/signin?error=missing", req.url), 303);
      }
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const masterBase = normalizeBase(MASTER_WP_URL);
    const wpRes = await fetch(`${masterBase}/wp-json/letz/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ email, password }),
    });

    const wpText = await wpRes.text();
    let wpJson: MasterLoginOk | MasterLoginErr | null = null;
    try {
      wpJson = JSON.parse(wpText);
    } catch {}

    if (!wpRes.ok || !wpJson || (wpJson as any).ok !== true) {
      const msg = (wpJson as any)?.message || "Invalid email or password.";
      if (mode === "form") {
        return NextResponse.redirect(
          new URL(`/signin?error=${encodeURIComponent(msg)}`, req.url),
          303
        );
      }
      return NextResponse.json({ ok: false, error: msg }, { status: 401 });
    }

    const { role, stores } = wpJson as MasterLoginOk;

    let redirect = "/signin";
    if (role === "master_admin") {
      redirect = "/master";
    } else if (role === "vendor_admin") {
      redirect = stores.length === 1 ? (next || "/dashboard") : "/select-store";
    } else if (role === "store_owner") {
      redirect = stores.length === 1 ? (next || "/dashboard") : "/select-store";
    }

    const token = sign(
      {
        v: 4,
        email,
        saas_role: role,
        stores,
        iat: Date.now(),
      },
      SESSION_SIGNING_SECRET
    );

    if (mode === "json") {
      const res = NextResponse.json({
        ok: true,
        saas_role: role,
        redirect,
        storesCount: stores?.length || 0,
      });

      setCommonCookies(res, role, token);

      if (stores?.length === 1) {
        setTenantCookie(res, stores[0]);
      }

      return res;
    }

    const res = NextResponse.redirect(new URL(redirect, req.url), 303);

    setCommonCookies(res, role, token);

    if (stores?.length === 1) {
      setTenantCookie(res, stores[0]);
    }

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Login failed." },
      { status: 500 }
    );
  }
}