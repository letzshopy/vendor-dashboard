// src/app/master/support-tickets/[id]/page.tsx
import Link from "next/link";

type TicketDetail = {
  ticket: {
    id: number;
    title: string;
    status: string;
    priority: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    responseCount: number;
  };
  conversations: Array<{
    id: number;
    ticket_id: number;
    person_id: number;
    conversation_type: string;
    content: string;
    created_at: string;
  }>;
  attachments: Array<{
    id: number;
    ticket_id: number;
    person_id: number;
    conversation_id: number;
    file_type: string;
    full_url: string;
    title: string;
    file_size: string;
    created_at: string;
  }>;
};

function masterHeaders() {
  const key = process.env.MASTER_API_KEY;
  // NOTE: Next.js server component can set headers directly
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(key ? { Authorization: `Bearer ${key}`, "X-Letz-Master-Key": key } : {}),
  };
}

async function getTicket(id: string): Promise<TicketDetail> {
  const MASTER_WP_URL = process.env.MASTER_WP_URL || process.env.WP_URL;
  if (!MASTER_WP_URL) throw new Error("Missing MASTER_WP_URL in .env.local");

  const url = `${MASTER_WP_URL.replace(/\/$/, "")}/wp-json/letz/v1/master-tickets/${encodeURIComponent(
    id
  )}`;

  const res = await fetch(url, {
    headers: masterHeaders(),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Ticket detail API ${res.status}\n\n${text.slice(0, 2000)}`);
  }

  return JSON.parse(text);
}

function pill(text: string) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-200">
      {text || "-"}
    </span>
  );
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MasterTicketDetailPage({ params }: Props) {
  const { id } = await params;

  const data = await getTicket(id);

  const t = data.ticket;
  const adminUrl =
    "https://letzshopy.in/wp-admin/admin.php?page=fluent-support#/tickets";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Support Tickets
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            #{t.id} — {t.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {pill(`Status: ${t.status}`)}
            {pill(`Priority: ${t.priority}`)}
            {pill(`Replies: ${t.responseCount}`)}
          </div>
        </div>

        <div className="flex gap-2">
          <a
            href={adminUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
          >
            Open Fluent Support Admin
          </a>
          <Link
            href="/master/support-tickets"
            className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Ticket Meta */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-sm font-semibold mb-3">Ticket info</div>
          <div className="space-y-2 text-sm text-slate-200">
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Created</span>
              <span>{t.createdAt || "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Updated</span>
              <span>{t.updatedAt || "-"}</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
              Description
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200 whitespace-pre-wrap">
              {t.content || "(No description)"}
            </div>
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Conversation</div>
            <div className="text-xs text-slate-500">
              {data.conversations?.length || 0} messages
            </div>
          </div>

          <div className="space-y-3">
            {(data.conversations || []).map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {c.conversation_type || "message"} • Person #{c.person_id}
                  </span>
                  <span>{c.created_at}</span>
                </div>
                <div className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">
                  {c.content}
                </div>
              </div>
            ))}

            {(!data.conversations || data.conversations.length === 0) && (
              <div className="text-sm text-slate-400">
                No conversation messages found.
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="mt-5">
            <div className="text-sm font-semibold mb-2">Attachments</div>

            <div className="space-y-2">
              {(data.attachments || []).map((a) => (
                <a
                  key={a.id}
                  href={a.full_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-900"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-200">
                      {a.title || a.full_url}
                    </div>
                    <div className="text-xs text-slate-500">
                      {a.file_type || "file"}
                    </div>
                  </div>
                </a>
              ))}

              {(!data.attachments || data.attachments.length === 0) && (
                <div className="text-sm text-slate-400">No attachments found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}