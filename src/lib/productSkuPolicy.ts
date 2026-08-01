import axios, {
  type AxiosInstance,
} from "axios";

import {
  isRecord,
} from "@/lib/productPolicy";

const MAX_SKU_LENGTH = 100;
const MAX_SEQUENCE_DIGITS = 12;
const MAX_PRODUCT_PAGES = 500;
const PRODUCT_PAGE_SIZE = 100;
const MAX_SKU_SEARCH_ATTEMPTS = 10_000;

export type SkuSequenceCursor = {
  prefix: string;
  digits: number;
  nextNumber: number;
};

export type OpenSkuSequenceOptions = {
  sourceSku?: unknown;
  prefix?: string;
  start?: number;
  digits?: number;
};

type SkuSequencePattern = {
  prefix: string;
  digits: number;
  firstNumber: number;
};

function normalizeSku(value: unknown): string {
  return typeof value === "string"
    ? value.trim().slice(0, MAX_SKU_LENGTH)
    : "";
}

function normalizePrefix(value: unknown): string {
  const prefix =
    typeof value === "string"
      ? value.trim().slice(
          0,
          MAX_SKU_LENGTH - MAX_SEQUENCE_DIGITS
        )
      : "";

  return prefix || "SKU";
}

function positiveInteger(
  value: unknown,
  fallback: number
): number {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) &&
    parsed > 0
    ? parsed
    : fallback;
}

function normalizeDigits(value: unknown): number {
  return Math.min(
    MAX_SEQUENCE_DIGITS,
    positiveInteger(value, 3)
  );
}

function escapeRegExp(value: string): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

export function deriveSkuSequencePattern(
  sourceSku: unknown
): SkuSequencePattern {
  const normalized = normalizeSku(sourceSku);
  const match = normalized.match(/^(.*?)(\d+)$/);

  if (match) {
    const [, rawPrefix, numberText] = match;
    const currentNumber =
      Number.parseInt(numberText, 10);

    return {
      prefix: normalizePrefix(rawPrefix),
      digits: Math.min(
        MAX_SEQUENCE_DIGITS,
        Math.max(1, numberText.length)
      ),
      firstNumber:
        Number.isSafeInteger(currentNumber)
          ? currentNumber + 1
          : 1,
    };
  }

  if (normalized) {
    return {
      prefix: normalizePrefix(
        normalized.endsWith("-")
          ? normalized
          : `${normalized}-`
      ),
      digits: 3,
      firstNumber: 1,
    };
  }

  return {
    prefix: "SKU",
    digits: 3,
    firstNumber: 1,
  };
}

function resolveSkuSequencePattern(
  options: OpenSkuSequenceOptions
): SkuSequencePattern {
  if (
    typeof options.prefix === "string" &&
    options.prefix.trim()
  ) {
    return {
      prefix: normalizePrefix(options.prefix),
      digits: normalizeDigits(options.digits),
      firstNumber: positiveInteger(
        options.start,
        1
      ),
    };
  }

  return deriveSkuSequencePattern(
    options.sourceSku
  );
}

function formatSequenceSku(
  prefix: string,
  digits: number,
  sequenceNumber: number
): string {
  const numberText = String(
    sequenceNumber
  ).padStart(digits, "0");

  const maximumPrefixLength =
    MAX_SKU_LENGTH - numberText.length;

  if (maximumPrefixLength < 1) {
    throw new RangeError(
      "SKU sequence number is too long"
    );
  }

  return (
    prefix.slice(0, maximumPrefixLength) +
    numberText
  );
}

async function getAllParentSkus(
  woo: AxiosInstance
): Promise<string[]> {
  const skus: string[] = [];

  for (
    let page = 1;
    page <= MAX_PRODUCT_PAGES;
    page += 1
  ) {
    const response = await woo.get(
      "/products",
      {
        params: {
          per_page: PRODUCT_PAGE_SIZE,
          page,
          status: "any",
          _fields: "id,sku",
        },
      }
    );

    const products = Array.isArray(
      response.data
    )
      ? response.data
      : [];

    for (const product of products) {
      if (
        isRecord(product) &&
        typeof product.sku === "string" &&
        product.sku.trim()
      ) {
        skus.push(product.sku.trim());
      }
    }

    const totalPagesHeader = Number(
      response.headers[
        "x-wp-totalpages"
      ] ?? 0
    );

    const reachedReportedEnd =
      Number.isFinite(totalPagesHeader) &&
      totalPagesHeader > 0 &&
      page >= totalPagesHeader;

    if (
      reachedReportedEnd ||
      products.length < PRODUCT_PAGE_SIZE
    ) {
      return skus;
    }
  }

  throw new RangeError(
    "Too many product pages to calculate the next SKU safely"
  );
}

export async function skuExists(
  woo: AxiosInstance,
  rawSku: unknown
): Promise<boolean> {
  const sku = normalizeSku(rawSku);

  if (!sku) {
    return false;
  }

  const response = await woo.get(
    "/products",
    {
      params: {
        per_page: 1,
        sku,
        status: "any",
        _fields: "id",
      },
    }
  );

  return (
    Array.isArray(response.data) &&
    response.data.some(
      (item: unknown) =>
        isRecord(item) &&
        Number(item.id) > 0
    )
  );
}

export async function openSkuSequence(
  woo: AxiosInstance,
  options: OpenSkuSequenceOptions
): Promise<SkuSequenceCursor> {
  const pattern =
    resolveSkuSequencePattern(options);

  const prefixPattern = new RegExp(
    `^${escapeRegExp(pattern.prefix)}(\\d+)$`,
    "i"
  );

  const productSkus =
    await getAllParentSkus(woo);

  let highestSequence =
    pattern.firstNumber - 1;

  for (const productSku of productSkus) {
    const match =
      productSku.match(prefixPattern);

    if (!match) continue;

    const numberValue =
      Number.parseInt(match[1], 10);

    if (
      Number.isSafeInteger(numberValue) &&
      numberValue > highestSequence
    ) {
      highestSequence = numberValue;
    }
  }

  return {
    prefix: pattern.prefix,
    digits: pattern.digits,
    nextNumber: Math.max(
      pattern.firstNumber,
      highestSequence + 1
    ),
  };
}

export async function takeNextAvailableSku(
  woo: AxiosInstance,
  cursor: SkuSequenceCursor
): Promise<string> {
  for (
    let attempt = 0;
    attempt < MAX_SKU_SEARCH_ATTEMPTS;
    attempt += 1
  ) {
    const sequenceNumber =
      cursor.nextNumber;

    cursor.nextNumber += 1;

    const candidate =
      formatSequenceSku(
        cursor.prefix,
        cursor.digits,
        sequenceNumber
      );

    if (
      !(await skuExists(woo, candidate))
    ) {
      return candidate;
    }
  }

  throw new RangeError(
    "Unable to find an available SKU in the sequence"
  );
}

export function isDuplicateSkuError(
  error: unknown
): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const responseData =
    error.response?.data;

  const code =
    isRecord(responseData) &&
    typeof responseData.code === "string"
      ? responseData.code.toLowerCase()
      : "";

  const message =
    isRecord(responseData) &&
    typeof responseData.message === "string"
      ? responseData.message.toLowerCase()
      : error.message.toLowerCase();

  return (
    code === "product_invalid_sku" ||
    (
      code.includes("sku") &&
      (
        message.includes("duplicate") ||
        message.includes("already") ||
        message.includes("invalid")
      )
    ) ||
    (
      message.includes("sku") &&
      (
        message.includes("duplicate") ||
        message.includes("already exists")
      )
    )
  );
}