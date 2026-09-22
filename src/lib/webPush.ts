import "server-only";

import {
  createCipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  randomBytes,
  sign as cryptoSign,
  timingSafeEqual,
} from "node:crypto";

export type WebPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type WebPushPayload = {
  type: "new_order" | "test";
  title: string;
  body: string;
  url: string;
  tag: string;
  orderId?: number;
  orderNumber?: string;
};

export type WebPushSendResult = {
  ok: boolean;
  expired: boolean;
  status: number;
};

const MAX_ENDPOINT_LENGTH = 4096;
const MAX_PUSH_PAYLOAD_BYTES = 3000;

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeBase64UrlStrict(
  value: string,
  label: string,
  minBytes: number,
  maxBytes: number
): Buffer {
  const normalized = String(value || "").trim().replace(/=+$/g, "");

  if (!/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw new Error(`Invalid ${label}`);
  }

  const decoded = Buffer.from(normalized, "base64url");

  if (
    decoded.length < minBytes ||
    decoded.length > maxBytes ||
    decoded.toString("base64url") !== normalized
  ) {
    throw new Error(`Invalid ${label}`);
  }

  return decoded;
}

function isAllowedPushEndpoint(rawEndpoint: string): boolean {
  if (
    !rawEndpoint ||
    rawEndpoint.length > MAX_ENDPOINT_LENGTH
  ) {
    return false;
  }

  let url: URL;

  try {
    url = new URL(rawEndpoint);
  } catch {
    return false;
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    return false;
  }

  const host = url.hostname.toLowerCase();

  return (
    host === "fcm.googleapis.com" ||
    host === "updates.push.services.mozilla.com" ||
    host === "push.services.mozilla.com" ||
    host === "web.push.apple.com" ||
    host.endsWith(".push.apple.com") ||
    host.endsWith(".notify.windows.com")
  );
}

export function normalizeWebPushSubscription(
  value: unknown
): WebPushSubscription | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const endpoint =
    typeof record.endpoint === "string"
      ? record.endpoint.trim()
      : "";

  if (!isAllowedPushEndpoint(endpoint)) {
    return null;
  }

  const keys =
    record.keys &&
    typeof record.keys === "object" &&
    !Array.isArray(record.keys)
      ? (record.keys as Record<string, unknown>)
      : null;

  const p256dh =
    typeof keys?.p256dh === "string"
      ? keys.p256dh.trim()
      : "";
  const auth =
    typeof keys?.auth === "string"
      ? keys.auth.trim()
      : "";

  try {
    const clientPublicKey = decodeBase64UrlStrict(
      p256dh,
      "push p256dh key",
      65,
      65
    );
    decodeBase64UrlStrict(auth, "push auth key", 16, 32);

    if (clientPublicKey[0] !== 0x04) {
      return null;
    }
  } catch {
    return null;
  }

  return {
    endpoint,
    keys: {
      p256dh,
      auth,
    },
  };
}

type VapidConfig = {
  publicKey: string;
  privateKey: Buffer;
  subject: string;
};

function readVapidConfig(): VapidConfig {
  const publicKey = String(
    process.env.VAPID_PUBLIC_KEY || ""
  ).trim();
  const privateKeyRaw = String(
    process.env.VAPID_PRIVATE_KEY || ""
  ).trim();
  const subject = String(
    process.env.VAPID_SUBJECT || "mailto:support@letzshopy.in"
  ).trim();

  if (!publicKey || !privateKeyRaw) {
    throw new Error("Web Push VAPID keys are not configured");
  }

  if (
    !subject.startsWith("mailto:") &&
    !/^https:\/\//i.test(subject)
  ) {
    throw new Error("Invalid VAPID subject");
  }

  const publicBytes = decodeBase64UrlStrict(
    publicKey,
    "VAPID public key",
    65,
    65
  );
  const privateKey = decodeBase64UrlStrict(
    privateKeyRaw,
    "VAPID private key",
    32,
    32
  );

  if (publicBytes[0] !== 0x04) {
    throw new Error("Invalid VAPID public key");
  }

  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(privateKey);
  const derivedPublic = ecdh.getPublicKey(undefined, "uncompressed");

  if (
    derivedPublic.length !== publicBytes.length ||
    !timingSafeEqual(derivedPublic, publicBytes)
  ) {
    throw new Error("VAPID public/private key mismatch");
  }

  return {
    publicKey,
    privateKey,
    subject,
  };
}

export function getVapidPublicKey(): string {
  return readVapidConfig().publicKey;
}

