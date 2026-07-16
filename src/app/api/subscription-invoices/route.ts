import { NextResponse } from "next/server";

import { getBillingInvoices } from "@/lib/subscriptionInvoiceServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
};

export async function GET() {
  try {
    return NextResponse.json(await getBillingInvoices(), {
      status: 200,
      headers: PRIVATE_RESPONSE_HEADERS,
    });
  } catch (error: unknown) {
    console.error(
      "Billing invoice request failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json([], {
      status: 200,
      headers: PRIVATE_RESPONSE_HEADERS,
    });
  }
}
