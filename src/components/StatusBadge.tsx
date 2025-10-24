export default function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const map: Record<string, string> = {
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    "on-hold": "bg-amber-100 text-amber-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-gray-200 text-gray-700",
    refunded: "bg-purple-100 text-purple-700",
    failed: "bg-red-100 text-red-700",
  };
  const cls = map[s] ?? "bg-slate-100 text-slate-700";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}
