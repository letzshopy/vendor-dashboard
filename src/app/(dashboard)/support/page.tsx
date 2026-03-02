// src/app/support/page.tsx

export const dynamic = "force-dynamic";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Help Desk</h1>
        <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1.5">
          <li>Knowledge Base</li>
          <li>FAQs</li>
          <li>Support Tickets</li>
        </ul>
      </div>
    </main>
  );
}
