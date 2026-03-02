// src/types/payments.ts

export interface PaymentsFormValues {
  general: {
    enabled: boolean;
    default_status: string;
  };
  easebuzz: {
    enabled: boolean;
    mode?: string;
    merchant_key?: string;
    salt?: string;
    merchant_id?: string;
    webhook_secret?: string;
    hint?: string;
  };
  upi: {
    enabled: boolean;
    upi_id: string;
    /** mobile UPI payment number */
    upi_number?: string;
    payee?: string;
    qr: "yes" | "no";
    time_min?: string;
    notes?: string;
    /** URL of QR image */
    qr_src?: string;
  };
  bank: {
    enabled: boolean;
    account_name?: string;
    account_number?: string;
    ifsc?: string;
    bank?: string;
    branch?: string;
    notes?: string;
  };
  cod: {
    enabled: boolean;
    notes?: string;
  };
  cheque: {
    enabled: boolean;
    notes?: string;
  };
}
