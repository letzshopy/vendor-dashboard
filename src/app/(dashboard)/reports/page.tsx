import ReportsTabsClient from "./ui/ReportsTabsClient";

export default function ReportsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Track orders, customers and stock performance from one clean
            dashboard. Switch tabs to see different report views.
          </p>
        </header>

        {/* Tabs + content */}
        <section className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-100">
          <div className="p-4 sm:p-5">
            <ReportsTabsClient />
          </div>
        </section>
      </div>
    </main>
  );
}
