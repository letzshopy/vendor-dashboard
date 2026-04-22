import { notFound } from "next/navigation";
import { getWooClient } from "@/lib/woo";
import type { WCOrder } from "@/lib/order-utils";
import OrderDetailClient from "./OrderDetailClient";

export const dynamic = "force-dynamic";

async function fetchOrder(id: number): Promise<WCOrder> {
  const woo = await getWooClient();
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
    <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <OrderDetailClient initialOrder={order as any} />
    </main>
  );
}