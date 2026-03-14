// src/app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type NotificationItem = {
  id: string;
  type: "new_order" | "upi_pending";
  order_id: number;
  order_number: string;
  total: string;
  customer?: string;
  created_at?: string;
  message: string;
};

const OPEN_STATUSES = [
  "pending",
  "pending-payment",
  "processing",
  "on-hold",
];

export async function GET() {
  try {
    const woo = await getWooClient();
    // Don’t pass status filter to Woo – some setups 400 on that.
    const { data } = await woo.get("/orders", {
      params: {
        per_page: 50,
        orderby: "date",
        order: "desc",
      },
    });

    const orders = (data as any[]) || [];
    const items: NotificationItem[] = [];

    for (const o of orders) {
      const status: string = (o.status || "").toLowerCase();
      if (!OPEN_STATUSES.includes(status)) continue;

      const orderId = Number(o.id);
      const orderNumber = String(o.number || orderId);
      const total = String(o.total || "0.00");

      const customerName = (
        ((o.billing?.first_name as string) || "") +
        " " +
        ((o.billing?.last_name as string) || "")
      )
        .trim()
        .replace(/\s+/g, " ");

      const createdAt: string =
        o.date_created_gmt || o.date_created || new Date().toISOString();

      const meta = (o.meta_data || []) as Array<{ key: string; value: any }>;
      const upiFlag =
        meta.find(
          (m) =>
            m.key === "_letz_upi_verified" || m.key === "letz_upi_verified"
        ) || null;
      const upiVerified =
        upiFlag &&
        String(upiFlag.value).toLowerCase().trim() === "yes";

      const paymentTitle = String(
        o.payment_method_title || o.payment_method || ""
      ).toLowerCase();

      const isUPI =
        paymentTitle.includes("upi") ||
        paymentTitle.includes("qr") ||
        paymentTitle.includes("gpay");

      // New order notification (for any open status)
      items.push({
        id: `new_order_${orderId}`,
        type: "new_order",
        order_id: orderId,
        order_number: orderNumber,
        total,
        customer: customerName || undefined,
        created_at: createdAt,
        message: customerName
          ? `New order placed by ${customerName}.`
          : "New order placed.",
      });

      // Pending UPI verification notification
      if (isUPI && !upiVerified) {
        items.push({
          id: `upi_pending_${orderId}`,
          type: "upi_pending",
          order_id: orderId,
          order_number: orderNumber,
          total,
          customer: customerName || undefined,
          created_at: createdAt,
          message:
            "UPI payment needs manual verification in the order details.",
        });
      }
    }

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("Notifications API error:", e?.message || e);
    // Still return 200 so UI doesn’t break – just no notifications
    return NextResponse.json({
      items: [],
      error: "Failed to load notifications",
    });
  }
}
