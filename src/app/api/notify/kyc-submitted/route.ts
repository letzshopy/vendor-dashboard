import { NextResponse } from "next/server";

export async function POST() {
  // TODO: integrate email (e.g., Resend/SendGrid). For now, just 204.
  return new NextResponse(null, { status: 204 });
}
