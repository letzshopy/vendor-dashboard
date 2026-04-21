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

    /** UPI ID like name@bank */
    upi_id: string;

    /** Mobile number linked to UPI (optional) */
    upi_number?: string;

    /** Payee / account holder name */
    payee?: string;

    /** Show QR code option */
    qr: "yes" | "no";

    /** Payment time limit in minutes */
    time_min?: string;

    /** Notes shown on checkout / email */
    notes?: string;

    /** URL of uploaded QR image */
    qr_src?: string;

    /** Screenshot upload on thank-you page on/off */
    require_screenshot: boolean;
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