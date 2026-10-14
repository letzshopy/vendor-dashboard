import type {
  LiveProviderPayment,
  LiveSettlement,
} from "@/types/provider-payment";

export type PaymentMethodKind =
  | "zoho"
  | "payglocal"
  | "manual_upi"
  | "bank_transfer"
  | "cod"
  | "other";

export type PaymentLedgerStatusCode =
  | "check-live-status"
  | "verified"
  | "paid-in-woocommerce"
  | "pending-verification"
  | "pending-bank-transfer"
  | "pay-on-delivery"
  | "not-paid"
  | "failed"
  | "unknown";

export type PaymentLedgerStatusSource =
  | "provider-live-required"
  | "provider-live"
  | "manual-upi"
  | "woocommerce"
  | "unavailable";

export type PaymentLedgerStatus = {
  code: PaymentLedgerStatusCode;
  label: string;
  source: PaymentLedgerStatusSource;
};

export type PaymentReference = {
  label: string;
  value: string;
};

export type ManualUpiPaymentData = {
  transactionId: string;
  verifiedAt: string;
  proofAvailable: boolean;
};

export type PaymentLedgerRow = {
  orderId: number;
  orderNumber: string;

  createdAtGmt: string;

  customer: {
    name: string;
    email: string;
    phone: string;
  };

  amount: string;
  currency: string;

  paymentMethod: {
    id: string;
    title: string;
    kind: PaymentMethodKind;
  };

  paymentStatus: PaymentLedgerStatus;

  woo: {
    orderStatus: string;
    paidRecorded: boolean;
    paidAtGmt: string;
    transactionId: string;
  };

  reference: PaymentReference | null;

  manualUpi: ManualUpiPaymentData | null;

  gateway: {
    requiresLiveStatus: boolean;
    live: LiveProviderPayment | null;
    settlement: LiveSettlement | null;
  } | null;
};

export type CurrencyTotal = {
  currency: string;
  amount: string;
};

export type PaymentLedgerSummary = {
  totalTransactions: number;

  methods: {
    zoho: number;
    payglocal: number;
    manualUpi: number;
    bankTransfer: number;
    cod: number;
    other: number;
  };

  manualUpiPendingVerification: number;

  orderValue: CurrencyTotal[];

  wooRecordedPaidValue: CurrencyTotal[];
};

export type PaymentLedgerResponse = {
  ok: true;

  rows: PaymentLedgerRow[];

  summary: PaymentLedgerSummary;

  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

export type PaymentLedgerMethodFilter =
  | "all"
  | PaymentMethodKind;
