export const DEFAULT_TRIAL_DAYS = 7;
export const RENEWAL_GRACE_DAYS = 5;
export const RENEWAL_REMINDER_DAYS = [7, 3, 0] as const;

export type BillingCycle = "monthly" | "yearly";

export type SubscriptionStatus =
  | "trial"
  | "payment_submitted"
  | "pending_payment"
  | "active"
  | "renewal_due"
  | "grace_period"
  | "expired"
  | "suspended"
  | "cancelled"
  | "inactive";

export type SubscriptionPhase =
  | "trial"
  | "payment_pending"
  | "active"
  | "renewal_due"
  | "grace_period"
  | "expired"
  | "suspended"
  | "inactive";

export type SubscriptionTimeline = {
  phase: SubscriptionPhase;
  effectiveStatus: SubscriptionStatus;
  daysUntilDue: number | null;
  daysOverdue: number;
  reminderDue: boolean;
  graceEndsAt: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}

export function parseSubscriptionDate(
  value: unknown
): Date | null {
  const raw = String(value || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }

  const parsed = new Date(`${raw}T00:00:00.000Z`);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

export function formatSubscriptionDate(
  date: Date
): string {
  return date.toISOString().slice(0, 10);
}

export function addBillingPeriod(
  date: Date,
  cycle: BillingCycle
): Date {
  const source = startOfUtcDay(date);
  const sourceDay = source.getUTCDate();
  const target = new Date(source);

  target.setUTCDate(1);

  if (cycle === "monthly") {
    target.setUTCMonth(target.getUTCMonth() + 1);
  } else {
    target.setUTCFullYear(target.getUTCFullYear() + 1);
  }

  const lastDay = new Date(
    Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  target.setUTCDate(Math.min(sourceDay, lastDay));

  return target;
}

export function calculateApprovedRenewalDate(input: {
  billingCycle: BillingCycle;
  approvedAt?: Date;
  currentPaidThrough?: unknown;
}): string {
  const approvedAt = startOfUtcDay(
    input.approvedAt || new Date()
  );

  const currentPaidThrough = parseSubscriptionDate(
    input.currentPaidThrough
  );

  const base =
    currentPaidThrough &&
    currentPaidThrough.getTime() > approvedAt.getTime()
      ? currentPaidThrough
      : approvedAt;

  return formatSubscriptionDate(
    addBillingPeriod(base, input.billingCycle)
  );
}

export function normalizeSubscriptionStatus(
  value: unknown
): SubscriptionStatus {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  const allowed: SubscriptionStatus[] = [
    "trial",
    "payment_submitted",
    "pending_payment",
    "active",
    "renewal_due",
    "grace_period",
    "expired",
    "suspended",
    "cancelled",
    "inactive",
  ];

  return allowed.includes(
    status as SubscriptionStatus
  )
    ? (status as SubscriptionStatus)
    : "inactive";
}

export function evaluateSubscriptionTimeline(input: {
  status: unknown;
  trialEndsAt?: unknown;
  nextPaymentDate?: unknown;
  now?: Date;
}): SubscriptionTimeline {
  const status = normalizeSubscriptionStatus(
    input.status
  );

  const today = startOfUtcDay(
    input.now || new Date()
  );

  if (status === "suspended") {
    return {
      phase: "suspended",
      effectiveStatus: "suspended",
      daysUntilDue: null,
      daysOverdue: 0,
      reminderDue: false,
      graceEndsAt: "",
    };
  }

  if (
    status === "cancelled" ||
    status === "inactive"
  ) {
    return {
      phase: "inactive",
      effectiveStatus: status,
      daysUntilDue: null,
      daysOverdue: 0,
      reminderDue: false,
      graceEndsAt: "",
    };
  }

  if (status === "payment_submitted" || status === "pending_payment") {
    return {
      phase: "payment_pending",
      effectiveStatus: "payment_submitted",
      daysUntilDue: null,
      daysOverdue: 0,
      reminderDue: false,
      graceEndsAt: "",
    };
  }

  const dueDate =
    status === "trial"
      ? parseSubscriptionDate(input.trialEndsAt)
      : parseSubscriptionDate(input.nextPaymentDate);

  if (!dueDate) {
    return {
      phase: status === "trial" ? "trial" : "active",
      effectiveStatus: status,
      daysUntilDue: null,
      daysOverdue: 0,
      reminderDue: false,
      graceEndsAt: "",
    };
  }

  const dayDifference = Math.floor(
    (dueDate.getTime() - today.getTime()) / DAY_MS
  );

  if (dayDifference >= 0) {
    return {
      phase: status === "trial" ? "trial" : "active",
      effectiveStatus: status,
      daysUntilDue: dayDifference,
      daysOverdue: 0,
      reminderDue:
        RENEWAL_REMINDER_DAYS.includes(
          dayDifference as 0 | 3 | 7
        ),
      graceEndsAt: "",
    };
  }

  const daysOverdue = Math.abs(dayDifference);
  const graceEnd = new Date(
    dueDate.getTime() +
      RENEWAL_GRACE_DAYS * DAY_MS
  );

  if (daysOverdue <= RENEWAL_GRACE_DAYS) {
    return {
      phase: "grace_period",
      effectiveStatus: "grace_period",
      daysUntilDue: dayDifference,
      daysOverdue,
      reminderDue: true,
      graceEndsAt:
        formatSubscriptionDate(graceEnd),
    };
  }

  return {
    phase: "expired",
    effectiveStatus: "expired",
    daysUntilDue: dayDifference,
    daysOverdue,
    reminderDue: false,
    graceEndsAt:
      formatSubscriptionDate(graceEnd),
  };
}
