import {
  type JsonRecord,
  parseTermId,
} from "@/lib/taxonomyPolicy";

const ATTRIBUTE_TYPES = new Set(["select", "text"]);
const ATTRIBUTE_ORDER = new Set(["menu_order", "name", "name_num", "id"]);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function boundedText(
  value: unknown,
  label: string,
  maximum: number,
  allowEmpty = false,
): string {
  if (typeof value !== "string") throw new TypeError(`${label} must be text`);
  const output = value.trim();
  if (!output && !allowEmpty) throw new TypeError(`${label} is required`);
  if (output.length > maximum) throw new RangeError(`${label} is too long`);
  if (/[\x00-\x1F\x7F]/.test(output)) {
    throw new TypeError(`${label} contains unsupported characters`);
  }
  return output;
}

function slugValue(value: unknown, fallback = ""): string {
  const raw = value === undefined || value === null || value === ""
    ? fallback
    : boundedText(value, "Slug", 100);
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  if (!slug) throw new TypeError("Slug is required");
  return slug;
}

function enumValue(
  value: unknown,
  label: string,
  allowed: ReadonlySet<string>,
  fallback: string,
): string {
  const output = value === undefined || value === null || value === ""
    ? fallback
    : boundedText(value, label, 40).toLowerCase();
  if (!allowed.has(output)) throw new TypeError(`${label} is invalid`);
  return output;
}

function safeText(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, maximum)
    : "";
}

export function attributeId(value: unknown): number {
  return parseTermId(value, "Attribute");
}

export function attributePayload(body: JsonRecord): JsonRecord {
  const name = boundedText(body.name, "Attribute name", 200);
  return {
    name,
    slug: slugValue(body.slug, name),
    type: enumValue(body.type, "Attribute type", ATTRIBUTE_TYPES, "select"),
    order_by: enumValue(
      body.order_by,
      "Attribute ordering",
      ATTRIBUTE_ORDER,
      "menu_order",
    ),
    has_archives: false,
  };
}

export function attributeTermPayload(body: JsonRecord): JsonRecord {
  const name = boundedText(body.name, "Term name", 200);
  const payload: JsonRecord = {
    name,
    slug: slugValue(body.slug, name),
  };

  if (body.description !== undefined) {
    payload.description = boundedText(body.description, "Description", 20_000, true);
  }
  return payload;
}

export type AttributeSummary = {
  id: number;
  name: string;
  slug: string;
  type: string;
  order_by: string;
  has_archives: boolean;
};

export function attributeSummary(value: unknown): AttributeSummary | null {
  if (!isRecord(value)) return null;
  const id = Number(value.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  return {
    id,
    name: safeText(value.name, 200),
    slug: safeText(value.slug, 100),
    type: safeText(value.type, 40),
    order_by: safeText(value.order_by, 40),
    has_archives: value.has_archives === true,
  };
}

export type AttributeTermSummary = {
  id: number;
  name: string;
  slug: string;
  description: string;
  menu_order: number;
};

export function attributeTermSummary(value: unknown): AttributeTermSummary | null {
  if (!isRecord(value)) return null;
  const id = Number(value.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  return {
    id,
    name: safeText(value.name, 200),
    slug: safeText(value.slug, 100),
    description: safeText(value.description, 20_000),
    menu_order: Math.max(0, Number(value.menu_order) || 0),
  };
}

export function summaries<T>(
  value: unknown,
  summarize: (item: unknown) => T | null,
): T[] {
  return Array.isArray(value) ? value.flatMap((item) => {
    const summary = summarize(item);
    return summary ? [summary] : [];
  }) : [];
}
