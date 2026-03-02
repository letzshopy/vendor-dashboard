import Link from "next/link";

export const dynamic = "force-dynamic";

type TicketListItem = {
  id: number;
  title: string;
  status: string;
  priority: string;
  updatedAt: string;
  createdAt: string;
  responseCount: number;
  customer?: { name?: string; email?: string };
  agent?: { name?: string; email?: string };
};

function masterHeaders() {
  const key = process.env.MASTER_API_KEY!;
  return {
    Authorization: `Bearer ${key}`,
    "X-Letz-Master-Key": key,
  };
}

async function getTickets(params: { status?: string; search?: string; page?: number }) {
  const WP = process.env.MASTER_WP_URL!;
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  qs.set("page", String(params.page ?? 1));
  qs.set("per_page", "25");

  const res = await fetch(`${WP}/wp-json/letz/v1/master-tickets?${qs.toString()}`, {
    cache: "no-store",
    headers: masterHeaders(),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Tickets API ${res.status}\n${text.slice(0, 2000)}`);
  return JSON.parse(text) as { items: TicketListItem[]; total: number; page: number; per_page: number };
}

export default async function MasterSupportTicketsPage() {
  const data = await getTickets({ status: "new" });

  const adminUrl = `${process.env.MASTER_WP_URL}/wp-admin/admin.php?page=fluent-support#/tickets`;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Support Tickets</h1>
          <p className="text-sm text-slate-400">Fluent Support (central helpdesk)</p>
        </div>

        <a
          href={adminUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
        >
          Open Fluent Support Admin
        </a>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-3 text-sm text-slate-300">
          Showing <span className="text-white font-medium">{data.items.length}</span> of{" "}
          <span className="text-white font-medium">{data.total}</span>
        </div>

        <div className="divide-y divide-white/10">
          {data.items.map((t) => (
            <Link
              key={t.id}
              href={`/master/support-tickets/${t.id}`}
              className="block p-4 hover:bg-white/5 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-white font-medium truncate">
                    #{t.id} • {t.title}
                  </div>
                  <div className="text-xs text-slate-300 mt-1 truncate">
                    {t.status} • {t.priority} • {t.customer?.email || "unknown customer"}
                  </div>
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">
                  Updated: {t.updatedAt || "-"}
                </div>
              </div>
            </Link>
          ))}
          {data.items.length === 0 && (
            <div className="p-6 text-slate-300 text-sm">No tickets found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
