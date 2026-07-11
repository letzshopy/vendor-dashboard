import {
  NextResponse,
  type NextRequest,
} from "next/server";

import { getWpBaseUrl } from "@/lib/wpClient";

const INTERNAL_TOKEN =
  process.env.LETZ_INTERNAL_TOKEN || "";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const PRIVATE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
};

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function normalizeDocumentType(
  value: FormDataEntryValue | null
): string {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const aliases: Record<string, string> = {
    aadhaar: "aadhaar",
    pan: "pan",
    cancelledcheque:
      "cancelled_cheque",
    cancelled_cheque:
      "cancelled_cheque",
    gstcert: "gstcert",
    gst_cert: "gstcert",
    gstcertificate:
      "gst_certificate",
    gst_certificate:
      "gst_certificate",
    doc: "doc",
  };

  return aliases[raw] || "";
}

export async function POST(
  request: NextRequest
) {
  try {
    if (!INTERNAL_TOKEN) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "KYC document service is not configured.",
        },
        {
          status: 500,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const form = await request
      .formData()
      .catch(() => null);

    const file = form?.get("file");
    const documentType =
      normalizeDocumentType(
        form?.get("doc_type") || null
      );

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Select a KYC document to upload.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    if (!documentType) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid KYC document type.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    if (
      file.size <= 0 ||
      file.size > MAX_FILE_BYTES
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "KYC documents must be 10 MB or smaller.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    if (
      !ALLOWED_MIME_TYPES.has(file.type)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Only JPG, PNG and PDF documents are allowed.",
        },
        {
          status: 400,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    const base = (
      await getWpBaseUrl()
    ).replace(/\/$/, "");

    const upstreamBody = new FormData();

    upstreamBody.append(
      "file",
      file,
      file.name.slice(0, 180)
    );

    upstreamBody.append(
      "doc_type",
      documentType
    );

    const response = await fetch(
      `${base}/wp-json/letz/v1/kyc/upload`,
      {
        method: "POST",
        headers: {
          "x-letz-auth": INTERNAL_TOKEN,
        },
        body: upstreamBody,
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      }
    );

    const parsed: unknown = await response
      .json()
      .catch(() => null);

    if (
      !response.ok ||
      !isRecord(parsed)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "KYC document upload failed.",
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

    const fileKey =
      typeof parsed.fileKey === "string"
        ? parsed.fileKey
        : "";

    if (!fileKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "KYC document upload failed.",
        },
        {
          status: 502,
          headers: PRIVATE_HEADERS,
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        fileKey,
        filename:
          typeof parsed.filename ===
          "string"
            ? parsed.filename
            : file.name.slice(0, 180),
        docType: documentType,
      },
      {
        status: 200,
        headers: PRIVATE_HEADERS,
      }
    );
  } catch (error: unknown) {
    console.error(
      "KYC upload failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "KYC document upload failed.",
      },
      {
        status: 500,
        headers: PRIVATE_HEADERS,
      }
    );
  }
}
