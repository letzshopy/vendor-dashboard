import "server-only";

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
  workloadProjectNumber: string;
  workloadPoolId: string;
  workloadProviderId: string;
  serviceAccountEmail: string;
};

type CachedToken = {
  token: string;
  expiresAt: number;
};

const DEFAULT_FIREBASE_PROJECT_ID =
  "letzshopy-vendor-app";
const DEFAULT_GCP_PROJECT_NUMBER =
  "144687785901";
const DEFAULT_WIF_POOL_ID =
  "vercel";
const DEFAULT_WIF_PROVIDER_ID =
  "vercel";
const DEFAULT_SERVICE_ACCOUNT_EMAIL =
  "letzshopy-fcm-sender@letzshopy-vendor-app.iam.gserviceaccount.com";

let cachedFirebaseAccessToken:
  CachedToken | null = null;

function readFirebaseConfig():
  FirebaseConfig {
  const projectId =
    String(
      process.env
        .FIREBASE_PROJECT_ID ||
        DEFAULT_FIREBASE_PROJECT_ID
    ).trim();

  const workloadProjectNumber =
    String(
      process.env
        .GCP_WIF_PROJECT_NUMBER ||
        DEFAULT_GCP_PROJECT_NUMBER
    ).trim();

  const workloadPoolId =
    String(
      process.env
        .GCP_WIF_POOL_ID ||
        DEFAULT_WIF_POOL_ID
    ).trim();

  const workloadProviderId =
    String(
      process.env
        .GCP_WIF_PROVIDER_ID ||
        DEFAULT_WIF_PROVIDER_ID
    ).trim();

  const serviceAccountEmail =
    String(
      process.env
        .GCP_FCM_SERVICE_ACCOUNT ||
        DEFAULT_SERVICE_ACCOUNT_EMAIL
    ).trim();

  if (
    !projectId ||
    !workloadProjectNumber ||
    !workloadPoolId ||
    !workloadProviderId ||
    !serviceAccountEmail
  ) {
    throw new Error(
      "Firebase Cloud Messaging federation is not configured"
    );
  }

  return {
    projectId,
    workloadProjectNumber,
    workloadPoolId,
    workloadProviderId,
    serviceAccountEmail,
  };
}

function providerAudience(
  config: FirebaseConfig
): string {
  return [
    "//iam.googleapis.com/projects",
    config.workloadProjectNumber,
    "locations/global/workloadIdentityPools",
    config.workloadPoolId,
    "providers",
    config.workloadProviderId,
  ].join("/");
}

function vercelOidcToken():
  string {
  const token =
    String(
      process.env
        .VERCEL_OIDC_TOKEN ||
        ""
    ).trim();

  if (!token) {
    throw new Error(
      "Vercel OIDC token is unavailable"
    );
  }

  return token;
}

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

async function exchangeVercelToken(
  config: FirebaseConfig
): Promise<string> {
  const response =
    await fetch(
      "https://sts.googleapis.com/v1/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          new URLSearchParams({
            audience:
              providerAudience(
                config
              ),
            grant_type:
              "urn:ietf:params:oauth:grant-type:token-exchange",
            requested_token_type:
              "urn:ietf:params:oauth:token-type:access_token",
            scope:
              "https://www.googleapis.com/auth/cloud-platform",
            subject_token_type:
              "urn:ietf:params:oauth:token-type:jwt",
            subject_token:
              vercelOidcToken(),
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
    !isRecord(body)
  ) {
    throw new Error(
      `Google STS token exchange failed (${response.status})`
    );
  }

  const accessToken =
    typeof body
      .access_token ===
    "string"
      ? body
          .access_token
          .trim()
      : "";

  if (!accessToken) {
    throw new Error(
      "Google STS access token is missing"
    );
  }

  return accessToken;
}

async function impersonateFcmSender(
  config: FirebaseConfig,
  federatedToken: string
): Promise<CachedToken> {
  const response =
    await fetch(
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(
        config
          .serviceAccountEmail
      )}:generateAccessToken`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${federatedToken}`,
          "Content-Type":
            "application/json",
        },
        body:
          JSON.stringify({
            scope: [
              "https://www.googleapis.com/auth/firebase.messaging",
            ],
            lifetime:
              "3600s",
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
    !isRecord(body)
  ) {
    throw new Error(
      `Google service-account impersonation failed (${response.status})`
    );
  }

  const accessToken =
    typeof body.accessToken ===
    "string"
      ? body
          .accessToken
          .trim()
      : "";

  const expireTime =
    typeof body.expireTime ===
    "string"
      ? Date.parse(
          body.expireTime
        )
      : Number.NaN;

  if (!accessToken) {
    throw new Error(
      "Impersonated FCM access token is missing"
    );
  }

  const fallbackExpiresAt =
    Math.floor(
      Date.now() / 1000
    ) +
    3300;

  return {
    token: accessToken,
    expiresAt:
      Number.isFinite(
        expireTime
      )
        ? Math.floor(
            expireTime / 1000
          )
        : fallbackExpiresAt,
  };
}

async function getAccessToken():
  Promise<string> {
  const now =
    Math.floor(
      Date.now() / 1000
    );

  if (
    cachedFirebaseAccessToken &&
    cachedFirebaseAccessToken
      .expiresAt >
      now + 90
  ) {
    return (
      cachedFirebaseAccessToken
        .token
    );
  }

  const config =
    readFirebaseConfig();

  const federatedToken =
    await exchangeVercelToken(
      config
    );

  cachedFirebaseAccessToken =
    await impersonateFcmSender(
      config,
      federatedToken
    );

  return (
    cachedFirebaseAccessToken
      .token
  );
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

    if (!expired) {
      console.error(
        "[FCM] Delivery failed",
        {
          status:
            response.status,
        }
      );
    }

    return {
      ok: false,
      expired,
      status:
        response.status,
    };
  } catch (error) {
    console.error(
      "[FCM] Authentication or delivery failed",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return {
      ok: false,
      expired: false,
      status: 503,
    };
  }
}
