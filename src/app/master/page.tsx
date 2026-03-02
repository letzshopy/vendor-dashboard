// src/app/master/page.tsx
import Link from "next/link";

type MasterVendor = {
  blog_id: number;
  store_name: string;
  store_url: string;
  owner_email: string;
  owner_name?: string;
  plan: string;          // e.g. "Trial", "Monthly", "Yearly"
  status: string;        // e.g. "Active", "Trial", "Overdue"
  billing_state: string; // GST state code
};

async function fetchMasterVendors(): Promise<MasterVendor[]> {
  const baseUrl = process.env.WP_URL;
  const user = process.env.WP_USER;
  const appPass = process.env.WP_APP_PASSWORD;

  if (!baseUrl || !user || !appPass) {
    console.error("Missing WP_URL / WP_USER / WP_APP_PASSWORD env vars");
    return [];
  }

  const url = `${baseUrl.replace(/\/$/, "")}/wp-json/letz/v1/master-vendors`;

  const res = await fetch(url, {
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${user}:${appPass}`, "utf8").toString("base64"),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Failed to load master vendors", res.status, await res.text());
    return [];
  }

  const data = await res.json();
  return Array.isArray(data?.vendors) ? (data.vendors as MasterVendor[]) : [];
}

function computeMetrics(vendors: MasterVendor[]) {
  const totalVendors = vendors.length;

  const activeSubs = vendors.filter((v) => {
    const status = (v.status || "").toLowerCase();
    return status === "active";
  }).length;

  // Pricing (GST inclusive) – from your message
  const MONTHLY_GROSS = 625;  // ₹625 per month
  const YEARLY_GROSS = 7500;  // ₹7,500 per year

  let mrr = 0;

  for (const v of vendors) {
    const plan = (v.plan || "").toLowerCase();
    if (!plan || plan === "trial") continue;

    if (plan.includes("month")) {
      mrr += MONTHLY_GROSS;
    } else if (plan.includes("year") || plan.includes("annual")) {
      // Annual plan converted to monthly MRR
      mrr += Math.round(YEARLY_GROSS / 12);
    } else {
      // Any future paid plan – treat as monthly for now
      mrr += MONTHLY_GROSS;
    }
  }

  return { totalVendors, activeSubs, mrr };
}

export default async function MasterDashboardPage() {
  const vendors = await fetchMasterVendors();
  const { totalVendors, activeSubs, mrr } = computeMetrics(vendors);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Master Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-50">
          HQ Snapshot
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          High-level view of all vendor stores, subscriptions and support
          activity.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {/* Total vendors */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-inner">
          <p className="text-xs font-medium text-slate-400">Total vendors</p>
          <p className="mt-3 text-3xl font-semibold text-slate-50">
            {totalVendors}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Live stores running on LetzShopy.
          </p>
        </div>

        {/* Active subscriptions */}
        <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-4 shadow-inner">
          <p className="text-xs font-medium text-slate-400">
            Active subscriptions
          </p>
          <p className="mt-3 text-3xl font-semibold text-emerald-400">
            {activeSubs}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Stores billed as <span className="font-medium">Active</span>.
          </p>
        </div>

        {/* MRR */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-inner">
          <p className="text-xs font-medium text-slate-400">MRR (approx)</p>
          <p className="mt-3 text-3xl font-semibold text-slate-50">
            ₹{mrr.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Gross subscription value per month based on current plans.
          </p>
        </div>

        {/* Open tickets – placeholder for now */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 shadow-inner">
          <p className="text-xs font-medium text-slate-400">Open tickets</p>
          <p className="mt-3 text-3xl font-semibold text-amber-300">0</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Ticket system wiring will come in a later phase.
          </p>
        </div>
      </div>

      {/* Vendor overview mini-table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-100">
              Vendor overview
            </p>
            <p className="text-xs text-slate-500">
              Top stores and their subscription status.
            </p>
          </div>
          <Link
            href="/master/vendors"
            className="text-xs font-medium text-sky-300 hover:text-sky-200"
          >
            View all vendors →
          </Link>
        </div>

        {vendors.length === 0 ? (
          <p className="text-xs text-slate-500">
            No vendor stores yet – once you clone the template into a vendor
            site, it will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="py-2 pr-4 font-medium text-slate-400">Store</th>
                  <th className="py-2 pr-4 font-medium text-slate-400">
                    Domain
                  </th>
                  <th className="py-2 pr-4 font-medium text-slate-400">
                    Owner
                  </th>
                  <th className="py-2 pr-4 font-medium text-slate-400">Plan</th>
                  <th className="py-2 pr-4 font-medium text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {vendors.slice(0, 5).map((v) => {
                  const status = (v.status || "").toLowerCase();
                  const isActive = status === "active";

                  return (
                    <tr
                      key={v.blog_id}
                      className="border-b border-slate-900/60 last:border-b-0"
                    >
                      <td className="py-2 pr-4 text-slate-100">
                        {v.store_name || "Untitled store"}
                      </td>
                      <td className="py-2 pr-4">
                        <a
                          href={v.store_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-300 hover:text-sky-200"
                        >
                          {v.store_url.replace(/^https?:\/\//, "")}
                        </a>
                      </td>
                      <td className="py-2 pr-4 text-slate-300">
                        {v.owner_name || v.owner_email}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-1 text-[11px] capitalize text-slate-200">
                          {v.plan || "Trial"}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
