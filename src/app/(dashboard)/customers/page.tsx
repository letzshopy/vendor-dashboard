import Link from "next/link";
import CustomersSearch from "./CustomersSearch";
import { formatOrderDate } from "@/lib/datetime";
import { headers } from "next/headers";

type CustRow = {
  id: string; // base64url key
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

async function getBaseUrl(): Promise<string> {
  const h = await headers(); // headers() → Promise<ReadonlyHeaders> in your setup
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    (host ? `${proto}://${host}` : "http://localhost:3000")
  );
}

async function getCustomers(params: URLSearchParams) {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/customers?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load customers");
  return res.json() as Promise<{
    items: CustRow[];
    total: number;
    pages: number;
    page: number;
    per_page: number;
    search?: string;
  }>;
}

export default async function CustomersPage({
  searchParams,
}: {
  // ✅ Next 15: searchParams is a Promise
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};

  const page = parseInt(String(sp.page ?? "1"), 10);
  const search = String(sp.search ?? "");
  const per_page = 20;

  const data = await getCustomers(
    new URLSearchParams({
      page: String(page),
      per_page: String(per_page),
      search,
    })
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Customers
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              View all customers who have placed orders on your store. Click a
              customer name to see their full profile and order history.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1 text-xs text-slate-500">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              {data.total} customer{data.total === 1 ? "" : "s"} •{" "}
              {data.pages} page{data.pages === 1 ? "" : "s"}
            </div>
            {search && (
              <span className="text-[11px]">
                Filtered by search:{" "}
                <span className="font-medium text-slate-700">“{search}”</span>
              </span>
            )}
          </div>
        </div>

        {/* Search bar */}
        <CustomersSearch initialSearch={search} />

        {/* Customers table */}
        <section className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="py-2.5 pl-4 pr-3 text-left font-medium">
                  Customer
                </th>
                <th className="py-2.5 px-3 text-left font-medium">Email</th>
                <th className="py-2.5 px-3 text-left font-medium">Phone</th>
                <th className="py-2.5 px-3 text-left font-medium">City</th>
                <th className="py-2.5 px-3 text-left font-medium">State</th>
                <th className="py-2.5 px-3 text-right font-medium">Orders</th>
                <th className="py-2.5 px-3 text-right font-medium">
                  Total spent
                </th>
                <th className="py-2.5 pr-4 pl-3 text-left font-medium">
                  Last active
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c, idx) => {
                const initials =
                  c.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2) || "?";

                return (
                  <tr
                    key={c.id}
                    className={`border-b border-slate-100 ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    {/* Customer with small avatar + name */}
                    <td className="py-2.5 pl-4 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                          {initials}
                        </div>
                        <div className="flex flex-col">
                          <Link
                            href={`/customers/${c.id}`}
                            className="text-sm font-semibold text-blue-600 hover:underline"
                          >
                            {c.name || "(guest)"}
                          </Link>
                          {c.country && (
                            <span className="text-[11px] text-slate-400">
                              {c.country}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-800">
                      {c.email || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      {c.phone || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      {c.city || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      {c.state || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center justify-end rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {c.order_count}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                      ₹{c.total_spent.toFixed(2)}
                    </td>
                    <td
                      className="py-2.5 pr-4 pl-3 text-slate-700 whitespace-nowrap"
                      suppressHydrationWarning
                    >
                      {c.last_order ? formatOrderDate(c.last_order) : "—"}
                    </td>
                  </tr>
                );
              })}
              {data.items.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-6 text-center text-slate-500 text-sm"
                  >
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <span className="text-xs md:text-sm text-slate-600">
            Page <span className="font-medium">{data.page}</span> of{" "}
            <span className="font-medium">{data.pages}</span> •{" "}
            <span className="font-medium">{data.total}</span> total customers
          </span>

          <div className="flex gap-2">
            <Link
              href={`/customers?page=${Math.max(
                1,
                data.page - 1
              )}&search=${encodeURIComponent(search)}`}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs md:text-sm border ${
                data.page === 1
                  ? "border-slate-200 text-slate-300 cursor-not-allowed"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Prev
            </Link>
            <Link
              href={`/customers?page=${Math.min(
                data.pages,
                data.page + 1
              )}&search=${encodeURIComponent(search)}`}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs md:text-sm border ${
                data.page === data.pages || data.pages === 0
                  ? "border-slate-200 text-slate-300 cursor-not-allowed"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
