// src/app/master/leads/page.tsx
import Link from "next/link";
import {
  fetchMasterLeads,
  formatLeadDate,
  leadStatusLabel,
  statusBadgeClass,
} from "@/lib/leadsApi";

export const dynamic = "force-dynamic";

export default async function MasterLeadsPage() {
  const leads = await fetchMasterLeads();

  const newCount = leads.filter((lead) => lead.status === "new").length;
  const activeCount = leads.filter((lead) =>
    ["contacted", "discussion_done", "onboarding_started", "store_created"].includes(
      String(lead.status)
    )
  ).length;
  const liveCount = leads.filter((lead) => lead.status === "live").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Master Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-50">
            Leads & Signups
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Store requests submitted from the LetzShopy signup page.
          </p>
        </div>

        <a
          href="https://letzshopy.in/signup/"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:border-sky-400 hover:text-sky-200"
        >
          Open signup page →
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs font-medium text-slate-400">Total leads</p>
          <p className="mt-3 text-3xl font-semibold text-slate-50">
            {leads.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            All submitted store requests.
          </p>
        </div>

        <div className="rounded-2xl border border-sky-700/40 bg-sky-950/20 p-4">
          <p className="text-xs font-medium text-slate-400">New leads</p>
          <p className="mt-3 text-3xl font-semibold text-sky-300">
            {newCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Waiting for first contact.
          </p>
        </div>

        <div className="rounded-2xl border border-violet-700/40 bg-violet-950/20 p-4">
          <p className="text-xs font-medium text-slate-400">In progress</p>
          <p className="mt-3 text-3xl font-semibold text-violet-300">
            {activeCount + liveCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Contacted, onboarding, store created or live.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80">
              <th className="px-4 py-3 font-medium text-slate-400">Business</th>
              <th className="px-4 py-3 font-medium text-slate-400">Contact</th>
              <th className="px-4 py-3 font-medium text-slate-400">Category</th>
              <th className="px-4 py-3 font-medium text-slate-400">Location</th>
              <th className="px-4 py-3 font-medium text-slate-400">Status</th>
              <th className="px-4 py-3 font-medium text-slate-400">Submitted</th>
              <th className="px-4 py-3 font-medium text-slate-400">Action</th>
            </tr>
          </thead>

          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-slate-900/70 last:border-b-0"
              >
                <td className="px-4 py-3 align-top">
                  <Link
                    href={`/master/leads/${lead.id}`}
                    className="font-medium text-slate-100 hover:text-sky-300"
                  >
                    {lead.business_name || "Untitled business"}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Lead #{lead.id}
                  </p>
                </td>

                <td className="px-4 py-3 align-top text-slate-300">
                  <p>{lead.full_name || "—"}</p>
                  <p className="text-[11px] text-slate-500">
                    {lead.mobile_number || "—"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {lead.email_address || "—"}
                  </p>
                </td>

                <td className="px-4 py-3 align-top text-slate-300">
                  {lead.business_category || "—"}
                </td>

                <td className="px-4 py-3 align-top text-slate-300">
                  {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
                </td>

                <td className="px-4 py-3 align-top">
                  <span
                    className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${statusBadgeClass(
                      String(lead.status)
                    )}`}
                  >
                    {leadStatusLabel(String(lead.status))}
                  </span>
                </td>

                <td className="px-4 py-3 align-top text-slate-400">
                  {formatLeadDate(lead.created_at)}
                </td>

                <td className="px-4 py-3 align-top">
                  <Link
                    href={`/master/leads/${lead.id}`}
                    className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-900 hover:bg-white"
                  >
                    View lead
                  </Link>
                </td>
              </tr>
            ))}

            {leads.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-xs text-slate-500"
                >
                  No signup leads found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}