import { NextResponse } from "next/server";

import {
  SESSION_TTL_MS,
  type SessionRole,
  type SessionStore,
  signSessionPayload,
} from "@/lib/session";

const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME ||
  "ls_vendor_auth";

const TENANT_COOKIE_NAME =
  process.env.TENANT_COOKIE_NAME ||
  "ls_tenant";

const LEGACY_ROLE_COOKIE_NAME =
  "ls_role";

const SESSION_SIGNING_SECRET =
  process.env.DASHBOARD_SECRET || "";

const MASTER_WP_URL =
  process.env.MASTER_WP_URL || "";

const SESSION_MAX_AGE_SECONDS =
  Math.floor(SESSION_TTL_MS / 1000);

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
};

const ALLOWED_ROLES: SessionRole[] = [
  "master_admin",
  "vendor_admin",
  "store_owner",
];

type JsonRecord = Record<string, unknown>;

type LoginMode =
  | "json"
  | "form";

type LoginRequestBody = {
  email: string;
  password: string;
  nextPath: string;
  mode: LoginMode;
};

type MasterLoginSuccess = {
  role: SessionRole;
  stores: SessionStore[];
};

function isRecord(
  value: unknown
): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function normalizeBaseUrl(
  rawUrl: string
): string {
  const value = String(rawUrl || "")
    .trim()
    .replace(/\/+$/, "");

  if (!/^https?:\/\//i.test(value)) {
    return "";
  }

  return value;
}

function normalizeStoreUrl(
  rawUrl: unknown
): string {
  return normalizeBaseUrl(
    String(rawUrl || "")
  );
}

function normalizeStores(
  value: unknown
): SessionStore[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const stores: SessionStore[] = [];
  const storeKeys = new Set<string>();

  for (const rawStore of value) {
    if (!isRecord(rawStore)) {
      return null;
    }

    const blogId = Number(
      rawStore.blog_id
    );

    const storeName = String(
      rawStore.store_name || ""
    ).trim();

    const storeUrl = normalizeStoreUrl(
      rawStore.store_url
    );

    if (
      !Number.isInteger(blogId) ||
      blogId <= 0 ||
      !storeUrl
    ) {
      return null;
    }

    const storeKey =
      `${blogId}:${storeUrl}`;

    if (storeKeys.has(storeKey)) {
      continue;
    }

    storeKeys.add(storeKey);

    stores.push({
      blog_id: blogId,
      store_name: storeName,
      store_url: storeUrl,
    });
  }

  return stores;
}

function parseMasterLoginSuccess(
  value: unknown
): MasterLoginSuccess | null {
  if (
    !isRecord(value) ||
    value.ok !== true
  ) {
    return null;
  }

  const rawRole = value.role;

  if (
    typeof rawRole !== "string" ||
    !ALLOWED_ROLES.includes(
      rawRole as SessionRole
    )
  ) {
    return null;
  }

  const stores = normalizeStores(
    value.stores
  );

  if (!stores) {
    return null;
  }

  return {
    role: rawRole as SessionRole,
    stores,
  };
}

function normalizeNextPath(
  rawValue: unknown
): string {
  const value = String(rawValue || "")
    .trim();

  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "";
  }

  try {
    const internalOrigin =
      "https://dashboard.internal";

    const parsed = new URL(
      value,
      internalOrigin
    );

    if (parsed.origin !== internalOrigin) {
      return "";
    }

    const pathname = parsed.pathname;

    if (
      pathname === "/signin" ||
      pathname.startsWith("/signin/") ||
      pathname === "/master" ||
      pathname.startsWith("/master/") ||
      pathname === "/api" ||
      pathname.startsWith("/api/")
    ) {
      return "";
    }

    return (
      parsed.pathname +
      parsed.search
    );
  } catch {
    return "";
  }
}

async function readBody(
  request: Request
): Promise<LoginRequestBody> {
  const contentType =
    request.headers.get("content-type") ||
    "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    const parsed: unknown = await request
      .json()
      .catch(() => null);

    const body = isRecord(parsed)
      ? parsed
      : {};

    return {
      email: String(
        body.email || ""
      ).trim(),
      password: String(
        body.password || ""
      ),
      nextPath: normalizeNextPath(
        body.next
      ),
      mode: "json",
    };
  }

  const form = await request
    .formData()
    .catch(() => null);

  return {
    email: String(
      form?.get("email") || ""
    ).trim(),
    password: String(
      form?.get("password") || ""
    ),
    nextPath: normalizeNextPath(
      form?.get("next")
    ),
    mode: "form",
  };
}

function createSigninErrorUrl(
  requestUrl: string,
  message: string,
  nextPath: string
): URL {
  const signinUrl = new URL(
    "/signin",
    requestUrl
  );

  signinUrl.searchParams.set(
    "error",
    message
  );

  if (nextPath) {
    signinUrl.searchParams.set(
      "next",
      nextPath
    );
  }

  return signinUrl;
}

