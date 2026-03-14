"use client";

type SubscriptionStatus =
  | "inactive"
  | "payment_submitted"
  | "active"
  | "suspended"
  | "expired";

type Props = {
  status?: string;
  nextPaymentDate?: string;
};

function normalizeDate(input?: string) {
  if (!input) return "";
  const s = String(input).trim();
  if (!s) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return "";
}

function daysUntil(dateStr?: string) {
  const iso = normalizeDate(dateStr);
  if (!iso) return null;

  const today = new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const due = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;

  return Math.floor((due.getTime() - startToday.getTime()) / 86400000);
}

function formatPrettyDate(dateStr?: string) {
  const iso = normalizeDate(dateStr);
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function RenewalNotice({
  status,
  nextPaymentDate,
}: Props) {
  const s = (status || "").toLowerCase() as SubscriptionStatus;
  const days = daysUntil(nextPaymentDate);
  const prettyDate = formatPrettyDate(nextPaymentDate);

  if (s === "payment_submitted") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="text-sm font-semibold text-amber-800">
          Payment submitted
        </div>
        <div className="mt-1 text-sm text-amber-700">
          Your renewal payment has been submitted and is awaiting LetzShopy verification.
        </div>
      </div>
    );
  }

  if (s === "expired") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
        <div className="text-sm font-semibold text-rose-800">
          Subscription expired
        </div>
        <div className="mt-1 text-sm text-rose-700">
          Your subscription has expired. Please renew to restore full dashboard access.
        </div>
      </div>
    );
  }

  if (s !== "active" || days === null || days < 0 || days > 5) {
    return null;
  }

  let message = `Your subscription renews on ${prettyDate}. Please renew before the due date to avoid dashboard interruption.`;

  if (days === 0) {
    message = "Your subscription is due today. Please renew today to avoid dashboard interruption.";
  } else if (days === 1) {
    message = `Your subscription renews tomorrow (${prettyDate}). Please renew now to avoid dashboard interruption.`;
  } else {
    message = `Your subscription renews in ${days} days (${prettyDate}). Please renew before the due date to avoid dashboard interruption.`;
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
      <div className="text-sm font-semibold text-violet-800">
        Subscription renewal reminder
      </div>
      <div className="mt-1 text-sm text-violet-700">{message}</div>
      <div className="mt-3">
        <a
          href="/settings?tab=subscription"
          className="inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Renew Subscription
        </a>
      </div>
    </div>
  );
}