function hmacSha256(key: Buffer, data: Buffer): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function hkdfExpand(
  pseudoRandomKey: Buffer,
  info: Buffer,
  length: number
): Buffer {
  const chunks: Buffer[] = [];
  let previous: Buffer = Buffer.alloc(0);
  let produced = 0;
  let counter = 1;

  while (produced < length) {
    const input = Buffer.concat([
      previous,
      info,
      Buffer.from([counter]),
    ]);

    previous = hmacSha256(pseudoRandomKey, input);
    chunks.push(previous);
    produced += previous.length;
    counter += 1;

    if (counter > 255) {
      throw new Error("HKDF output too large");
    }
  }

  return Buffer.concat(chunks).subarray(0, length);
}

function createVapidAuthorization(
  endpoint: string,
  config: VapidConfig
): string {
  const endpointUrl = new URL(endpoint);
  const audience = endpointUrl.origin;
  const now = Math.floor(Date.now() / 1000);

  const header = base64UrlJson({
    typ: "JWT",
    alg: "ES256",
  });
  const payload = base64UrlJson({
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: config.subject,
  });

  const unsigned = `${header}.${payload}`;
  const publicBytes = Buffer.from(config.publicKey, "base64url");
  const x = publicBytes.subarray(1, 33).toString("base64url");
  const y = publicBytes.subarray(33, 65).toString("base64url");

  const privateKey = createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x,
      y,
      d: config.privateKey.toString("base64url"),
    },
    format: "jwk",
  });

  const signature = cryptoSign(
    "sha256",
    Buffer.from(unsigned, "utf8"),
    {
      key: privateKey,
      dsaEncoding: "ieee-p1363",
    }
  );

  return `vapid t=${unsigned}.${signature.toString("base64url")}, k=${config.publicKey}`;
}

function encryptPushPayload(
  subscription: WebPushSubscription,
  payload: WebPushPayload
): Buffer {
  const clientPublicKey = decodeBase64UrlStrict(
    subscription.keys.p256dh,
    "push p256dh key",
    65,
    65
  );
  const authSecret = decodeBase64UrlStrict(
    subscription.keys.auth,
    "push auth key",
    16,
    32
  );

  const serverKey = createECDH("prime256v1");
  serverKey.generateKeys();

  const serverPublicKey = serverKey.getPublicKey(
    undefined,
    "uncompressed"
  );
  const sharedSecret = serverKey.computeSecret(clientPublicKey);

  const authPrk = hmacSha256(authSecret, sharedSecret);
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0", "utf8"),
    clientPublicKey,
    serverPublicKey,
  ]);
  const inputKeyMaterial = hkdfExpand(authPrk, keyInfo, 32);

  const salt = randomBytes(16);
  const prk = hmacSha256(salt, inputKeyMaterial);
  const contentEncryptionKey = hkdfExpand(
    prk,
    Buffer.from("Content-Encoding: aes128gcm\0", "utf8"),
    16
  );
  const nonce = hkdfExpand(
    prk,
    Buffer.from("Content-Encoding: nonce\0", "utf8"),
    12
  );

  const plaintextPayload = Buffer.from(
    JSON.stringify(payload),
    "utf8"
  );

  if (plaintextPayload.length > MAX_PUSH_PAYLOAD_BYTES) {
    throw new Error("Web Push payload is too large");
  }

  const plaintext = Buffer.concat([
    plaintextPayload,
    Buffer.from([0x02]),
  ]);

  const cipher = createCipheriv(
    "aes-128-gcm",
    contentEncryptionKey,
    nonce
  );
  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);

  return Buffer.concat([
    salt,
    recordSize,
    Buffer.from([serverPublicKey.length]),
    serverPublicKey,
    ciphertext,
    authTag,
  ]);
}

export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: WebPushPayload
): Promise<WebPushSendResult> {
  const normalized = normalizeWebPushSubscription(subscription);

  if (!normalized) {
    return {
      ok: false,
      expired: true,
      status: 0,
    };
  }

  const config = readVapidConfig();
  const body = encryptPushPayload(normalized, payload);
  const authorization = createVapidAuthorization(
    normalized.endpoint,
    config
  );

  let response: Response;

  try {
    response = await fetch(normalized.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "300",
        Urgency: "high",
      },
      body: new Uint8Array(body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return {
      ok: false,
      expired: false,
      status: 0,
    };
  }

  return {
    ok: response.ok,
    expired:
      response.status === 404 ||
      response.status === 410,
    status: response.status,
  };
}
