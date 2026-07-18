import { isAxiosError } from "axios";
import { NextResponse } from "next/server";

export type CsvRow = Record<string, string>;
export type JsonRecord = Record<string, unknown>;

const MAX_IMPORT_BYTES = 4 * 1024 * 1024;
const MAX_IMPORT_ROWS = 500;
const MAX_COLUMNS = 100;
const MAX_CELL_LENGTH = 300_000;
const MAX_ERRORS = 100;

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

export class ImportRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ImportRequestError";
    this.status = status;
  }
}

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function privateImportJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

export function importErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof ImportRequestError) {
    return privateImportJson({ ok: false, error: error.message }, error.status);
  }

  if (isAxiosError(error)) {
    console.error("Import upstream request failed", {
      status: Number(error.response?.status || 0) || null,
      code: error.code || null,
    });
    return privateImportJson({ ok: false, error: fallback }, 502);
  }

  console.error("Import route failed", error instanceof Error ? error.message : "Unknown error");
  return privateImportJson({ ok: false, error: fallback }, 500);
}

export function rowErrorReason(error: unknown): string {
  if (error instanceof ImportRequestError) return error.message;
  if (isAxiosError(error)) {
    const status = Number(error.response?.status || 0);
    if (status === 404) return "The target product was not found.";
    if (status === 400 || status === 409) {
      return "WooCommerce rejected this row. Check its required fields, values, and SKU.";
    }
  }
  return "This row could not be imported.";
}

export function pushRowError(
  errors: Array<{ row: number; reason: string }>,
  row: number,
  reason: string,
): void {
  if (errors.length < MAX_ERRORS) errors.push({ row, reason });
}

function normalizeDelimiter(raw: string, text: string): string {
  const requested = raw === "\\t" ? "\t" : raw;
  if (requested) {
    if (!new Set([",", ";", "\t", "|"]).has(requested)) {
      throw new ImportRequestError("Unsupported CSV delimiter");
    }
    return requested;
  }

  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const candidates = [",", ";", "\t", "|"];
  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length - 1 }))
    .sort((left, right) => right.count - left.count)[0]?.delimiter || ",";
}

function parseCsvMatrix(text: string, delimiter: string): string[][] {
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const finishCell = () => {
    if (cell.length > MAX_CELL_LENGTH) {
      throw new ImportRequestError("A CSV cell exceeds the allowed size", 413);
    }
    row.push(cell.trim());
    cell = "";
  };
  const finishRow = () => {
    finishCell();
    if (row.some((value) => value !== "")) matrix.push(row);
    row = [];
    if (matrix.length > MAX_IMPORT_ROWS + 1) {
      throw new ImportRequestError(
        `A maximum of ${MAX_IMPORT_ROWS} product rows can be imported at once. Split the CSV and try again.`,
        413,
      );
    }
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === delimiter && !quoted) {
      finishCell();
      continue;
    }
    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      finishRow();
      continue;
    }
    cell += character;
  }

  if (quoted) throw new ImportRequestError("Malformed CSV: an opening quote is not closed");
  if (cell || row.length) finishRow();
  return matrix;
}

function csvRows(text: string, delimiter: string): CsvRow[] {
  const matrix = parseCsvMatrix(text.replace(/^\uFEFF/, ""), delimiter);
  if (!matrix.length) throw new ImportRequestError("The CSV file is empty");
  const headers = matrix[0].map((header) => header.trim());
  if (!headers.length || headers.every((header) => !header)) {
    throw new ImportRequestError("No CSV headers were found");
  }
  if (headers.length > MAX_COLUMNS) {
    throw new ImportRequestError(`A maximum of ${MAX_COLUMNS} CSV columns is allowed`, 413);
  }
  if (headers.some((header) => !header || header.length > 100)) {
    throw new ImportRequestError("CSV headers must be present and no longer than 100 characters");
  }
  const normalizedHeaders = headers.map((header) => header.toLowerCase());
  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    throw new ImportRequestError("Duplicate CSV headers are not allowed");
  }

  return matrix.slice(1).map((values, index) => {
    if (values.length > headers.length) {
      throw new ImportRequestError(`CSV row ${index + 2} contains more columns than the header`);
    }
    const output: CsvRow = Object.create(null) as CsvRow;
    for (let column = 0; column < headers.length; column += 1) {
      output[normalizedHeaders[column]] = values[column] || "";
    }
    return output;
  });
}

