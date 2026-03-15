import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";
import { mergeShipmentMeta } from "@/lib/shipment-meta";

type ShipmentRow = {
  id: number;
  number: string;
  customerName: string;
  status: string;
  courier: string;
  awb: string;
};

type BulkUpdatePayload = {
  updates: {
    orderId: number;
    courier: string;
    awb: string;
  }[];
};

const OPEN_STATUSES = new Set<string>([
  "processing",
]);

export async function GET() {
  try {
    const woo = await getWooClient();
    const res = await woo.get("orders", {
      params: {
        status: "any",
        per_page: 100,
        page: 1,
        orderby: "date",
        order: "desc",
      },
    });

    const orders: any[] = (res as any).data ?? res;

    const rows: ShipmentRow[] = orders
      .filter((o) => OPEN_STATUSES.has(String(o.status || "").toLowerCase()))
      .map((o) => {
        const billingName = [o.billing?.first_name, o.billing?.last_name]
          .filter(Boolean)
          .join(" ");

        const shippingName = [o.shipping?.first_name, o.shipping?.last_name]
          .filter(Boolean)
          .join(" ");

        const customerName = billingName || shippingName || "—";

        return {
          id: o.id,
          number: o.number?.toString() ?? String(o.id),
          customerName,
          status: String(o.status || ""),
          courier: "",
          awb: "",
        };
      });

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("GET /api/orders/shipments error:", err?.message || err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const woo = await getWooClient();
    const body = (await req.json()) as BulkUpdatePayload;
    const updates = Array.isArray(body.updates) ? body.updates : [];

    if (!updates.length) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    const shippedAtIso = new Date().toISOString();

    const results = await Promise.all(
      updates.map(async ({ orderId, courier, awb }) => {
        const getRes = await woo.get(`orders/${orderId}`);
        const order: any = (getRes as any).data ?? getRes;

        const meta_data = mergeShipmentMeta(order.meta_data, {
          courier: courier ?? "",
          awb: awb ?? "",
          status: "shipped",
          shippedDate: shippedAtIso,
        });

        const putRes = await woo.put(`orders/${orderId}`, {
          status: "completed",
          meta_data,
        });

        const updated: any = (putRes as any).data ?? putRes;

        return {
          id: updated.id,
          number: updated.number,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      updated: results.length,
      results,
    });
  } catch (err: any) {
    console.error("POST /api/orders/shipments error:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: "Failed to update shipments" },
      { status: 200 }
    );
  }
}