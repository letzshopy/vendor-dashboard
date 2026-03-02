// src/app/api/orders/[id]/edit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

type Address = {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  email?: string;
};

type EditableLineItem = {
  id?: number;
  product_id?: number;
  name?: string;
  sku?: string;
  quantity?: number;
  price?: number;
  isNew?: boolean;
  removed?: boolean;
};

function sanitizeBilling(b: any): Address {
  const src = (b || {}) as Address;
  return {
    first_name: src.first_name || "",
    last_name: src.last_name || "",
    company: src.company || "",
    address_1: src.address_1 || "",
    address_2: src.address_2 || "",
    city: src.city || "",
    state: src.state || "",
    postcode: src.postcode || "",
    country: src.country || "",
    phone: src.phone || "",
    email: src.email || "",
  };
}

function sanitizeShipping(s: any): Address {
  const src = (s || {}) as Address;
  // Woo shipping object does NOT support phone/email → don’t send them
  return {
    first_name: src.first_name || "",
    last_name: src.last_name || "",
    company: src.company || "",
    address_1: src.address_1 || "",
    address_2: src.address_2 || "",
    city: src.city || "",
    state: src.state || "",
    postcode: src.postcode || "",
    country: src.country || "",
  };
}

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isFinite(orderId)) {
    return NextResponse.json(
      { error: "Invalid order ID" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const billing = body.billing || null;
    const shipping = body.shipping || null;
    const items: EditableLineItem[] = Array.isArray(body.items)
      ? body.items
      : [];

    const payload: any = {};

    // Only send allowed fields
    if (billing) payload.billing = sanitizeBilling(billing);
    if (shipping) payload.shipping = sanitizeShipping(shipping);

    if (items.length) {
      payload.line_items = items
        .map((raw) => {
          // New item that user later removed → ignore completely
          if (raw.isNew && raw.removed) return null;

          const qty = Number(raw.quantity || 0);
          const price = Number(raw.price || 0);

          // Existing item removed → send quantity=0
          if (raw.id && raw.removed) {
            return { id: raw.id, quantity: 0 };
          }

          const lineQty = qty || 1;
          const lineTotal = lineQty * price;

          const base: any = {
            name: raw.name || "",
            quantity: lineQty,
            subtotal: lineTotal.toFixed(2),
            total: lineTotal.toFixed(2),
          };

          if (raw.id && !raw.isNew) base.id = raw.id;
          if (raw.product_id) base.product_id = raw.product_id;
          if (raw.sku) base.sku = raw.sku;

          return base;
        })
        .filter(Boolean);
    }

    const { data } = await woo.put(`/orders/${orderId}`, payload);
    return NextResponse.json(data);
  } catch (err: any) {
    // Try to surface WooCommerce REST error message
    const wooData = err?.response?.data;
    const message =
      wooData?.message ||
      err?.message ||
      "Failed to update order";

    console.error("Order edit error:", wooData || err);

    return NextResponse.json(
      { error: message },
      { status: err?.response?.status || 500 }
    );
  }
}
