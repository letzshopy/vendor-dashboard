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
    security: {
    login_email: string;
  };
}
