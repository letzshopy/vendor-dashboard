import { NextResponse } from "next/server";

import {
  getMasterWpBaseUrl,
} from "@/lib/wpClient";

const MASTER_API_KEY =
  process.env.MASTER_API_KEY || "";

const PRIVATE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
};

type JsonRecord = Record<string, unknown>;

type VendorSummary = {
  blog_id: number;
  store_name: string;
  store_url: string;
  owner_email: string;
  plan: string;
  status: string;
  billing_state: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function stringField(
  source: JsonRecord,
  key: string,
  maxLength: number
): string {
  return typeof source[key] === "string"
    ? source[key]
        .trim()
        .slice(0, maxLength)
    : "";
}

function normalizeVendor(
  value: unknown
): VendorSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  const blogId = Number(value.blog_id);
  const storeUrl = stringField(
    value,
    "store_url",
    500
  );

  if (
    !Number.isInteger(blogId) ||
    blogId <= 0 ||
    !/^https?:\/\//i.test(storeUrl)
  ) {
    return null;
  }

  return {
    blog_id: blogId,
    store_name:
      stringField(
        value,
        "store_name",
        180
      ),
    store_url: storeUrl,
    owner_email:
      stringField(
        value,
        "owner_email",
        254
      ),
    plan:
      stringField(value, "plan", 80),
    status:
      stringField(value, "status", 80),
    billing_state:
      stringField(
        value,
        "billing_state",
        80
      ),
  };
}

export async function GET() {
  try {
    if (!MASTER_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Master vendor service is not configured.",
        },
        {
          status: 500,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const base = (
      await getMasterWpBaseUrl()
    ).replace(/\/$/, "");

    const response = await fetch(
      `${base}/wp-json/letz/v1/master-vendors`,
      {
        headers: {
          Accept: "application/json",
          Authorization:
            `Bearer ${MASTER_API_KEY}`,
          "X-Letz-Master-Key":
            MASTER_API_KEY,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      }
    );

    const parsed: unknown = await response
      .json()
      .catch(() => null);

    if (
      !response.ok ||
      !isRecord(parsed) ||
      !Array.isArray(parsed.vendors)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not load the vendor registry.",
        },
        {
          status:
            response.status >= 400 &&
            response.status < 500
              ? response.status
              : 502,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const vendors = parsed.vendors
      .map(normalizeVendor)
      .filter(
        (
          vendor
        ): vendor is VendorSummary =>
          vendor !== null
      );

    return NextResponse.json(
      {
        ok: true,
        vendors,
      },
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    console.error(
      "Master vendor registry request failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not load the vendor registry.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
