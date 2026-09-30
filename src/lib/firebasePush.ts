import "server-only";

import {
  createPrivateKey,
  sign as cryptoSign,
} from "node:crypto";

export type FirebasePushPayload = {
  type: "new_order" | "test";
  title: string;
  body: string;
  url: string;
  tag: string;
  orderId?: number;
  orderNumber?: string;
};

export type FirebasePushResult = {
  ok: boolean;
  expired: boolean;
  status: number;
};

type FirebaseConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

let cachedAccessToken:
  | {
      token: string;
      expiresAt: number;
    }
  | null = null;

function base64Url(
  value: string
): string {
  return Buffer.from(
    value,
    "utf8"
  ).toString(
    "base64url"
  );
}

function readFirebaseConfig():
  FirebaseConfig {
  const projectId =
    String(
      process.env
        .FIREBASE_PROJECT_ID ||
        ""
    ).trim();

  const clientEmail =
    String(
      process.env
        .FIREBASE_CLIENT_EMAIL ||
        ""
    ).trim();

  const privateKey =
    String(
      process.env
        .FIREBASE_PRIVATE_KEY ||
        ""
    )
      .replace(
        /\\n/g,
        "\n"
      )
      .trim();

  if (
    !projectId ||
    !clientEmail ||
    !privateKey
  ) {
    throw new Error(
      "Firebase Cloud Messaging is not configured"
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export function normalizeFcmToken(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const token =
    value.trim();

  if (
    token.length < 20 ||
    token.length > 4096 ||
    /[\s\x00-\x1F\x7F]/.test(
      token
    )
  ) {
    return null;
  }

  return token;
}

async function getAccessToken():
  Promise<string> {
  const now =
    Math.floor(
      Date.now() / 1000
    );

  if (
    cachedAccessToken &&
    cachedAccessToken
      .expiresAt >
      now + 90
  ) {
    return cachedAccessToken
      .token;
  }

  const config =
    readFirebaseConfig();

  const header =
    base64Url(
      JSON.stringify({
        alg: "RS256",
        typ: "JWT",
      })
    );

  const claims =
    base64Url(
      JSON.stringify({
        iss:
          config.clientEmail,
        scope:
          "https://www.googleapis.com/auth/firebase.messaging",
        aud:
          "https://oauth2.googleapis.com/token",
        iat: now,
        exp:
          now + 3600,
      })
    );

  const unsigned =
    `${header}.${claims}`;

  const signature =
    cryptoSign(
      "RSA-SHA256",
      Buffer.from(
        unsigned,
        "utf8"
      ),
      createPrivateKey(
        config.privateKey
      )
    ).toString(
      "base64url"
    );

  const assertion =
    `${unsigned}.${signature}`;

  const response =
    await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          new URLSearchParams({
            grant_type:
              "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion,
          }),
        cache: "no-store",
      }
    );

  const body: unknown =
    await response
      .json()
      .catch(() => null);

  if (
    !response.ok ||
    !body ||
    typeof body !==
      "object" ||
    Array.isArray(body)
  ) {
    throw new Error(
      "Unable to obtain Firebase messaging access token"
    );
  }

  const record =
    body as Record<
      string,
      unknown
    >;

  const accessToken =
    typeof record
      .access_token ===
    "string"
      ? record
          .access_token
          .trim()
      : "";

  const expiresIn =
    Number(
      record.expires_in ||
        3600
    );

  if (!accessToken) {
    throw new Error(
      "Firebase messaging access token is missing"
    );
  }

  cachedAccessToken = {
    token: accessToken,
    expiresAt:
      now +
      (
        Number.isFinite(
          expiresIn
        )
          ? Math.max(
              300,
              expiresIn
            )
          : 3600
      ),
  };

  return accessToken;
}

function stringData(
  payload:
    FirebasePushPayload
) {
  return {
    type:
      payload.type,
    url:
      payload.url,
    tag:
      payload.tag,
    orderId:
      payload.orderId
        ? String(
            payload.orderId
          )
        : "",
    orderNumber:
      payload.orderNumber ||
      "",
  };
}

export async function sendFirebasePush(
  token: string,
  payload:
    FirebasePushPayload
): Promise<FirebasePushResult> {
  const normalized =
    normalizeFcmToken(
      token
    );

  if (!normalized) {
    return {
      ok: false,
      expired: true,
      status: 400,
    };
  }

  try {
    const config =
      readFirebaseConfig();

    const accessToken =
      await getAccessToken();

    const response =
      await fetch(
        `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(
          config.projectId
        )}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              message: {
                token:
                  normalized,
                notification:
                  {
                    title:
                      payload.title,
                    body:
                      payload.body,
                  },
                data:
                  stringData(
                    payload
                  ),
                android: {
                  priority:
                    "high",
                  notification:
                    {
                      channel_id:
                        "orders",
                      tag:
                        payload.tag,
                      default_sound:
                        true,
                    },
                },
              },
            }),
          cache:
            "no-store",
        }
      );

    if (response.ok) {
      return {
        ok: true,
        expired: false,
        status:
          response.status,
      };
    }

    const responseText =
      await response
        .text()
        .catch(
          () => ""
        );

    const expired =
      response.status ===
        404 ||
      response.status ===
        410 ||
      /UNREGISTERED|registration-token-not-registered/i.test(
        responseText
      );

    return {
      ok: false,
      expired,
      status:
        response.status,
    };
  } catch {
    return {
      ok: false,
      expired: false,
      status: 503,
    };
  }
}