function clearCookie(
  response: NextResponse,
  name: string
) {
  response.cookies.set({
    name,
    value: "",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
}

function setAuthSessionCookie(
  response: NextResponse,
  authToken: string
) {
  response.cookies.set(
    AUTH_COOKIE_NAME,
    authToken,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge:
        SESSION_MAX_AGE_SECONDS,
    }
  );
}

function setTenantCookie(
  response: NextResponse,
  store: SessionStore
) {
  const tenantPayload = {
    blog_id: store.blog_id,
    store_name: store.store_name,
    store_url: store.store_url,
  };

  response.cookies.set(
    TENANT_COOKIE_NAME,
    encodeURIComponent(
      JSON.stringify(tenantPayload)
    ),
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge:
        SESSION_MAX_AGE_SECONDS,
    }
  );
}

function setLoginSessionState(
  response: NextResponse,
  authToken: string,
  selectedStore?: SessionStore
) {
  /*
   * Every login starts with clean selector state.
   * The editable legacy role cookie is deleted and
   * is never issued again.
   */
  clearCookie(
    response,
    TENANT_COOKIE_NAME
  );

  clearCookie(
    response,
    LEGACY_ROLE_COOKIE_NAME
  );

  setAuthSessionCookie(
    response,
    authToken
  );

  if (selectedStore) {
    setTenantCookie(
      response,
      selectedStore
    );
  }
}

function loginErrorResponse(
  request: Request,
  mode: LoginMode,
  message: string,
  nextPath: string,
  status: number
): NextResponse {
  if (mode === "form") {
    return NextResponse.redirect(
      createSigninErrorUrl(
        request.url,
        message,
        nextPath
      ),
      303
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    {
      status,
      headers:
        PRIVATE_RESPONSE_HEADERS,
    }
  );
}

function getRedirectPath(
  role: SessionRole,
  stores: SessionStore[],
  nextPath: string
): string {
  if (role === "master_admin") {
    return "/master";
  }

  if (stores.length !== 1) {
    return "/select-store";
  }

  return nextPath || "/dashboard";
}

export async function POST(
  request: Request
) {
  try {
    if (!SESSION_SIGNING_SECRET) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server authentication is not configured.",
        },
        {
          status: 500,
          headers:
            PRIVATE_RESPONSE_HEADERS,
        }
      );
    }

    const masterBaseUrl =
      normalizeBaseUrl(
        MASTER_WP_URL
      );

    if (!masterBaseUrl) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Master authentication service is not configured.",
        },
        {
          status: 500,
          headers:
            PRIVATE_RESPONSE_HEADERS,
        }
      );
    }

    const {
      email,
      password,
      nextPath,
      mode,
    } = await readBody(request);

    if (!email || !password) {
      return loginErrorResponse(
        request,
        mode,
        "Email and password are required.",
        nextPath,
        400
      );
    }

    const wordpressResponse =
      await fetch(
        `${masterBaseUrl}/wp-json/letz/v1/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

    const responseText =
      await wordpressResponse.text();

    let parsedResponse: unknown = null;

    try {
      parsedResponse = JSON.parse(
        responseText
      );
    } catch {
      parsedResponse = null;
    }

    const loginResult =
      parseMasterLoginSuccess(
        parsedResponse
      );

    if (
      !wordpressResponse.ok ||
      !loginResult
    ) {
      return loginErrorResponse(
        request,
        mode,
        "Invalid email or password.",
        nextPath,
        401
      );
    }

    const {
      role,
      stores,
    } = loginResult;

    const redirectPath =
      getRedirectPath(
        role,
        stores,
        nextPath
      );

    const issuedAt = Date.now();

    const authToken =
      await signSessionPayload(
        {
          v: 4,
          email:
            email.toLowerCase(),
          saas_role: role,
          stores,
          iat: issuedAt,
          exp:
            issuedAt +
            SESSION_TTL_MS,
        },
        SESSION_SIGNING_SECRET
      );

    const selectedStore =
      role !== "master_admin" &&
      stores.length === 1
        ? stores[0]
        : undefined;

    if (mode === "json") {
      const response =
        NextResponse.json(
          {
            ok: true,
            saas_role: role,
            redirect:
              redirectPath,
            storesCount:
              stores.length,
          },
          {
            headers:
              PRIVATE_RESPONSE_HEADERS,
          }
        );

      setLoginSessionState(
        response,
        authToken,
        selectedStore
      );

      return response;
    }

    const response =
      NextResponse.redirect(
        new URL(
          redirectPath,
          request.url
        ),
        303
      );

    response.headers.set(
      "Cache-Control",
      PRIVATE_RESPONSE_HEADERS[
        "Cache-Control"
      ]
    );

    setLoginSessionState(
      response,
      authToken,
      selectedStore
    );

    return response;
  } catch (error: unknown) {
    console.error(
      "Dashboard login failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to sign in right now.",
      },
      {
        status: 500,
        headers:
          PRIVATE_RESPONSE_HEADERS,
      }
    );
  }
}