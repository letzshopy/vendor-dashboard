// src/app/master/subscriptions/page.tsx
import Link from "next/link";
import { getMasterWpBaseUrl } from "@/lib/wpClient";

type SubItem = {
  blogId: number;
  siteName: string;
  siteUrl: string;

  plan: string;
  billingCycle: string;
  billingStatus: string;

  createdOn: string;
  nextRenewalDate: string;
  autopayEnabled: boolean;

  daysToRenewal: number | null;
  tag: "overdue" | "due_7" | "due_30" | "active" | "no_date" | "unknown";
  isActive: boolean;
};

type SubsResponse = {
  summary: {
    activeVendors: number;
    dueIn7Days: number;
    dueIn30Days: number;
    overdue: number;
    total: number;
  };
  items: SubItem[];
};

export const dynamic = "force-dynamic";

function masterHeaders() {
  const key = process.env.MASTER_API_KEY;
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(key ? { Authorization: `Bearer ${key}`, "X-Letz-Master-Key": key } : {}),
  };
}

async function getSubs(): Promise<SubsResponse> {
  const MASTER_WP_URL = getMasterWpBaseUrl();

  const url = `${MASTER_WP_URL.replace(/\/$/, "")}/wp-json/letz/v1/master-subscriptions`;

  const res = await fetch(url, { headers: masterHeaders(), cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(`Subscriptions API ${res.status}\n${text.slice(0, 2000)}`);

  return JSON.parse(text);
}

function badge(tag: string) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]";
  switch (tag) {
    case "overdue":
      return `${base} border-red-700 bg-red-950/40 text-red-200`;
    case "due_7":
      return `${base} border-amber-700 bg-amber-950/40 text-amber-200`;
    case "due_30":
      return `${base} border-yellow-700 bg-yellow-950/40 text-yellow-200`;
    case "active":
      return `${base} border-emerald-700 bg-emerald-950/40 text-emerald-200`;
    case "no_date":
      return `${base} border-slate-700 bg-slate-900 text-slate-200`;
    default:
      return `${base} border-slate-700 bg-slate-900 text-slate-200`;
  }
}

function tagLabel(tag: SubItem["tag"]) {
  if (tag === "overdue") return "Overdue";
  if (tag === "due_7") return "Due in 7 days";
  if (tag === "due_30") return "Due in 30 days";
  if (tag === "active") return "Active";
  if (tag === "no_date") return "No renewal date";
  return "Unknown";
}

export default async function MasterSubscriptionsPage() {
  const data = await getSubs();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Subscriptions & Revenue
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Subscriptions
          </h1>
          <div className="text-sm text-slate-400 mt-1">
            Track renewals, overdue vendors, and billing cycle status.
          </div>
        </div>

        <div className="flex gap-2">
          <a
            href="/master/subscriptions/export"
            className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
          >
            Export CSV
          </a>
          <Link
            href="/master/vendors"
            className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
          >
            View Vendors
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs text-slate-500">Active vendors</div>
          <div className="mt-1 text-2xl font-semibold">{data.summary.activeVendors}</div>
          <div className="text-xs text-slate-500 mt-1">Total: {data.summary.total}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs text-slate-500">Renewal due in 7 days</div>
          <div className="mt-1 text-2xl font-semibold">{data.summary.dueIn7Days}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs text-slate-500">Renewal due in 30 days</div>
          <div className="mt-1 text-2xl font-semibold">{data.summary.dueIn30Days}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs text-slate-500">Overdue vendors</div>
          <div className="mt-1 text-2xl font-semibold">{data.summary.overdue}</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="text-sm font-semibold">All vendor subscriptions</div>
          <div className="text-xs text-slate-500">Sorted by next renewal</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3">Vendor</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3">Cycle</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Next renewal</th>
                <th className="text-left px-4 py-3">Days</th>
                <th className="text-left px-4 py-3">AutoPay</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody className="text-slate-200">
              {data.items.map((v) => (
                <tr
                  key={v.blogId}
                  className="border-b border-slate-900/60 hover:bg-slate-900/30"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{v.siteName}</div>
                    <div className="text-xs text-slate-500">{v.siteUrl}</div>
                  </td>

                  <td className="px-4 py-3">{v.plan || "-"}</td>
                  <td className="px-4 py-3">{v.billingCycle || "-"}</td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={badge(v.tag)}>{tagLabel(v.tag)}</span>
                      <span className="text-xs text-slate-500">
                        {v.billingStatus || "-"}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">{v.nextRenewalDate || "-"}</td>

                  <td className="px-4 py-3">
                    {v.daysToRenewal === null ? "-" : v.daysToRenewal}
                  </td>

                  <td className="px-4 py-3">
                    {v.autopayEnabled ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-700 bg-emerald-950/40 px-2 py-0.5 text-[11px] text-emerald-200">
                        ON
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-200">
                        OFF
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/master/vendors/${v.blogId}`}
                        className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs hover:bg-slate-800"
                      >
                        Open vendor
                      </Link>
                      <a
                        href={v.siteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs hover:bg-slate-800"
                      >
                        Open store
                      </a>
                    </div>
                  </td>
                </tr>
              ))}

              {data.items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={8}>
                    No vendors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        AutoPay ON/OFF will be wired from Easebuzz later. For now it reads from your account settings option if present.
      </div>
    </div>
  );
}