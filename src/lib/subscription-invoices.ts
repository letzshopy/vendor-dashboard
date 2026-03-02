export type SubscriptionInvoiceStatus = "paid";

export type SubscriptionInvoice = {
  id: number;
  number: string;
  date: string; // ISO date
  planName: string;
  periodFrom: string; // ISO date
  periodTo: string;   // ISO date
  amountExclTax: number;
  taxRate: number; // e.g. 0 or 18
  taxAmount: number;
  totalAmount: number;
  currency: string; // e.g. "INR"
  gstType: "gst" | "non-gst";
  gstNumber?: string;
  billingName: string;
  billingAddress: string;
  billingState: string;
  billingPhone?: string;
  status: SubscriptionInvoiceStatus;
  paymentMode: string; // e.g. "UPI", "NetBanking"
};

const demoInvoices: SubscriptionInvoice[] = [
  {
    id: 1,
    number: "LS-INV-2025-0001",
    date: "2025-04-01",
    planName: "LetzShopy Annual Store Subscription",
    periodFrom: "2025-04-01",
    periodTo: "2026-03-31",
    amountExclTax: 5500,
    taxRate: 18,
    taxAmount: 990,
    totalAmount: 6490,
    currency: "INR",
    gstType: "gst",
    gstNumber: "29ABCDE1234F1Z5",
    billingName: "Mosin Boutique",
    billingAddress: "No. 12, Sample Street,\nKodigehalli, Bengaluru, Karnataka, 560092",
    billingState: "Karnataka",
    billingPhone: "+91-9876543210",
    status: "paid",
    paymentMode: "UPI",
  },
  {
    id: 2,
    number: "LS-INV-2025-0002",
    date: "2025-09-01",
    planName: "LetzShopy Annual Store Subscription (Non-GST)",
    periodFrom: "2025-09-01",
    periodTo: "2026-08-31",
    amountExclTax: 6500,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 6500,
    currency: "INR",
    gstType: "non-gst",
    billingName: "Sample Vendor Store",
    billingAddress: "Flat 5B, Test Apartments,\nCoimbatore, Tamil Nadu, 641001",
    billingState: "Tamil Nadu",
    billingPhone: "+91-9000000000",
    status: "paid",
    paymentMode: "Bank Transfer",
  },
];

export function getAllSubscriptionInvoices(): SubscriptionInvoice[] {
  // TODO: replace demo array with real data from your billing backend
  return demoInvoices;
}

export function getSubscriptionInvoiceById(
  id: number | string
): SubscriptionInvoice | undefined {
  const num = typeof id === "string" ? parseInt(id, 10) : id;
  return demoInvoices.find((inv) => inv.id === num);
}
