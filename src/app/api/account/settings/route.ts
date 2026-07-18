import { NextResponse } from "next/server";
import {
  fetchInternalWp,
} from "@/lib/wpClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_REQUEST_BYTES = 8_192;
const MAX_NAME_LENGTH = 160;
const MAX_EMAIL_LENGTH = 254;
const MAX_MOBILE_LENGTH = 40;
const UPSTREAM_TIMEOUT_MS = 15_000;

type JsonRecord = Record<string, unknown>;

type SafeAccountSettings = {
  overview: {
    account_id: string;
    store_url: string;
    created_on: string;
  };
  contact: {
    contact_name: string;
    contact_email: string;
    contact_mobile: string;
  };
  security: {
    login_email: string;
  };
};

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readRecord(
  value: JsonRecord,
  key: string
): JsonRecord {
  return isRecord(value[key])
    ? value[key]
    : {};
}

function boundedString(
  value: unknown,
  maxLength: number
): string {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function normalizeEmail(
  value: unknown,
  allowEmpty = true
): string | null {
  const email = boundedString(
    value,
    MAX_EMAIL_LENGTH
  ).toLowerCase();

  if (!email && allowEmpty) {
    return "";
  }

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    return null;
  }

  return email;
}

function normalizeAccountSettings(
  value: unknown
): SafeAccountSettings {
  const root = isRecord(value) ? value : {};
  const overview = readRecord(
    root,
    "overview"
  );
  const contact = readRecord(
    root,
    "contact"
  );
  const security = readRecord(
    root,
    "security"
  );

  return {
    overview: {
      account_id: boundedString(
        overview.account_id,
        MAX_NAME_LENGTH
      ),
      store_url: boundedString(
        overview.store_url,
        2_048
      ),
      created_on: boundedString(
        overview.created_on,
        40
      ),
    },
    contact: {
      contact_name: boundedString(
        contact.contact_name,
        MAX_NAME_LENGTH
      ),
      contact_email:
        normalizeEmail(
          contact.contact_email
        ) || "",
      contact_mobile: boundedString(
        contact.contact_mobile,
        MAX_MOBILE_LENGTH
      ),
    },
    security: {
      login_email:
        normalizeEmail(
          security.login_email
        ) || "",
    },
  };
}

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

export async function GET() {
  try {
    const response = await fetchInternalWp(
      "/wp-json/letz/v1/account-settings",
      {
        method: "GET",
      },
      UPSTREAM_TIMEOUT_MS
    );

    if (!response.ok) {
      console.error(
        `Account settings load failed with status ${response.status}.`
      );

      return privateJson(
        {
          error:
            "Failed to load account settings.",
        },
        502
      );
    }

    const payload: unknown =
      await response.json();

    return privateJson(
      normalizeAccountSettings(payload)
    );
  } catch (error: unknown) {
    console.error(
      "Account settings load failed:",
      error instanceof Error
        ? error.message
        : "Unknown account settings error"
    );

    return privateJson(
      {
        error:
          "Failed to load account settings.",
      },
      502
    );
  }
}

export async function PUT(request: Request) {
  const contentLength = Number(
    request.headers.get("content-length") ||
      "0"
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_REQUEST_BYTES
  ) {
    return privateJson(
      {
        error:
          "Invalid account settings request.",
      },
      400
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return privateJson(
      {
        error:
          "Invalid account settings request.",
      },
      400
    );
  }

  if (!isRecord(body)) {
    return privateJson(
      {
        error:
          "Invalid account settings request.",
      },
      400
    );
  }

  const contact = readRecord(
    body,
    "contact"
  );

  const contactEmail = normalizeEmail(
    contact.contact_email
  );

  if (contactEmail === null) {
    return privateJson(
      {
        error:
          "Enter a valid contact email address.",
      },
      400
    );
  }

  /*
   * The Account tab may update contact information only.
   * Overview, security/login identity, subscription, legal acceptance,
   * and dashboard-access state are never forwarded from the browser.
   */
  const safePayload = {
    contact: {
      contact_name: boundedString(
        contact.contact_name,
        MAX_NAME_LENGTH
      ),
      contact_email: contactEmail,
      contact_mobile: boundedString(
        contact.contact_mobile,
        MAX_MOBILE_LENGTH
      ),
    },
  };

  try {
    const response = await fetchInternalWp(
      "/wp-json/letz/v1/account-settings",
      {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          safePayload
        ),
      },
      UPSTREAM_TIMEOUT_MS
    );

    if (!response.ok) {
      console.error(
        `Account settings save failed with status ${response.status}.`
      );

      return privateJson(
        {
          error:
            "Failed to save account settings.",
        },
        response.status >= 400 &&
          response.status < 500
          ? 400
          : 502
      );
    }

    const responsePayload: unknown =
      await response.json();

    const responseRoot =
      isRecord(responsePayload)
        ? responsePayload
        : {};

    const saved = isRecord(
      responseRoot.saved
    )
      ? responseRoot.saved
      : responsePayload;

    return privateJson({
      ok: true,
      settings:
        normalizeAccountSettings(saved),
    });
  } catch (error: unknown) {
    console.error(
      "Account settings save failed:",
      error instanceof Error
        ? error.message
        : "Unknown account settings error"
    );

    return privateJson(
      {
        error:
          "Failed to save account settings.",
      },
      502
    );
  }
}
