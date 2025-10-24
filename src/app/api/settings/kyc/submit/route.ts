// src/app/api/settings/kyc/submit/route.ts
import { NextResponse } from 'next/server';
import { deepPatchSettings, getSettings } from '@/src/lib/settingsStore';

export async function POST() {
  const now = new Date().toISOString();
  const current = getSettings();

  deepPatchSettings({
    kyc: { kycStatus: 'in_review', submittedAt: now },
  });

  // TODO: send email to support@letzshopy.in here.

  return NextResponse.json({ ok: true, kycStatus: 'in_review', submittedAt: now });
}
