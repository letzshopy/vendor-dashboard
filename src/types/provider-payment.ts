export type PaymentProviderKey =
  | "zoho"
  | "payglocal";

export type LiveProviderPayment = {
  provider: string;
  providerKey: PaymentProviderKey;
  paymentId: string;
  sessionId: string;
  reference: string;
  transactionReference: string;
  invoiceNumber: string;
  paymentMethod: string;
  paymentMethodDetail: string;
  status: string;
  friendlyStatus: string;
  message: string;
  detailedMessage: string;
  reasonCode: string;
  amount: string;
  currency: string;
  feeAmount: string;
  taxAmount: string;
  totalFeeAmount: string;
  netAmount: string;
  paidAt: string;
  identityVerified: true;
};

export type LiveSettlement = {
  available: boolean;
  scopeRequired: boolean;
  status: string;
  friendlyStatus: string;
  payoutId: string;
  amount: string;
  currency: string;
  initiatedAt: string;
  processedAt: string;
  bankReference: string;
};

export type LivePaymentStatusResponse = {
  ok: true;
  providerKey: PaymentProviderKey;
  order: {
    orderId: number;
    orderNumber: string;
    wooStatus: string;
    paid: boolean;
    amount: string;
    currency: string;
  };
  payment: LiveProviderPayment;
  settlement: LiveSettlement;
};
