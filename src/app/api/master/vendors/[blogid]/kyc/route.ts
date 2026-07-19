import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  resolveMasterVendorStoreUrl,
} from "@/lib/masterVendor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INTERNAL_TOKEN =
  process.env.LETZ_INTERNAL_TOKEN || "";

const UPSTREAM_TIMEOUT_MS = 15_000;
const MAX_FILE_KEY_LENGTH = 512;

type JsonRecord = Record<string, unknown>;

function privateJson(
  body: JsonRecord,
  status = 200
): NextResponse<JsonRecord> {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

function validateFileKey(
  value: string | null
): string | null {
  if (!value) {
    return null;
  }

  const fileKey = value.trim();

  if (
    !fileKey ||
    fileKey.length >
      MAX_FILE_KEY_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(
      fileKey
    )
  ) {
    return null;
  }

  return fileKey;
}

function safeFilename(
  fileKey: string
): string {
  const candidate =
    fileKey.split(/[\\/]/).pop() ||
    "kyc-document";

  const safe = candidate.replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );

  return safe || "kyc-document";
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      blogid: string;
    }>;
  }
) {
  if (!INTERNAL_TOKEN) {
    return privateJson(
      {
        ok: false,
        error:
          "KYC service is not configured.",
      },
      500
    );
  }

  const { blogid } = await params;

  try {
    const storeUrl =
      await resolveMasterVendorStoreUrl(
        blogid
      );

    const requestedDownload =
      request.nextUrl.searchParams.get(
        "download"
      );

    if (requestedDownload !== null) {
      const fileKey = validateFileKey(
        requestedDownload
      );

      if (!fileKey) {
        return privateJson(
          {
            ok: false,
            error:
              "Invalid KYC document reference.",
          },
          400
        );
      }

      const endpoint = new URL(
        `${storeUrl}/wp-json/letz/v1/kyc/download`
      );

      endpoint.searchParams.set(
        "fileKey",
        fileKey
      );

      const response = await fetch(
        endpoint,
        {
          method: "GET",
          headers: {
            "x-letz-auth":
              INTERNAL_TOKEN,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(
            UPSTREAM_TIMEOUT_MS
          ),
        }
      );

      if (!response.ok) {
        console.error(
          `Master KYC download failed with status ${response.status}.`
        );

        return privateJson(
          {
            ok: false,
            error:
              "Failed to download KYC document.",
          },
          502
        );
      }

      return new NextResponse(
        response.body,
        {
          status: 200,
          headers: {
            "Content-Type":
              response.headers.get(
                "content-type"
              ) ||
              "application/octet-stream",
            "Content-Disposition":
  `inline; filename="${safeFilename(
    fileKey
  )}"`,
            "Cache-Control":
              "no-store, private",
            Pragma: "no-cache",
            Expires: "0",
            "X-Content-Type-Options":
              "nosniff",
            "Content-Security-Policy":
              "default-src 'none'; sandbox",
          },
        }
      );
    }

    const kycEndpoint = new URL(
      `${storeUrl}/wp-json/letz/v1/kyc`
    );

    kycEndpoint.searchParams.set(
      "_ts",
      Date.now().toString()
    );

    const response = await fetch(
      kycEndpoint,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-letz-auth":
            INTERNAL_TOKEN,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(
          UPSTREAM_TIMEOUT_MS
        ),
      }
    );

    if (!response.ok) {
      console.error(
        `Master KYC load failed with status ${response.status}.`
      );

      return privateJson(
        {
          ok: false,
          error:
            "Failed to load vendor KYC.",
        },
        502
      );
    }

    const payload: unknown =
      await response.json();

    if (
      typeof payload !== "object" ||
      payload === null ||
      Array.isArray(payload)
    ) {
      return privateJson(
        {
          ok: false,
          error:
            "Vendor KYC response is invalid.",
        },
        502
      );
    }

    return privateJson(
      payload as JsonRecord
    );
  } catch (error: unknown) {
    console.error(
      "Master KYC request failed:",
      error instanceof Error
        ? error.message
        : "Unknown master KYC error"
    );

    return privateJson(
      {
        ok: false,
        error:
          "Failed to load vendor KYC.",
      },
      502
    );
  }
}