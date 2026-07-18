import "server-only";

import { getMasterWpBaseUrl } from "@/lib/wpClient";

const MASTER_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

type JsonRecord = Record<string, unknown>;

type MasterTicketListItem = {
  id: number;
  title: string;
  status: string;
  priority: string;
  updatedAt: string;
  createdAt: string;
  responseCount: number;
  customer?: { name?: string; email?: string };
  agent?: { name?: string; email?: string };
};

type MasterTicketListResponse = {
  items: MasterTicketListItem[];
  total: number;
  page: number;
  per_page: number;
};

type MasterTicketDetail = {
  ticket: {
    id: number;
    title: string;
    status: string;
    priority: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    responseCount: number;
  };
  conversations: Array<{
    id: number;
    ticket_id: number;
    person_id: number;
    conversation_type: string;
    content: string;
    created_at: string;
  }>;
  attachments: Array<{
    id: number;
    ticket_id: number;
    person_id: number;
    conversation_id: number;
    file_type: string;
    full_url: string;
    title: string;
    file_size: string;
    created_at: string;
  }>;
};

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function boundedText(value: unknown, maxLength = 300): string {
  if (typeof value !== "string" && typeof value !== "number") return "";

  return String(value)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function integer(value: unknown, fallback = 0, max = 2_147_483_647): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= max
    ? parsed
    : fallback;
}

export function parseMasterId(value: unknown, label = "ID"): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 2_147_483_647) {
    throw new Error(`Invalid ${label}.`);
  }
  return parsed;
}

export function safeExternalUrl(value: unknown): string {
  const raw = boundedText(value, 2_048);
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password
    ) {
      return "";
    }
    return url.toString();
  } catch {
    return "";
  }
}

function masterHeaders(): Record<string, string> {
  const key = (process.env.MASTER_API_KEY || "").trim();
  if (!key) throw new Error("Master service is not configured.");

  return {
    Accept: "application/json",
    Authorization: `Bearer ${key}`,
    "X-Letz-Master-Key": key,
  };
}

async function fetchMasterJson(path: string): Promise<unknown> {
  if (!/^\/wp-json\/letz\/v1\/[a-z0-9/_?&=.%+-]+$/i.test(path)) {
    throw new Error("Invalid master service path.");
  }

  const base = getMasterWpBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${base}${path}`, {
    method: "GET",
    headers: masterHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(MASTER_TIMEOUT_MS),
  });

  const declaredLength = Number(response.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("Master service response is too large.");
  }

  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new Error("Master service response is too large.");
  }

  if (!response.ok) {
    console.error(`Master service request failed with status ${response.status}.`);
    throw new Error("Master service request failed.");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Master service returned invalid data.");
  }
}

function optionalParty(value: unknown): { name?: string; email?: string } | undefined {
  if (!isRecord(value)) return undefined;
  const name = boundedText(value.name, 160);
  const email = boundedText(value.email, 254);
  return name || email ? { name: name || undefined, email: email || undefined } : undefined;
}

export async function fetchMasterTickets(): Promise<MasterTicketListResponse> {
  const payload = await fetchMasterJson(
    "/wp-json/letz/v1/master-tickets?status=new&page=1&per_page=25"
  );
  if (!isRecord(payload)) throw new Error("Master ticket response is invalid.");

  const rows = Array.isArray(payload.items) ? payload.items : [];
  const items = rows.flatMap((value: unknown) => {
    if (!isRecord(value)) return [];
    const id = integer(value.id);
    if (!id) return [];
    return [{
      id,
      title: boundedText(value.title, 300),
      status: boundedText(value.status, 40),
      priority: boundedText(value.priority, 40),
      updatedAt: boundedText(value.updatedAt, 40),
      createdAt: boundedText(value.createdAt, 40),
      responseCount: integer(value.responseCount, 0, 100_000),
      customer: optionalParty(value.customer),
      agent: optionalParty(value.agent),
    }];
  });

  return {
    items,
    total: integer(payload.total),
    page: integer(payload.page, 1),
    per_page: integer(payload.per_page, 25, 100),
  };
}

export async function fetchMasterTicket(rawId: unknown): Promise<MasterTicketDetail> {
  const id = parseMasterId(rawId, "ticket ID");
  const payload = await fetchMasterJson(`/wp-json/letz/v1/master-tickets/${id}`);
  if (!isRecord(payload) || !isRecord(payload.ticket)) {
    throw new Error("Master ticket response is invalid.");
  }

  const ticket = payload.ticket;
  const conversations = (Array.isArray(payload.conversations) ? payload.conversations : [])
    .flatMap((value: unknown) => {
      if (!isRecord(value)) return [];
      const conversationId = integer(value.id);
      if (!conversationId) return [];
      return [{
        id: conversationId,
        ticket_id: integer(value.ticket_id),
        person_id: integer(value.person_id),
        conversation_type: boundedText(value.conversation_type, 60),
        content: boundedText(value.content, 50_000),
        created_at: boundedText(value.created_at, 40),
      }];
    });
  const attachments = (Array.isArray(payload.attachments) ? payload.attachments : [])
    .flatMap((value: unknown) => {
      if (!isRecord(value)) return [];
      const attachmentId = integer(value.id);
      const fullUrl = safeExternalUrl(value.full_url);
      if (!attachmentId || !fullUrl) return [];
      return [{
        id: attachmentId,
        ticket_id: integer(value.ticket_id),
        person_id: integer(value.person_id),
        conversation_id: integer(value.conversation_id),
        file_type: boundedText(value.file_type, 100),
        full_url: fullUrl,
        title: boundedText(value.title, 300),
        file_size: boundedText(value.file_size, 40),
        created_at: boundedText(value.created_at, 40),
      }];
    });

  return {
    ticket: {
      id: parseMasterId(ticket.id, "ticket ID"),
      title: boundedText(ticket.title, 300),
      status: boundedText(ticket.status, 40),
      priority: boundedText(ticket.priority, 40),
      content: boundedText(ticket.content, 50_000),
      createdAt: boundedText(ticket.createdAt, 40),
      updatedAt: boundedText(ticket.updatedAt, 40),
      responseCount: integer(ticket.responseCount, 0, 100_000),
    },
    conversations,
    attachments,
  };
}

export function getMasterSupportAdminUrl(): string {
  const base = getMasterWpBaseUrl().replace(/\/$/, "");
  return `${base}/wp-admin/admin.php?page=fluent-support#/tickets`;
}
