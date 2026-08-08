import { assertStoreFeatureAvailable } from "@/lib/storeCapabilityServer";
// src/lib/saleEventsApi.ts
import { getWpBaseUrl, getStoreInternalAuthHeader } from "@/lib/wpClient";
import { getWooClient } from "@/lib/woo";

export type SaleEventStatus = "scheduled" | "live" | "closed";
export type SalePricingType = "percentage" | "fixed_amount" | "manual" | "free_shipping";

export type SaleEvent = {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  end_date: string;
  status: SaleEventStatus;
  category_ids: number[];
  explicit_product_ids: number[];
  excluded_product_ids: number[];
  effective_product_ids: number[];
  effective_product_count: number;
  pricing_type: SalePricingType;
  discount_value: number;
  manual_prices: Record<string, number>;
  free_shipping: boolean;
  homepage_visible: boolean;
  promotional_copy: string;
  created_at?: string;
  updated_at?: string;
};

export type SaleEventCategoryOption = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
};

export type SaleEventProductOption = {
  id: number;
  name: string;
  type: string;
  status: string;
  sku: string;
  regular_price: string;
  price: string;
  image_url: string;
  category_ids: number[];
};

export type SaleEventPayload = {
  title: string;
  start_date: string;
  end_date: string;
  category_ids: number[];
  explicit_product_ids: number[];
  excluded_product_ids: number[];
  pricing_type: SalePricingType;
  discount_value: number;
  manual_prices: Record<string, number>;
  free_shipping: boolean;
  homepage_visible: boolean;
  promotional_copy: string;
};

async function getSaleEventAuthHeaders(): Promise<Record<string, string>> {
  return {
    ...(await getStoreInternalAuthHeader()),
    Accept: "application/json",
  };
}

async function vendorWpBase() {
  await assertStoreFeatureAvailable("sale_events");
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

function normalizeError(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export function saleEventStatusLabel(status: SaleEventStatus | string) {
  if (status === "live") return "Live";
  if (status === "closed") return "Closed";
  return "Scheduled";
}

export function saleEventStatusClass(status: SaleEventStatus | string) {
  if (status === "live") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "closed") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function salePricingLabel(type: SalePricingType | string, value = 0) {
  if (type === "percentage") return `${Number(value || 0)}% off`;
  if (type === "fixed_amount") {
    return `₹${Number(value || 0).toLocaleString("en-IN")} off`;
  }
  if (type === "free_shipping") return "Free Shipping";
  return "Manual prices";
}

export function formatSaleEventDate(value?: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

export async function fetchSaleEvents(): Promise<SaleEvent[]> {
  try {
    const base = await vendorWpBase();
    const res = await fetch(`${base}/wp-json/letz/v1/sale-events`, {
      headers: await getSaleEventAuthHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(
        "fetchSaleEvents error",
        res.status,
        await readError(res)
      );
      return [];
    }

    const data = await res.json();
    return Array.isArray(data?.items) ? (data.items as SaleEvent[]) : [];
  } catch (error) {
    console.error(
      "fetchSaleEvents error",
      normalizeError(error, "Failed to load sale events")
    );
    return [];
  }
}

export async function fetchSaleEvent(
  id: string | number
): Promise<SaleEvent | null> {
  try {
    const base = await vendorWpBase();
    const res = await fetch(`${base}/wp-json/letz/v1/sale-events/${id}`, {
      headers: await getSaleEventAuthHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(
        "fetchSaleEvent error",
        res.status,
        await readError(res)
      );
      return null;
    }

    const data = await res.json();
    return data?.event ? (data.event as SaleEvent) : null;
  } catch (error) {
    console.error(
      "fetchSaleEvent error",
      normalizeError(error, "Failed to load sale event")
    );
    return null;
  }
}

export async function createSaleEvent(
  payload: SaleEventPayload
): Promise<SaleEvent> {
  const base = await vendorWpBase();

  const res = await fetch(`${base}/wp-json/letz/v1/sale-events`, {
    method: "POST",
    headers: {
      ...(await getSaleEventAuthHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Failed to create sale event: ${res.status} ${await readError(res)}`
    );
  }

  const data = await res.json();
  if (!data?.event) {
    throw new Error("Sale Event API returned no event");
  }

  return data.event as SaleEvent;
}

export async function updateSaleEvent(
  id: string | number,
  payload: SaleEventPayload
): Promise<SaleEvent> {
  const base = await vendorWpBase();

  const res = await fetch(`${base}/wp-json/letz/v1/sale-events/${id}`, {
    method: "PATCH",
    headers: {
      ...(await getSaleEventAuthHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Failed to update sale event: ${res.status} ${await readError(res)}`
    );
  }

  const data = await res.json();
  if (!data?.event) {
    throw new Error("Sale Event API returned no event");
  }

  return data.event as SaleEvent;
}

export async function deleteSaleEvent(id: string | number) {
  const base = await vendorWpBase();

  const res = await fetch(`${base}/wp-json/letz/v1/sale-events/${id}`, {
    method: "DELETE",
    headers: await getSaleEventAuthHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Failed to delete sale event: ${res.status} ${await readError(res)}`
    );
  }

  return await res.json();
}

async function fetchAllWoo<T>(
  path: string,
  params: Record<string, unknown>,
  maxPages = 25
): Promise<T[]> {
  const woo = await getWooClient();
  const items: T[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    try {
      const res = await woo.get<T[]>(path, {
        params: { ...params, per_page: 100, page },
      });

      const rows = Array.isArray(res.data) ? res.data : [];
      items.push(...rows);

      const totalPages = Number(
        res.headers?.["x-wp-totalpages"] ||
          res.headers?.["x-wp-total-pages"] ||
          0
      );

      if (totalPages > 0 && page >= totalPages) break;
      if (rows.length < 100) break;
    } catch (error: any) {
      const status = Number(error?.response?.status || 0);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "WooCommerce request failed";

      console.warn(`fetchAllWoo ${path} page ${page} failed`, {
        status,
        message,
      });

      // Keep the form usable instead of crashing the whole route.
      // Earlier pages, if any, are preserved.
      break;
    }
  }

  return items;
}

export async function fetchSaleEventFormOptions(): Promise<{
  categories: SaleEventCategoryOption[];
  products: SaleEventProductOption[];
}> {
  const [rawCategories, rawProducts] = await Promise.all([
    fetchAllWoo<any>("/products/categories", {
      hide_empty: false,
      orderby: "name",
      order: "asc",
    }),
    fetchAllWoo<any>("/products", {
      status: "publish",
      orderby: "date",
      order: "desc",
    }),
  ]);

  const categories: SaleEventCategoryOption[] = rawCategories
    .map((item: any) => ({
      id: Number(item?.id || 0),
      name: String(item?.name || ""),
      slug: String(item?.slug || ""),
      parent: Number(item?.parent || 0),
      count: Number(item?.count || 0),
    }))
    .filter((item) => item.id > 0 && item.name);

  const products: SaleEventProductOption[] = rawProducts
    .map((item: any) => ({
      id: Number(item?.id || 0),
      name: String(item?.name || ""),
      type: String(item?.type || "simple"),
      status: String(item?.status || "publish"),
      sku: String(item?.sku || ""),
      regular_price: String(item?.regular_price || item?.price || ""),
      price: String(item?.price || item?.regular_price || ""),
      image_url: String(item?.images?.[0]?.src || ""),
      category_ids: Array.isArray(item?.categories)
        ? item.categories.map((cat: any) => Number(cat?.id || 0)).filter(Boolean)
        : [],
    }))
    .filter((item) => item.id > 0 && item.name)
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  return { categories, products };
}
