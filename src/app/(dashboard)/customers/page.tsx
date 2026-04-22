import Link from "next/link";
import CustomersSearch from "./CustomersSearch";
import { formatOrderDate } from "@/lib/datetime";
import { headers } from "next/headers";
import { Users } from "lucide-react";

type CustRow = {
  id: string;
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
  const h = await headers();
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
    <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#f7f8ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
              <Users className="h-3.5 w-3.5" />
              Customers
            </div>

            <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
              Customers
            </h1>
          </div>

          <div className="shrink-0 rounded-[20px] bg-white/90 px-4 py-3 text-right shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Total
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {data.total}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <CustomersSearch initialSearch={search} />
      </div>

      {search && (
        <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Search result for{" "}
          <span className="font-semibold text-slate-900">“{search}”</span>
        </div>
      )}

      <section className="mt-4 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4 md:px-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-slate-900">
              Customer list
            </h2>

            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Page {data.page} / {Math.max(1, data.pages)}
            </div>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="block md:hidden">
          {data.items.length > 0 ? (
            <div className="space-y-2 p-3">
              {data.items.map((c) => {
                const initials =
                  c.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2) || "?";

                return (
                  <div
                    key={c.id}
                    className="rounded-[20px] border border-slate-200 bg-white px-3 py-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/customers/${c.id}`}
                          className="block text-[15px] font-semibold text-indigo-700 hover:underline"
                        >
                          {c.name || "(guest)"}
                        </Link>

                        <div className="mt-1 text-sm text-slate-600">
                          {c.email || "No email"}
                        </div>

                        {c.phone && (
                          <div className="mt-0.5 text-sm text-slate-500">
                            {c.phone}
                          </div>
                        )}

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-2xl bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">
                              Orders
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {c.order_count}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">
                              Total spent
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              ₹{c.total_spent.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{c.city || "—"}</span>
                          <span>{c.state || "—"}</span>
                          <span>{c.country || "—"}</span>
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                          Last active:{" "}
                          <span suppressHydrationWarning>
                            {c.last_order ? formatOrderDate(c.last_order) : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No customers found.
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="py-3 pl-4 pr-3 text-left font-medium">Customer</th>
                <th className="py-3 px-3 text-left font-medium">Email</th>
                <th className="py-3 px-3 text-left font-medium">Phone</th>
                <th className="py-3 px-3 text-left font-medium">City</th>
                <th className="py-3 px-3 text-left font-medium">State</th>
                <th className="py-3 px-3 text-right font-medium">Orders</th>
                <th className="py-3 px-3 text-right font-medium">Total spent</th>
                <th className="py-3 pr-4 pl-3 text-left font-medium">Last active</th>
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
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
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

                    <td className="py-3 px-3 text-slate-800">{c.email || "—"}</td>
                    <td className="py-3 px-3 text-slate-800">{c.phone || "—"}</td>
                    <td className="py-3 px-3 text-slate-800">{c.city || "—"}</td>
                    <td className="py-3 px-3 text-slate-800">{c.state || "—"}</td>

                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center justify-end rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {c.order_count}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-medium text-slate-900">
                      ₹{c.total_spent.toFixed(2)}
                    </td>

                    <td
                      className="py-3 pr-4 pl-3 whitespace-nowrap text-slate-700"
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
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 text-xs text-slate-600 md:px-5 md:text-sm">
          <span>
            Page <span className="font-medium">{data.page}</span> of{" "}
            <span className="font-medium">{Math.max(1, data.pages)}</span> •{" "}
            <span className="font-medium">{data.total}</span> customers
          </span>

          <div className="flex gap-2">
            <Link
              href={`/customers?page=${Math.max(
                1,
                data.page - 1
              )}&search=${encodeURIComponent(search)}`}
              className={`inline-flex items-center rounded-full px-3 py-1.5 border ${
                data.page === 1
                  ? "cursor-not-allowed border-slate-200 text-slate-300"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Prev
            </Link>
            <Link
              href={`/customers?page=${Math.min(
                Math.max(1, data.pages),
                data.page + 1
              )}&search=${encodeURIComponent(search)}`}
              className={`inline-flex items-center rounded-full px-3 py-1.5 border ${
                data.page === data.pages || data.pages === 0
                  ? "cursor-not-allowed border-slate-200 text-slate-300"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}