import ReportsTabsClient from "./ui/ReportsTabsClient";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <main className="dashboard-mobile-page dashboard-reports-page mx-auto w-full min-w-0 max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <div className="min-w-0 rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#f7f8ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
            <BarChart3 className="h-3.5 w-3.5" />
            Reports
          </div>

          <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
            Reports
          </h1>
        </div>
      </div>

      <section className="mt-4 min-w-0 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="min-w-0 p-4 md:p-5">
          <ReportsTabsClient />
        </div>
      </section>
    </main>
  );
}
