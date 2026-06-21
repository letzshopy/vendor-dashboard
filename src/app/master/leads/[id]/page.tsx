// src/app/master/leads/[id]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  fetchMasterLead,
  formatLeadDate,
  leadStatusLabel,
  leadStatuses,
  statusBadgeClass,
  updateMasterLead,
} from "@/lib/leadsApi";

export const dynamic = "force-dynamic";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-slate-100">
        {value && value.trim() ? value : "—"}
      </p>
    </div>
  );
}

async function updateLeadAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "new");
  const notes = String(formData.get("notes") || "");
  const trello_card_url = String(formData.get("trello_card_url") || "");
  const converted_vendor_id = String(formData.get("converted_vendor_id") || "");

  if (!id) return;

  await updateMasterLead(id, {
    status,
    notes,
    trello_card_url,
    converted_vendor_id,
  });

  revalidatePath("/master/leads");
  revalidatePath(`/master/leads/${id}`);
  redirect(`/master/leads/${id}`);
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await fetchMasterLead(id);

  if (!lead) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/master/leads"
          className="text-xs font-medium text-sky-300 hover:text-sky-200"
        >
          ← Back to leads
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Lead #{lead.id}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-50">
              {lead.business_name || "Untitled business"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Submitted {formatLeadDate(lead.created_at)}
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass(
              String(lead.status)
            )}`}
          >
            {leadStatusLabel(String(lead.status))}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Contact details
            </h2>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <InfoRow label="Full name" value={lead.full_name} />
              <InfoRow label="WhatsApp / Mobile" value={lead.mobile_number} />
              <InfoRow label="Email" value={lead.email_address} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Business details
            </h2>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoRow label="Business name" value={lead.business_name} />
              <InfoRow label="Category" value={lead.business_category} />
              <InfoRow label="GST registered" value={lead.gst_registered} />
              <InfoRow
                label="Location"
                value={[lead.city, lead.state].filter(Boolean).join(", ")}
              />
              <InfoRow
                label="Current selling method"
                value={lead.current_selling_method}
              />
              <InfoRow label="Product count" value={lead.product_count} />
              <InfoRow
                label="Website operation support"
                value={lead.operation_support_needed}
              />
              <InfoRow label="Preferred domain" value={lead.preferred_domain} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Links & requirement
            </h2>

            <div className="mt-4 grid gap-3">
              <InfoRow label="Instagram / Social link" value={lead.instagram_link} />
              <InfoRow label="Existing website" value={lead.existing_website_link} />
              <InfoRow label="Message / Requirement" value={lead.message} />
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <form
            action={updateLeadAction}
            className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
          >
            <input type="hidden" name="id" value={lead.id} />

            <h2 className="text-sm font-semibold text-slate-100">
              Lead workflow
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Update status, internal notes, and Trello card link.
            </p>

            <label className="mt-4 block text-xs font-medium text-slate-400">
              Status
            </label>
            <select
              name="status"
              defaultValue={String(lead.status || "new")}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            >
              {leadStatuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-xs font-medium text-slate-400">
              Internal notes
            </label>
            <textarea
              name="notes"
              defaultValue={lead.notes || ""}
              rows={6}
              placeholder="Example: Called vendor, waiting for product photos..."
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
            />

            <label className="mt-4 block text-xs font-medium text-slate-400">
              Trello card URL
            </label>
            <input
              name="trello_card_url"
              defaultValue={lead.trello_card_url || ""}
              placeholder="https://trello.com/c/..."
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
            />

            <label className="mt-4 block text-xs font-medium text-slate-400">
              Converted vendor ID
            </label>
            <input
              name="converted_vendor_id"
              defaultValue={lead.converted_vendor_id || ""}
              placeholder="Blog ID / vendor ID after store is created"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
            />

            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-white"
            >
              Save lead update
            </button>
          </form>

          {lead.trello_card_url ? (
            <a
              href={lead.trello_card_url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-sky-700/40 bg-sky-950/20 p-4 text-sm text-sky-200 hover:border-sky-400"
            >
              Open Trello card →
            </a>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm font-medium text-slate-300">
                No Trello card linked yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Paste the Trello card URL after creating onboarding checklist.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}