export async function readProductImport(request: Request): Promise<{
  rows: CsvRow[];
  updateExisting: boolean;
}> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw new ImportRequestError("A multipart CSV upload is required", 415);
  }
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMPORT_BYTES + 512_000) {
    throw new ImportRequestError("The CSV upload exceeds the 4 MB limit", 413);
  }

  const form = await request.formData();
  const value = form.get("file");
  if (!(value instanceof File)) throw new ImportRequestError("No CSV file was uploaded");
  if (!value.size) throw new ImportRequestError("The uploaded CSV file is empty");
  if (value.size > MAX_IMPORT_BYTES) {
    throw new ImportRequestError("The CSV upload exceeds the 4 MB limit", 413);
  }
  if (!/\.(csv|txt)$/i.test(value.name || "")) {
    throw new ImportRequestError("Only .csv or .txt files can be imported", 415);
  }

  const rawUpdate = String(form.get("updateExisting") || "false").toLowerCase();
  if (!new Set(["true", "false", "1", "0"]).has(rawUpdate)) {
    throw new ImportRequestError("Invalid update-existing option");
  }
  const updateExisting = rawUpdate === "true" || rawUpdate === "1";
  const bytes = await value.arrayBuffer();
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ImportRequestError("The CSV must use UTF-8 encoding");
  }
  const delimiter = normalizeDelimiter(String(form.get("delimiter") || ""), text);
  return { rows: csvRows(text, delimiter), updateExisting };
}

export function boundedText(
  value: unknown,
  field: string,
  maximum: number,
  allowNewlines = false,
): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "string") throw new ImportRequestError(`${field} is invalid`);
  const output = value.trim();
  const forbidden = allowNewlines
    ? /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/
    : /[\x00-\x1F\x7F]/;
  if (forbidden.test(output)) throw new ImportRequestError(`${field} contains unsupported characters`);
  if (output.length > maximum) throw new ImportRequestError(`${field} is too long`);
  return output;
}

export function positiveId(value: unknown, field = "Product ID"): number | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647) {
    throw new ImportRequestError(`${field} is invalid`);
  }
  return id;
}

export function enumValue(
  value: unknown,
  field: string,
  allowed: ReadonlySet<string>,
  fallback = "",
): string {
  const output = String(value || fallback).trim().toLowerCase();
  if (output && !allowed.has(output)) throw new ImportRequestError(`${field} is invalid`);
  return output;
}

export function decimalValue(value: unknown, field: string, maximum = 10_000_000): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const number = Number(raw);
  if (!Number.isFinite(number) || number < 0 || number > maximum) {
    throw new ImportRequestError(`${field} is invalid`);
  }
  return raw;
}

export function integerValue(
  value: unknown,
  field: string,
  minimum = -1_000_000,
  maximum = 1_000_000,
): number | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const number = Number(raw);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new ImportRequestError(`${field} is invalid`);
  }
  return number;
}

export function optionalDateTime(value: unknown, field: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp) || raw.length > 50) {
    throw new ImportRequestError(`${field} is invalid`);
  }
  return raw;
}

function privateIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const octets = parts.map(Number);
  if (octets.some((part) => part < 0 || part > 255)) return true;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224;
}

export function publicImageUrl(value: unknown): string {
  const raw = boundedText(value, "Image URL", 2_000);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ImportRequestError("Image URL is invalid");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ImportRequestError("Image URL must use HTTP or HTTPS");
  }
  if (url.username || url.password) throw new ImportRequestError("Image URL credentials are not allowed");
  if (url.port && !new Set(["80", "443"]).has(url.port)) {
    throw new ImportRequestError("Image URL uses an unsupported port");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || hostname === "localhost" ||
      /\.(localhost|local|internal|home|lan)$/.test(hostname) ||
      privateIpv4(hostname) || hostname === "::" || hostname === "::1" ||
      /^(fc|fd|fe[89ab])/i.test(hostname) ||
      /^::ffff:(0|10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168)\./i.test(hostname)) {
    throw new ImportRequestError("Image URL must use a public host");
  }
  return url.toString();
}
