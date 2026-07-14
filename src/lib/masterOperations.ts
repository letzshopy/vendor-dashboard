import "server-only";

import { getMasterWpBaseUrl } from "@/lib/wpClient";

const MASTER_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

export type JsonRecord = Record<string, unknown>;

export type MasterVendor = {
  blog_id: number;
  store_name: string;
  store_url: string;
  owner_email: string;
  owner_name?: string;
  plan: string;
  status: string;
  billing_state: string;
};

export type MasterSubscriptionItem = {
  blogId: number;
  siteName: string;
  siteUrl: string;
  plan: string;
  billingCycle: string;
  billingStatus: string;
  createdOn: string;
  nextRenewalDate: string;
  autopayEnabled: boolean;
  daysToRenewal: number | null;
  tag: "overdue" | "due_7" | "due_30" | "active" | "no_date" | "unknown";
  isActive: boolean;
};

export type MasterSubscriptionsResponse = {
  summary: {
    activeVendors: number;
    dueIn7Days: number;
    dueIn30Days: number;
    overdue: number;
    total: number;
  };
  items: MasterSubscriptionItem[];
};

export type MasterTicketListItem = {
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

export type MasterTicketListResponse = {
  items: MasterTicketListItem[];
  total: number;
  page: number;
  per_page: number;
};

export type MasterTicketDetail = {
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

export type MasterVendorDetail = {
  blogid: number;
  site: { name: string; url: string };
  account_settings?: {
    owner?: Record<string, string | undefined>;
    contact?: Record<string, string | undefined>;
    profile?: Record<string, string | undefined>;
    business?: Record<string, string | undefined>;
    company?: Record<string, string | undefined>;
    shop?: Record<string, string | undefined>;
  };
  dashboard_access?: {
    locked?: boolean;
    locked_at?: string;
    locked_by?: string;
    unlocked_at?: string;
    unlocked_by?: string;
    storefront_suspended?: boolean;
    storefront_suspended_at?: string;
    storefront_suspended_by?: string;
    storefront_restored_at?: string;
    storefront_restored_by?: string;
  };
  payment_methods: { upi: boolean; easebuzz: boolean; cod: boolean };
  shipping: { provider: string };
  counts: {
    products: number;
    orders: number;
    media: number;
    orders_by_status?: Record<string, number>;
  };
  tickets: { open: number; pending: number; closed: number };
  subscription: {
    plan?: string;
    period?: string;
    status?: string;
    amount?: number | string;
    payment_mode?: string;
    payment_reference?: string;
    last_paid_date?: string;
    next_payment_date?: string;
    last_billed_at?: string;
    next_renewal_at?: string;
  };
  links: { store?: string; dashboard?: string };
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

export async function fetchMasterVendors(): Promise<MasterVendor[]> {
  const payload = await fetchMasterJson("/wp-json/letz/v1/master-vendors");
  if (!isRecord(payload) || !Array.isArray(payload.vendors)) {
    throw new Error("Master vendor response is invalid.");
  }

  return payload.vendors.flatMap((value: unknown) => {
    if (!isRecord(value)) return [];
    const blogId = integer(value.blog_id);
    const storeUrl = safeExternalUrl(value.store_url);
    if (!blogId || !storeUrl) return [];

    return [{
      blog_id: blogId,
      store_name: boundedText(value.store_name, 180),
      store_url: storeUrl,
      owner_email: boundedText(value.owner_email, 254),
      owner_name: boundedText(value.owner_name, 180) || undefined,
      plan: boundedText(value.plan, 80),
      status: boundedText(value.status, 60),
      billing_state: boundedText(value.billing_state, 80),
    }];
  });
}

function subscriptionTag(value: unknown): MasterSubscriptionItem["tag"] {
  const tag = boundedText(value, 20);
  return ["overdue", "due_7", "due_30", "active", "no_date"].includes(tag)
    ? (tag as MasterSubscriptionItem["tag"])
    : "unknown";
}

export async function fetchMasterSubscriptions(): Promise<MasterSubscriptionsResponse> {
  const payload = await fetchMasterJson("/wp-json/letz/v1/master-subscriptions");
  if (!isRecord(payload)) throw new Error("Master subscription response is invalid.");

  const rawSummary = isRecord(payload.summary) ? payload.summary : {};
  const rows = Array.isArray(payload.items) ? payload.items : [];
  const items = rows.flatMap((value: unknown) => {
    if (!isRecord(value)) return [];
    const blogId = integer(value.blogId);
    const siteUrl = safeExternalUrl(value.siteUrl);
    if (!blogId || !siteUrl) return [];
    const days = Number(value.daysToRenewal);

    return [{
      blogId,
      siteName: boundedText(value.siteName, 180),
      siteUrl,
      plan: boundedText(value.plan, 80),
      billingCycle: boundedText(value.billingCycle, 40),
      billingStatus: boundedText(value.billingStatus, 60),
      createdOn: boundedText(value.createdOn, 40),
      nextRenewalDate: boundedText(value.nextRenewalDate, 40),
      autopayEnabled: value.autopayEnabled === true,
      daysToRenewal: Number.isSafeInteger(days) && Math.abs(days) <= 36_500 ? days : null,
      tag: subscriptionTag(value.tag),
      isActive: value.isActive === true,
    }];
  });

  return {
    summary: {
      activeVendors: integer(rawSummary.activeVendors),
      dueIn7Days: integer(rawSummary.dueIn7Days),
      dueIn30Days: integer(rawSummary.dueIn30Days),
      overdue: integer(rawSummary.overdue),
      total: integer(rawSummary.total),
    },
    items,
  };
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

function stringRecord(value: unknown): Record<string, string | undefined> | undefined {
  if (!isRecord(value)) return undefined;
  const result: Record<string, string | undefined> = {};
  for (const [key, entry] of Object.entries(value).slice(0, 100)) {
    result[boundedText(key, 80)] = boundedText(entry, 500) || undefined;
  }
  return result;
}

export async function fetchMasterVendorDetail(rawBlogId: unknown): Promise<MasterVendorDetail> {
  const blogId = parseMasterId(rawBlogId, "vendor blog ID");
  const payload = await fetchMasterJson(`/wp-json/letz/v1/master-vendors/${blogId}`);
  if (!isRecord(payload) || !isRecord(payload.site)) {
    throw new Error("Master vendor response is invalid.");
  }

  const account = isRecord(payload.account_settings) ? payload.account_settings : {};
  const access = isRecord(payload.dashboard_access) ? payload.dashboard_access : {};
  const payments = isRecord(payload.payment_methods) ? payload.payment_methods : {};
  const shipping = isRecord(payload.shipping) ? payload.shipping : {};
  const counts = isRecord(payload.counts) ? payload.counts : {};
  const tickets = isRecord(payload.tickets) ? payload.tickets : {};
  const subscription = isRecord(payload.subscription) ? payload.subscription : {};
  const links = isRecord(payload.links) ? payload.links : {};

  return {
    blogid: blogId,
    site: {
      name: boundedText(payload.site.name, 180),
      url: safeExternalUrl(payload.site.url),
    },
    account_settings: {
      owner: stringRecord(account.owner),
      contact: stringRecord(account.contact),
      profile: stringRecord(account.profile),
      business: stringRecord(account.business),
      company: stringRecord(account.company),
      shop: stringRecord(account.shop),
    },
    dashboard_access: {
      locked: access.locked === true,
      locked_at: boundedText(access.locked_at, 80) || undefined,
      locked_by: boundedText(access.locked_by, 254) || undefined,
      unlocked_at: boundedText(access.unlocked_at, 80) || undefined,
      unlocked_by: boundedText(access.unlocked_by, 254) || undefined,
      storefront_suspended: access.storefront_suspended === true,
      storefront_suspended_at:
        boundedText(access.storefront_suspended_at, 80) || undefined,
      storefront_suspended_by:
        boundedText(access.storefront_suspended_by, 254) || undefined,
      storefront_restored_at:
        boundedText(access.storefront_restored_at, 80) || undefined,
      storefront_restored_by:
        boundedText(access.storefront_restored_by, 254) || undefined,
    },
    payment_methods: {
      upi: payments.upi === true,
      easebuzz: payments.easebuzz === true,
      cod: payments.cod === true,
    },
    shipping: { provider: boundedText(shipping.provider, 80) },
    counts: {
      products: integer(counts.products),
      orders: integer(counts.orders),
      media: integer(counts.media),
    },
    tickets: {
      open: integer(tickets.open),
      pending: integer(tickets.pending),
      closed: integer(tickets.closed),
    },
    subscription: {
      plan: boundedText(subscription.plan, 80) || undefined,
      period: boundedText(subscription.period, 40) || undefined,
      status: boundedText(subscription.status, 60) || undefined,
      amount:
        typeof subscription.amount === "number"
          ? subscription.amount
          : boundedText(subscription.amount, 40) || undefined,
      payment_mode: boundedText(subscription.payment_mode, 80) || undefined,
      payment_reference:
        boundedText(subscription.payment_reference, 200) || undefined,
      last_paid_date: boundedText(subscription.last_paid_date, 80) || undefined,
      next_payment_date:
        boundedText(subscription.next_payment_date, 80) || undefined,
      last_billed_at: boundedText(subscription.last_billed_at, 80) || undefined,
      next_renewal_at:
        boundedText(subscription.next_renewal_at, 80) || undefined,
    },
    links: {
      store: safeExternalUrl(links.store) || undefined,
      dashboard: safeExternalUrl(links.dashboard) || undefined,
    },
  };
}

export function getMasterSupportAdminUrl(): string {
  const base = getMasterWpBaseUrl().replace(/\/$/, "");
  return `${base}/wp-admin/admin.php?page=fluent-support#/tickets`;
}
