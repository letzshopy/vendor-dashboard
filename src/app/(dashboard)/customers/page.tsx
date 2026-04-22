import Link from "next/link";
import { formatOrderDate } from "@/lib/datetime";
import { statusPillClass } from "@/lib/order-utils";
import { headers } from "next/headers";

async function getBaseUrl(): Promise<string> {
  const h = await headers(); // headers() is a Promise in your setup
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    (host ? `${proto}://${host}` : "http://localhost:3000")
  );
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
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/customers/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load customer");
  return res.json() as Promise<{
    customer: Customer;
    orders: Order[];
    order_total: number;
  }>;
}

function AddressBlock({ title, a }: { title: string; a?: any }) {
  if (!a) return null;
  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-100 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
        {title}
      </div>
      <div className="text-sm text-slate-800 space-y-1">
        <div className="font-medium">
          {[a.first_name, a.last_name].filter(Boolean).join(" ") || "-"}
        </div>
        {a.address_1 && <div>{a.address_1}</div>}
        {a.address_2 && <div>{a.address_2}</div>}
        <div className="text-slate-600">
          {[a.city, a.state, a.postcode].filter(Boolean).join(", ")}
        </div>
        {a.country && <div className="text-slate-600">{a.country}</div>}
        {a.phone && (
          <div className="text-slate-700">
            <span className="text-xs text-slate-500 mr-1">Mobile:</span>
            {a.phone}
          </div>
        )}
      </div>
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  // ✅ Next 15: params is a Promise
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { customer, orders, order_total } = await getCustomer(id);
  const name =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() ||
    "(guest)";

  const initials =
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2) || "?";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {name}
              </h1>
              <p className="text-xs text-slate-500">
                Customer profile &amp; order history
              </p>
            </div>
          </div>

          <Link
            href="/customers"
            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back to customers
          </Link>
        </div>

        {/* Summary + addresses */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Summary card */}
          <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-100 p-4 flex flex-col gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Contact
              </div>
              <div className="mt-1 text-sm text-slate-800">
                <div>{customer.email || "No email"}</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total spent
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                ₹{customer.total_spent.toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Joined
              </div>
              <div
                className="mt-1 text-sm text-slate-800"
                suppressHydrationWarning
              >
                {customer.date_created
                  ? formatOrderDate(customer.date_created)
                  : "-"}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total orders
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {order_total}
              </div>
            </div>
          </div>

          {/* Addresses */}
          <AddressBlock title="Billing address" a={customer.billing} />
          <AddressBlock title="Shipping address" a={customer.shipping} />
        </div>

        {/* Orders table */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-slate-900">Orders</h2>
            {orders.length > 0 && (
              <span className="text-xs text-slate-500">
                Showing {orders.length} order
                {orders.length === 1 ? "" : "s"} for this customer
              </span>
            )}
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 pl-4 pr-3 text-left font-medium">#</th>
                  <th className="py-2.5 px-3 text-left font-medium">Date</th>
                  <th className="py-2.5 px-3 text-left font-medium">Items</th>
                  <th className="py-2.5 px-3 text-left font-medium">Status</th>
                  <th className="py-2.5 px-3 text-right font-medium">Total</th>
                  <th className="py-2.5 pr-4 pl-3 text-left font-medium">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, idx) => (
                  <tr
                    key={o.id}
                    className={`border-b border-slate-100 ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    <td className="py-2.5 pl-4 pr-3">
                      <Link
                        className="text-blue-600 hover:underline"
                        href={`/orders/${o.id}`}
                      >
                        #{o.number || o.id}
                      </Link>
                    </td>
                    <td
                      className="py-2.5 px-3 whitespace-nowrap"
                      suppressHydrationWarning
                    >
                      {o.date_created_gmt
                        ? formatOrderDate(o.date_created_gmt)
                        : "-"}
                    </td>
                    <td className="py-2.5 px-3">
                      {(o.line_items || []).map((li) => (
                        <div key={li.id} className="text-slate-800">
                          {li.name}
                          {li.sku ? ` (${li.sku})` : ""} × {li.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={statusPillClass(o.status)}>
                        {o.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                      ₹{o.total}
                    </td>
                    <td className="py-2.5 pr-4 pl-3 text-slate-800">
                      {o.payment_method_title || "-"}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-6 text-center text-slate-500 text-sm"
                    >
                      No orders yet for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
