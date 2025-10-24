// src/lib/datetime.ts
// Deterministic UTC formatter to avoid hydration mismatches.
export function formatOrderDate(date_gmt?: string) {
  if (!date_gmt) return "-";
  const d = new Date(date_gmt + "Z"); // date_created_gmt is GMT, ensure UTC with Z
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss} UTC`;
}
