// src/lib/order-utils.ts
export type WCLineItem = {
  id?: number;
  name?: string;
  product_id?: number;
  variation_id?: number;
  sku?: string;
  quantity: number;
  price?: number | string;
  total?: string;
  subtotal?: string;
  image?: { src?: string };
};

export type WCOrder = {
  id: number;
  number: string;
  date_created_gmt?: string;
  status: "pending" | "processing" | "on-hold" | "completed" | "cancelled" | "refunded" | "failed" | "trash" | string;
  total: string;
  payment_method_title?: string;
  billing?: {
    first_name?: string; last_name?: string; phone?: string; email?: string;
    address_1?: string; address_2?: string; city?: string; state?: string; postcode?: string;
  };
  shipping?: WCOrder["billing"];
  line_items?: WCLineItem[];
  currency?: string;
};

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending payment",
  processing: "Processing",
  "on-hold": "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  failed: "Failed",
  trash: "Trash",
};

export const ORDER_STATUSES = [
  "pending","processing","on-hold","completed","cancelled","refunded","failed","trash"
] as const;

export function statusPillClass(status: string) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize";
  switch (status) {
    case "completed": return `${base} bg-green-100 text-green-800`;
    case "processing": return `${base} bg-blue-100 text-blue-800`;
    case "on-hold": return `${base} bg-amber-100 text-amber-800`;
    case "cancelled": return `${base} bg-gray-200 text-gray-700`;
    case "refunded": return `${base} bg-purple-100 text-purple-800`;
    case "failed": return `${base} bg-rose-100 text-rose-800`;
    default: return `${base} bg-slate-100 text-slate-800`;
  }
}
