// src/app/master/vendors/page.tsx
import Link from "next/link";
import { getMasterWpBaseUrl } from "@/lib/wpClient";

type MasterVendor = {
  blog_id: number;
  store_name: string;
  store_url: string;
  owner_email: string;
  owner_name?: string;
  plan: string;
  status: string;
  billing_state: string;
};

export const dynamic = "force-dynamic";

function getAuthHeader(): Record<string, string> {
  const key = process.env.MASTER_API_KEY;
  if (!key) return { Accept: "application/json" };
  return {
    Authorization: `Bearer ${key}`,
    "X-Letz-Master-Key": key,
    Accept: "application/json",
  };
}

async function fetchMasterVendors(): Promise<MasterVendor[]> {
  try {
    // ✅ master-only base URL (never tenant)
    const baseUrl = getMasterWpBaseUrl();

    const url = `${baseUrl.replace(/\/$/, "")}/wp-json/letz/v1/master-vendors`;
    const res = await fetch(url, {
      headers: getAuthHeader(),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to load master vendors", res.status, await res.text());
      return [];
    }

    const data = await res.json();
    return Array.isArray(data?.vendors) ? (data.vendors as MasterVendor[]) : [];
  } catch (e) {
    console.error("fetchMasterVendors error", e);
    return [];
  }
}

export default async function VendorsPage() {
  const vendors = await fetchMasterVendors();
  const appBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Master Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-50">Vendors</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Live list of stores from WordPress Multisite via{" "}
          <span className="font-mono text-[11px] text-slate-300">
            /letz/v1/master-vendors
          </span>
          .
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80">
              <th className="px-4 py-3 font-medium text-slate-400">Store</th>
              <th className="px-4 py-3 font-medium text-slate-400">Domain</th>
              <th className="px-4 py-3 font-medium text-slate-400">Owner email</th>
              <th className="px-4 py-3 font-medium text-slate-400">Plan</th>
              <th className="px-4 py-3 font-medium text-slate-400">Status</th>
              <th className="px-4 py-3 font-medium text-slate-400">Billing state</th>
              <th className="px-4 py-3 font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => {
              const isActive = (v.status || "").toLowerCase() === "active";
              const dashUrl = `${appBase.replace(/\/$/, "")}/dashboard?store=${v.blog_id}`;

              return (
                <tr
                  key={v.blog_id}
                  className="border-b border-slate-900/70 last:border-b-0"
                >
                  <td className="px-4 py-3 align-top text-slate-100">
                    <Link
                      href={`/master/vendors/${v.blog_id}`}
                      className="font-medium hover:text-sky-300"
                    >
                      {v.store_name || "Untitled store"}
                    </Link>
                    <p className="text-[11px] text-slate-500">
                      View details →{" "}
                      <Link
                        href={`/master/vendors/${v.blog_id}`}
                        className="text-sky-300 hover:text-sky-200"
                      >
                        /master/vendors/{v.blog_id}
                      </Link>
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top text-slate-300">
                    {v.store_url.replace(/^https?:\/\//, "")}
                  </td>
                  <td className="px-4 py-3 align-top text-slate-300">
                    {v.owner_email}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-1 text-[11px] capitalize text-slate-200">
                      {v.plan || "Trial"}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] capitalize ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {v.status || "Trial"}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-slate-300">
                    {v.billing_state || "—"}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <a
                        href={v.store_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-[11px] font-medium text-slate-100 hover:border-sky-400 hover:text-sky-200"
                      >
                        Open store
                      </a>
                      <a
                        href={dashUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-900 hover:bg-white"
                      >
                        Open dashboard
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}

            {vendors.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-xs text-slate-500"
                >
                  No vendor stores found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}