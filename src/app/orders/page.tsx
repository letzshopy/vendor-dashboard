import { getBaseUrl } from "@/lib/absolute-url";
import { WCOrder } from "@/lib/order-utils";
import OrdersLocalController from "./OrdersLocalController";

async function fetchAll() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") as string) || getBaseUrl();
  const res = await fetch(`${base}/api/orders/all`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load orders");
  return res.json();
}

export default async function OrdersPage() {
  const { data }: { data: WCOrder[] } = await fetchAll();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Latest Orders</h1>
        <div className="text-sm text-slate-500">{data.length} total (client-filtered)</div>
      </div>

      <OrdersLocalController initial={data} />
    </div>
  );
}
