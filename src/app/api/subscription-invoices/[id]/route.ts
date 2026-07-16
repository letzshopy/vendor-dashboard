import { NextResponse } from "next/server";

import { getBillingInvoices } from "@/lib/subscriptionInvoiceServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoices = await getBillingInvoices();
    const invoice = invoices.find((item) => item.id === id);

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404, headers: PRIVATE_RESPONSE_HEADERS }
      );
    }

    return NextResponse.json(invoice, {
      status: 200,
      headers: PRIVATE_RESPONSE_HEADERS,
    });
  } catch (error: unknown) {
    console.error(
      "Billing invoice detail request failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Invoice not found" },
      { status: 404, headers: PRIVATE_RESPONSE_HEADERS }
    );
  }
}
