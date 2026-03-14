export type SubscriptionInvoiceStatus = "paid";

export type SubscriptionInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO date
  planCode: "standard" | "premium";
  planLabel: string;
  billingCycle: "monthly" | "yearly";
  periodFrom: string; // ISO date
  periodTo: string; // ISO date
  taxableAmount: number;
  gstRate: number; // 18
  gstAmount: number;
  totalAmount: number; // GST inclusive
  currency: string; // INR
  gstNumber?: string;
  billingName: string;
  billingAddress: string;
  billingState: string;
  billingPhone?: string;
  status: SubscriptionInvoiceStatus;
  paymentMode: string; // UPI / Bank Transfer / etc
  paymentReference?: string; // UTR / txn ref
};

export function formatInvoiceDate(d: string) {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatMoney(amount: number, currency = "INR") {
  if (currency !== "INR") return `${currency} ${amount.toFixed(2)}`;
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}