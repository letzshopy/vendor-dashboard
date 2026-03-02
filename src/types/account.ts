// src/types/account.ts

export type AccountPlan = "Trial" | "Paid";
export type BillingCycle = "Yearly";

export interface AccountSettings {
  overview: {
    account_id: string;
    store_url: string;
    created_on: string; // ISO date string: "YYYY-MM-DD"
  };
  contact: {
    contact_name: string;
    contact_email: string;
    contact_mobile: string;
  };
  subscription: {
    current_plan: AccountPlan; // "Trial" during first 15 days, then "Paid"
    billing_cycle: BillingCycle; // Always "Yearly"
    amount_label: string; // e.g. "₹6,500 incl. GST"
    billing_status: "" | "trial" | "active" | "cancelled" | "expired";
    next_renewal_date: string; // ISO date string
    gstin: string;
    billing_name: string;
    business_name: string;
    billing_address: string;
    autopay_enabled: boolean;
  };
  security: {
    login_email: string;
  };
}
