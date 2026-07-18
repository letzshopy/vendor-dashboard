import { isAxiosError, type AxiosInstance } from "axios";
import { NextResponse } from "next/server";

export type JsonRecord = Record<string, unknown>;

const MAX_EXPORT_PAGES = 50;
const DEFAULT_PER_PAGE = 100;
const MAX_CSV_CHARACTERS = 50_000_000;

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

export class ExportRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ExportRequestError";
    this.status = status;
  }
}

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function safeText(value: unknown, maximum = 300_000): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : String(value);
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, maximum);
}

export function safeId(value: unknown): number {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

function protectSpreadsheetFormula(value: string): string {
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: unknown): string {
  const text = protectSpreadsheetFormula(safeText(value));
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function stringifyExportCsv(rows: unknown[][]): string {
  const lines: string[] = [];
  let characters = 0;

  for (const row of rows) {
    const line = row.map(csvCell).join(",");
    characters += line.length + (lines.length ? 2 : 0);
    if (characters > MAX_CSV_CHARACTERS) {
      throw new ExportRequestError(
        "This export is too large. Narrow the filters and try again.",
        413,
      );
    }
    lines.push(line);
  }

  return lines.join("\r\n");
}

export function csvResponse(csv: string, filename: string): NextResponse {
  if (!/^[a-z0-9][a-z0-9._-]*\.csv$/i.test(filename)) {
    throw new ExportRequestError("Invalid export filename");
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Download-Options": "noopen",
    },
  });
}

export function exportErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof ExportRequestError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: error.status, headers: PRIVATE_HEADERS },
    );
  }

  if (isAxiosError(error)) {
    const upstreamStatus = Number(error.response?.status || 0);
    console.error("Export upstream request failed", {
      status: upstreamStatus || null,
      code: error.code || null,
    });
    return NextResponse.json(
      { ok: false, error: fallback },
      { status: upstreamStatus === 404 ? 404 : 502, headers: PRIVATE_HEADERS },
    );
  }

  console.error("Export route failed", error instanceof Error ? error.message : "Unknown error");
  return NextResponse.json(
    { ok: false, error: fallback },
    { status: 500, headers: PRIVATE_HEADERS },
  );
}

export function optionalPositiveInteger(
  searchParams: URLSearchParams,
  name: string,
  maximum = 2_147_483_647,
): number | null {
  const raw = String(searchParams.get(name) || "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new ExportRequestError(`Invalid ${name} filter`);
  }
  return value;
}

export function optionalEnum(
  searchParams: URLSearchParams,
  name: string,
  allowed: ReadonlySet<string>,
): string {
  const value = String(searchParams.get(name) || "").trim().toLowerCase();
  if (value && !allowed.has(value)) {
    throw new ExportRequestError(`Invalid ${name} filter`);
  }
  return value;
}

export function booleanFlag(searchParams: URLSearchParams, name: string): boolean {
  const raw = String(searchParams.get(name) || "").trim();
  if (!raw || raw === "0") return false;
  if (raw === "1") return true;
  throw new ExportRequestError(`Invalid ${name} option`);
}

export function optionalDate(searchParams: URLSearchParams, name: string): string {
  const value = String(searchParams.get(name) || "").trim();
  if (!value) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ExportRequestError(`Invalid ${name} date`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ExportRequestError(`Invalid ${name} date`);
  }
  return value;
}

function totalPages(headers: unknown): number | null {
  if (!isRecord(headers)) return null;
  const raw = headers["x-wp-totalpages"] ?? headers["X-WP-TotalPages"];
  if (raw === undefined || raw === null || raw === "") return null;
  const pages = Number.parseInt(String(raw), 10);
  return Number.isFinite(pages) && pages > 0 ? pages : null;
}

export async function fetchExportCollection(
  woo: AxiosInstance,
  endpoint: string,
  params: Record<string, unknown> = {},
  maximumPages = MAX_EXPORT_PAGES,
): Promise<JsonRecord[]> {
  const pageLimit = Math.min(MAX_EXPORT_PAGES, Math.max(1, maximumPages));
  const perPage = DEFAULT_PER_PAGE;
  const first = await woo.get(endpoint, {
    params: { ...params, per_page: perPage, page: 1 },
  });
  const items = records(first.data);
  const declaredPages = totalPages(first.headers);

  if (declaredPages && declaredPages > pageLimit) {
    throw new ExportRequestError(
      `This export exceeds the ${pageLimit * perPage}-record safety limit. Narrow the filters and try again.`,
      413,
    );
  }

  const pagesToFetch = declaredPages ?? (items.length === perPage ? pageLimit : 1);
  for (let page = 2; page <= pagesToFetch; page += 1) {
    const response = await woo.get(endpoint, {
      params: { ...params, per_page: perPage, page },
    });
    const pageItems = records(response.data);
    if (!pageItems.length) break;
    items.push(...pageItems);
    if (!declaredPages && pageItems.length < perPage) break;
    if (!declaredPages && page === pageLimit && pageItems.length === perPage) {
      throw new ExportRequestError(
        `This export exceeds the ${pageLimit * perPage}-record safety limit. Narrow the filters and try again.`,
        413,
      );
    }
  }

  return items;
}
