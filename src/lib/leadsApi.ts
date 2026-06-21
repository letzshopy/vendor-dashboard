// src/lib/leadsApi.ts
import { getMasterWpBaseUrl } from "@/lib/wpClient";

export type LeadStatus =
  | "new"
  | "contacted"
  | "discussion_done"
  | "onboarding_started"
  | "store_created"
  | "live"
  | "not_converted";

export type MasterLead = {
  id: number;
  created_at: string;
  updated_at?: string;
  source?: string;
  status: LeadStatus | string;

  full_name: string;
  mobile_number: string;
  email_address: string;
  business_name: string;
  business_category: string;
  gst_registered: string;
  city: string;
  state: string;
  current_selling_method: string;
  product_count: string;
  operation_support_needed: string;

  instagram_link?: string;
  existing_website_link?: string;
  preferred_domain?: string;
  message?: string;

  notes?: string;
  trello_card_url?: string;
  converted_vendor_id?: string;
};

export const leadStatuses: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "discussion_done", label: "Discussion Done" },
  { value: "onboarding_started", label: "Onboarding Started" },
  { value: "store_created", label: "Store Created" },
  { value: "live", label: "Live" },
  { value: "not_converted", label: "Not Converted" },
];

function getLeadAuthHeaders(): Record<string, string> {
  const token = process.env.LETZ_INTERNAL_TOKEN;

  if (!token) {
    throw new Error("Missing LETZ_INTERNAL_TOKEN in dashboard env");
  }

  return {
    "X-Letz-Auth": token,
    Accept: "application/json",
  };
}

function masterBase() {
  return getMasterWpBaseUrl().replace(/\/$/, "");
}

export function leadStatusLabel(status: string) {
  return (
    leadStatuses.find((item) => item.value === status)?.label ||
    status ||
    "New"
  );
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case "new":
      return "bg-sky-500/10 text-sky-300 border-sky-500/20";
    case "contacted":
      return "bg-violet-500/10 text-violet-300 border-violet-500/20";
    case "discussion_done":
      return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    case "onboarding_started":
      return "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20";
    case "store_created":
      return "bg-indigo-500/10 text-indigo-300 border-indigo-500/20";
    case "live":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    case "not_converted":
      return "bg-rose-500/10 text-rose-300 border-rose-500/20";
    default:
      return "bg-slate-800 text-slate-300 border-slate-700";
  }
}

export function formatLeadDate(value?: string) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value.replace(" ", "T")));
  } catch {
    return value;
  }
}

async function readError(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export async function fetchMasterLeads(): Promise<MasterLead[]> {
  try {
    const url = `${masterBase()}/wp-json/letz/v1/master/leads?per_page=100`;

    const res = await fetch(url, {
      headers: getLeadAuthHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to load leads", res.status, await readError(res));
      return [];
    }

    const data = await res.json();
    return Array.isArray(data?.items) ? (data.items as MasterLead[]) : [];
  } catch (error) {
    console.error("fetchMasterLeads error", error);
    return [];
  }
}

export async function fetchMasterLead(id: string | number): Promise<MasterLead | null> {
  try {
    const url = `${masterBase()}/wp-json/letz/v1/master/leads/${id}`;

    const res = await fetch(url, {
      headers: getLeadAuthHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to load lead", res.status, await readError(res));
      return null;
    }

    const data = await res.json();
    return data?.lead ? (data.lead as MasterLead) : null;
  } catch (error) {
    console.error("fetchMasterLead error", error);
    return null;
  }
}

export async function updateMasterLead(
  id: string | number,
  payload: {
    status?: string;
    notes?: string;
    trello_card_url?: string;
    converted_vendor_id?: string;
  }
): Promise<MasterLead | null> {
  const url = `${masterBase()}/wp-json/letz/v1/master/leads/${id}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      ...getLeadAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to update lead: ${res.status} ${await readError(res)}`);
  }

  const data = await res.json();
  return data?.lead ? (data.lead as MasterLead) : null;
}