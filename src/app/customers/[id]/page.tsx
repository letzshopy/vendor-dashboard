import Link from "next/link";
import { formatOrderDate } from "@/lib/datetime";
import { statusPillClass } from "@/lib/order-utils";
import { headers } from "next/headers";

function getBaseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return process.env.NEXT_PUBLIC_BASE_URL || (host ? `${proto}://${host}` : "http://localhost:3000");
}

type Customer = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  billing?: any;
  shipping?: any;
  total_spent: number;
  date_created?: string | null;
};

type Order = {
  id: number;
  number?: string;
  status: string;
  date_created_gmt?: string;
  total: string;
  payment_method_title?: string;
  line_items?: { id: number; name: string; sku?: string; quantity: number }[];
};

async function getCustomer(id: string) {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/customers/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load customer");
  return res.json() as Promise<{ customer: Customer; orders: Order[]; order_total: number }>;
}

function AddressBlock({ title, a }: { title: string; a?: any }) {
  if (!a) return null;
  return (
    <div className="bg-white rounded border p-3">
      <div className="font-medium mb-1">{title}</div>
      <div className="text-sm text-slate-700">
        {[a.first_name, a.last_name].filter(Boolean).join(" ") || "-"}
        <div>{a.address_1 || ""}</div>
        <div>{a.address_2 || ""}</div>
        <div>{[a.city, a.state, a.postcode].filter(Boolean).join(", ")}</div>
        <div>{a.country || ""}</div>
        <div>{a.phone || ""}</div>
      </div>
    </div>
  );
}

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const { customer, orders, order_total } = await getCustomer(params.id);
  const name =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() || "(guest)";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customer — {name}</h1>
        <Link href="/customers" className="text-sm text-blue-600 hover:underline">Back to list</Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded border p-4">
          <div className="text-sm text-slate-600">Email</div>
          <div className="font-medium">{customer.email || "-"}</div>
          <div className="mt-3 text-sm text-slate-600">Total Spent</div>
          <div className="font-medium">₹{customer.total_spent.toFixed(2)}</div>
          <div className="mt-3 text-sm text-slate-600">Joined</div>
          <div className="font-medium" suppressHydrationWarning>
            {customer.date_created ? formatOrderDate(customer.date_created) : "-"}
          </div>
          <div className="mt-3 text-sm text-slate-600">Total Orders</div>
          <div className="font-medium">{order_total}</div>
        </div>

        <AddressBlock title="Billing address" a={customer.billing} />
        <AddressBlock title="Shipping address" a={customer.shipping} />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Orders</h2>
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">Date</th>
                <th className="p-2">Items</th>
                <th className="p-2">Status</th>
                <th className="p-2">Total</th>
                <th className="p-2">Payment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-2">
                    <Link className="text-blue-600 hover:underline" href={`/orders/${o.id}`}>
                      {o.number || o.id}
                    </Link>
                  </td>
                  <td className="p-2" suppressHydrationWarning>
                    {o.date_created_gmt ? formatOrderDate(o.date_created_gmt) : "-"}
                  </td>
                  <td className="p-2">
                    {(o.line_items || []).map((li) => (
                      <div key={li.id}>
                        {li.name}{li.sku ? ` (${li.sku})` : ""} × {li.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="p-2">
                    <span className={statusPillClass(o.status)}>{o.status.replace("_", " ")}</span>
                  </td>
                  <td className="p-2 font-medium">₹{o.total}</td>
                  <td className="p-2">{o.payment_method_title || "-"}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">No orders yet for this customer.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
