import { cn } from "@/lib/utils";

export type StatusTone =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

const toneClasses: Record<
  StatusTone,
  string
> = {
  info:
    "bg-blue-50 text-blue-700 ring-blue-600/10",
  success:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  warning:
    "bg-amber-50 text-amber-800 ring-amber-600/10",
  danger:
    "bg-rose-50 text-rose-700 ring-rose-600/10",
  neutral:
    "bg-slate-100 text-slate-700 ring-slate-500/10",
};

function toneForStatus(
  value: string
): StatusTone {
  const status = value
    .trim()
    .toLowerCase();

  if (
    [
      "completed",
      "active",
      "approved",
      "paid",
      "delivered",
      "success",
      "verified",
    ].includes(status)
  ) {
    return "success";
  }

  if (
    [
      "processing",
      "in_review",
      "trial",
      "submitted",
    ].includes(status)
  ) {
    return "info";
  }

  if (
    [
      "on-hold",
      "pending",
      "pending_payment",
      "payment_submitted",
      "upcoming",
    ].includes(status)
  ) {
    return "warning";
  }

  if (
    [
      "failed",
      "cancelled",
      "expired",
      "suspended",
      "rejected",
      "overdue",
    ].includes(status)
  ) {
    return "danger";
  }

  return "neutral";
}

type StatusBadgeProps = {
  status: string;
  label?: string;
  tone?: StatusTone;
  className?: string;
};

export function StatusBadge({
  status,
  label,
  tone,
  className,
}: StatusBadgeProps) {
  const resolvedTone =
    tone ?? toneForStatus(status);

  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ring-1 ring-inset",
        toneClasses[resolvedTone],
        className
      )}
    >
      {label ?? status}
    </span>
  );
}
