// src/app/api/settings/kyc/submit/route.ts
import { NextResponse } from "next/server";
import { deepPatchSettings } from "@/lib/settingsStore";

export async function POST() {
  try {
    const now = new Date().toISOString();

    // Update KYC status in settings (implementation lives in settingsStore)
    await deepPatchSettings({
      kyc: {
        kycStatus: "in_review",
        submittedAt: now,
      },
    } as any);

    // TODO: send email to support@letzshopy.in here.

    return NextResponse.json({
      ok: true,
      kycStatus: "in_review",
      submittedAt: now,
    });
  } catch (err: any) {
    console.error("KYC submit error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to submit KYC",
      },
      { status: 500 }
    );
  }
}
