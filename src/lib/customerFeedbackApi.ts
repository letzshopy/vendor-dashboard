// src/lib/customerFeedbackApi.ts
import { getWpBaseUrl } from "@/lib/wpClient";
import { getWooClient } from "@/lib/woo";

export type CustomerFeedbackStatus = "show" | "hide";

export type CustomerFeedback = {
  id: number;
  customer_name: string;
  customer_mobile: string;
  customer_message: string;
  order_id: string;
  order_number: string;
  rating?: number;
  status: CustomerFeedbackStatus | string;
  show_on_homepage?: "yes" | "no";
  image_id?: number;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
};

export type FeedbackOrderOption = {
  id: number;
  number: string;
  customer_name: string;
  customer_mobile: string;
  total: string;
  status: string;
  date_created: string;
};

function getFeedbackAuthHeaders(): Record<string, string> {
  const token = process.env.LETZ_INTERNAL_TOKEN;

  if (!token) {
    throw new Error("Missing LETZ_INTERNAL_TOKEN in dashboard env");
  }

  return {
    "X-Letz-Auth": token,
    Accept: "application/json",
  };
}

async function vendorWpBase() {
  const base = await getWpBaseUrl();
  return base.replace(/\/$/, "");
}

async function readError(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export function feedbackStatusLabel(status: string) {
  return status === "hide" ? "Hidden" : "Showing";
}

export function feedbackStatusClass(status: string) {
  if (status === "hide") {
    return "bg-slate-100 text-slate-600 border-slate-200";
  }

  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export function formatFeedbackDate(value?: string) {
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

export async function fetchCustomerFeedbackList(): Promise<CustomerFeedback[]> {
  try {
    const base = await vendorWpBase();
    const url = `${base}/wp-json/letz/v1/customer-feedback?per_page=100`;

    const res = await fetch(url, {
      headers: getFeedbackAuthHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to load customer feedback", res.status, await readError(res));
      return [];
    }

    const data = await res.json();
    return Array.isArray(data?.items) ? (data.items as CustomerFeedback[]) : [];
  } catch (error) {
    console.error("fetchCustomerFeedbackList error", error);
    return [];
  }
}

export async function fetchCustomerFeedback(id: string | number): Promise<CustomerFeedback | null> {
  try {
    const base = await vendorWpBase();
    const url = `${base}/wp-json/letz/v1/customer-feedback/${id}`;

    const res = await fetch(url, {
      headers: getFeedbackAuthHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to load customer feedback item", res.status, await readError(res));
      return null;
    }

    const data = await res.json();
    return data?.feedback ? (data.feedback as CustomerFeedback) : null;
  } catch (error) {
    console.error("fetchCustomerFeedback error", error);
    return null;
  }
}

export async function createCustomerFeedback(payload: {
  customer_name: string;
  customer_mobile?: string;
  customer_message: string;
  order_id?: string;
  order_number?: string;
  status?: CustomerFeedbackStatus;
  image_id?: number;
}) {
  const base = await vendorWpBase();

  const res = await fetch(`${base}/wp-json/letz/v1/customer-feedback`, {
    method: "POST",
    headers: {
      ...getFeedbackAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to create feedback: ${res.status} ${await readError(res)}`);
  }

  return await res.json();
}

export async function updateCustomerFeedback(
  id: string | number,
  payload: {
    customer_name?: string;
    customer_mobile?: string;
    customer_message?: string;
    order_id?: string;
    order_number?: string;
    status?: CustomerFeedbackStatus;
    image_id?: number;
  }
) {
  const base = await vendorWpBase();

  const res = await fetch(`${base}/wp-json/letz/v1/customer-feedback/${id}`, {
    method: "PATCH",
    headers: {
      ...getFeedbackAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to update feedback: ${res.status} ${await readError(res)}`);
  }

  return await res.json();
}

export async function deleteCustomerFeedback(id: string | number) {
  const base = await vendorWpBase();

  const res = await fetch(`${base}/wp-json/letz/v1/customer-feedback/${id}`, {
    method: "DELETE",
    headers: getFeedbackAuthHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to delete feedback: ${res.status} ${await readError(res)}`);
  }

  return await res.json();
}

export async function uploadCustomerFeedbackImage(file: File): Promise<{
  image_id: number;
  image_url: string;
}> {
  const base = await vendorWpBase();

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${base}/wp-json/letz/v1/customer-feedback/image`, {
    method: "POST",
    headers: getFeedbackAuthHeaders(),
    body: fd,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to upload feedback image: ${res.status} ${await readError(res)}`);
  }

  const data = await res.json();

  return {
    image_id: Number(data?.image_id || 0),
    image_url: String(data?.image_url || ""),
  };
}

export async function fetchFeedbackOrderOptions(): Promise<FeedbackOrderOption[]> {
  try {
    const woo = await getWooClient();

    const { data } = await woo.get("/orders", {
      params: {
        per_page: 100,
        page: 1,
        orderby: "date",
        order: "desc",
        status: "pending,processing,on-hold,completed,refunded,cancelled,failed",
      },
    });

    if (!Array.isArray(data)) return [];

    return data.map((order: any) => {
      const billing = order?.billing || {};
      const first = String(billing.first_name || "").trim();
      const last = String(billing.last_name || "").trim();

      return {
        id: Number(order.id || 0),
        number: String(order.number || order.id || ""),
        customer_name: [first, last].filter(Boolean).join(" "),
        customer_mobile: String(billing.phone || ""),
        total: String(order.total || "0"),
        status: String(order.status || ""),
        date_created: String(order.date_created || ""),
      };
    });
  } catch (error) {
    console.error("fetchFeedbackOrderOptions error", error);
    return [];
  }
}