export type SessionRole =
  | "master_admin"
  | "vendor_admin"
  | "store_owner";

export type SessionStore = {
  blog_id: number;
  store_name: string;
  store_url: string;
};

export type SessionPayload = {
  v: number;
  email: string;
  saas_role: SessionRole;
  stores: SessionStore[];
  iat: number;
  exp: number;
};

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const ALLOWED_ROLES: SessionRole[] = [
  "master_admin",
  "vendor_admin",
  "store_owner",
];

function encodeBytes(bytes: Uint8Array): string {
  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    const chunk = bytes.subarray(index, index + 0x8000);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBytes(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const normalized = value
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded =
      normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return null;
  }
}

function normalizeUrl(value: unknown): string {
  const url = String(value || "")
    .trim()
    .replace(/\/+$/, "");

  if (!/^https?:\/\//i.test(url)) {
    return "";
  }

  return url;
}

function normalizeStores(value: unknown): SessionStore[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const stores: SessionStore[] = [];

  for (const rawStore of value) {
    if (!rawStore || typeof rawStore !== "object") {
      return null;
    }

    const storeRecord = rawStore as Record<string, unknown>;

    const blogId = Number(storeRecord.blog_id);
    const storeUrl = normalizeUrl(storeRecord.store_url);
    const storeName = String(storeRecord.store_name || "").trim();

    if (!Number.isInteger(blogId) || blogId <= 0 || !storeUrl) {
      return null;
    }

    stores.push({
      blog_id: blogId,
      store_name: storeName,
      store_url: storeUrl,
    });
  }

  return stores;
}

async function importHmacKey(
  secret: string,
  usages: KeyUsage[]
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    usages
  );
}

export async function signSessionPayload(
  payload: SessionPayload,
  secret: string
): Promise<string> {
  if (!secret) {
    throw new Error("Dashboard session secret is not configured");
  }

  const body = encodeBytes(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const key = await importHmacKey(secret, ["sign"]);

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );

  return `${body}.${encodeBytes(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  rawToken: string,
  secret: string
): Promise<SessionPayload | null> {
  if (!rawToken || !secret) {
    return null;
  }

  let token = rawToken.trim();

  try {
    token = decodeURIComponent(token);
  } catch {
    // Keep the original token when it is not URI encoded.
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [body, encodedSignature] = parts;

  if (!body || !encodedSignature) {
    return null;
  }

  const signature = decodeBytes(encodedSignature);

  if (!signature) {
    return null;
  }

  try {
    const key = await importHmacKey(secret, ["verify"]);

    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(body)
    );

    if (!validSignature) {
      return null;
    }

    const decodedBody = decodeBytes(body);

    if (!decodedBody) {
      return null;
    }

    const parsed = JSON.parse(
      new TextDecoder().decode(decodedBody)
    );

    const version = Number(parsed?.v || 0);
    const email = String(parsed?.email || "")
      .trim()
      .toLowerCase();
    const role = parsed?.saas_role as SessionRole;
    const issuedAt = Number(parsed?.iat || 0);

    // Existing v4 sessions do not contain exp.
    const expiresAt = Number(
      parsed?.exp || issuedAt + SESSION_TTL_MS
    );

    const stores = normalizeStores(parsed?.stores);

    if (
      version < 4 ||
      !email ||
      !ALLOWED_ROLES.includes(role) ||
      !Number.isFinite(issuedAt) ||
      issuedAt <= 0 ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= issuedAt ||
      stores === null
    ) {
      return null;
    }

    const now = Date.now();

    if (
      issuedAt > now + 5 * 60 * 1000 ||
      expiresAt <= now ||
      expiresAt - issuedAt > SESSION_TTL_MS
    ) {
      return null;
    }

    return {
      v: version,
      email,
      saas_role: role,
      stores,
      iat: issuedAt,
      exp: expiresAt,
    };
  } catch {
    return null;
  }
}

export function findAuthorizedStore(
  session: SessionPayload,
  candidate: {
    blog_id?: unknown;
    store_url?: unknown;
  }
): SessionStore | null {
  const blogId = Number(candidate.blog_id || 0);
  const storeUrl = normalizeUrl(candidate.store_url);

  if (!Number.isInteger(blogId) || blogId <= 0 || !storeUrl) {
    return null;
  }

  return (
    session.stores.find(
      (store) =>
        store.blog_id === blogId &&
        normalizeUrl(store.store_url) === storeUrl
    ) || null
  );
}
