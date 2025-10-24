import Link from "next/link";
import CustomersSearch from "./CustomersSearch";
import { formatOrderDate } from "@/lib/datetime";
import { headers } from "next/headers";

type CustRow = {
  id: string;            // base64url key
  name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  country?: string;
  total_spent: number;
  order_count: number;
  first_order?: string;
  last_order?: string;
};

function getBaseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return process.env.NEXT_PUBLIC_BASE_URL || (host ? `${proto}://${host}` : "http://localhost:3000");
}

async function getCustomers(params: URLSearchParams) {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/customers?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load customers");
  return res.json() as Promise<{ items: CustRow[]; total: number; pages: number; page: number; per_page: number; search?: string }>;
}

export default async function CustomersPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const page = parseInt(String(searchParams?.page || "1"), 10);
  const search = String(searchParams?.search || "");
  const per_page = 20;

  const data = await getCustomers(new URLSearchParams({ page: String(page), per_page: String(per_page), search }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
      </div>

      <CustomersSearch initialSearch={search} />

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-2">Customer</th>
              <th className="p-2">Email</th>
              <th className="p-2">Phone</th>
              <th className="p-2">City</th>
              <th className="p-2">State</th>
              <th className="p-2">Orders</th>
              <th className="p-2">Total Spent</th>
              <th className="p-2">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">
                  <Link href={`/customers/${c.id}`} className="text-blue-600 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="p-2">{c.email || "-"}</td>
                <td className="p-2">{c.phone || "-"}</td>
                <td className="p-2">{c.city || "-"}</td>
                <td className="p-2">{c.state || "-"}</td>
                <td className="p-2">{c.order_count}</td>
                <td className="p-2">₹{c.total_spent.toFixed(2)}</td>
                <td className="p-2" suppressHydrationWarning>
                  {c.last_order ? formatOrderDate(c.last_order) : "-"}
                </td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-slate-600">Page {data.page} / {data.pages} • {data.total} total</span>
        <div className="flex gap-2">
          <Link href={`/customers?page=${Math.max(1, data.page - 1)}&search=${encodeURIComponent(search)}`} className="border rounded px-3 py-1 text-sm">Prev</Link>
          <Link href={`/customers?page=${Math.min(data.pages, data.page + 1)}&search=${encodeURIComponent(search)}`} className="border rounded px-3 py-1 text-sm">Next</Link>
        </div>
      </div>
    </div>
  );
}
