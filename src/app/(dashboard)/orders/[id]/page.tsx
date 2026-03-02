import { notFound } from "next/navigation";
import { woo } from "@/lib/woo";
import type { WCOrder } from "@/lib/order-utils";
import OrderDetailClient from "./OrderDetailClient";

export const dynamic = "force-dynamic";

async function fetchOrder(id: number): Promise<WCOrder> {
  const { data } = await woo.get<WCOrder>(`/orders/${id}`);
  if (!data) {
    throw new Error("Order not found");
  }
  return data;
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ✅ Next 15 style: await params
  const { id } = await params;

  const orderId = Number(id);
  if (!Number.isFinite(orderId)) {
    notFound();
  }

  let order: WCOrder;
  try {
    order = await fetchOrder(orderId);
  } catch {
    notFound();
  }

  return (
    <main className="p-6 max-w-6xl xl:max-w-7xl mx-auto">
      <OrderDetailClient initialOrder={order as any} />
    </main>
  );
}
