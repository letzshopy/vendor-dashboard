import Link from "next/link";
import { formatOrderDate } from "@/lib/datetime";
import { statusPillClass } from "@/lib/order-utils";
import { headers } from "next/headers";

async function getBaseUrl(): Promise<string> {
  const h = await headers();
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
    <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4">
        <div className="text-[15px] font-semibold text-slate-900">{title}</div>
      </div>

      <div className="space-y-1.5 p-4 text-sm text-slate-800">
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
          <div className="pt-2 text-slate-700">
            <span className="mr-1 text-xs text-slate-500">Mobile:</span>
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
    <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#f7f8ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
              {initials}
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
                {name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">Customer profile</p>
            </div>
          </div>

          <Link
            href="/customers"
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4">
            <div className="text-[15px] font-semibold text-slate-900">Summary</div>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Email
              </div>
              <div className="mt-1 text-sm text-slate-800">
                {customer.email || "No email"}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Total spent
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                ₹{customer.total_spent.toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Joined
              </div>
              <div
                className="mt-1 text-sm text-slate-800"
                suppressHydrationWarning
              >
                {customer.date_created ? formatOrderDate(customer.date_created) : "-"}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Total orders
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {order_total}
              </div>
            </div>
          </div>
        </div>

        <AddressBlock title="Billing address" a={customer.billing} />
        <AddressBlock title="Shipping address" a={customer.shipping} />
      </div>

      <section className="mt-4 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4 md:px-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-slate-900">Orders</h2>

            {orders.length > 0 && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {orders.length} order{orders.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {/* Mobile cards */}
        <div className="block md:hidden">
          {orders.length > 0 ? (
            <div className="space-y-2 p-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-[20px] border border-slate-200 bg-white px-3 py-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        className="text-[15px] font-semibold text-blue-600 hover:underline"
                        href={`/orders/${o.id}`}
                      >
                        #{o.number || o.id}
                      </Link>

                      <div
                        className="mt-1 text-xs text-slate-500"
                        suppressHydrationWarning
                      >
                        {o.date_created_gmt ? formatOrderDate(o.date_created_gmt) : "-"}
                      </div>
                    </div>

                    <span className={statusPillClass(o.status)}>
                      {o.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-sm text-slate-800">
                    {(o.line_items || []).map((li) => (
                      <div key={li.id}>
                        {li.name}
                        {li.sku ? ` (${li.sku})` : ""} × {li.quantity}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      {o.payment_method_title || "-"}
                    </span>
                    <span className="font-semibold text-slate-900">₹{o.total}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-sm">
              No orders yet for this customer.
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="py-3 pl-4 pr-3 text-left font-medium">#</th>
                <th className="py-3 px-3 text-left font-medium">Date</th>
                <th className="py-3 px-3 text-left font-medium">Items</th>
                <th className="py-3 px-3 text-left font-medium">Status</th>
                <th className="py-3 px-3 text-right font-medium">Total</th>
                <th className="py-3 pr-4 pl-3 text-left font-medium">Payment</th>
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
                  <td className="py-3 pl-4 pr-3">
                    <Link
                      className="text-blue-600 hover:underline"
                      href={`/orders/${o.id}`}
                    >
                      #{o.number || o.id}
                    </Link>
                  </td>
                  <td
                    className="py-3 px-3 whitespace-nowrap"
                    suppressHydrationWarning
                  >
                    {o.date_created_gmt ? formatOrderDate(o.date_created_gmt) : "-"}
                  </td>
                  <td className="py-3 px-3">
                    {(o.line_items || []).map((li) => (
                      <div key={li.id} className="text-slate-800">
                        {li.name}
                        {li.sku ? ` (${li.sku})` : ""} × {li.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="py-3 px-3">
                    <span className={statusPillClass(o.status)}>
                      {o.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900">
                    ₹{o.total}
                  </td>
                  <td className="py-3 pr-4 pl-3 text-slate-800">
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
    </main>
  );
}