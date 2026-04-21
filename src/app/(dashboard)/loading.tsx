export default function DashboardLoading() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-xl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />
        <div className="text-sm font-medium text-slate-600">Loading...</div>
      </div>
    </div>
  );
}