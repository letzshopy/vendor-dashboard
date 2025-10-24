// src/app/api/settings/upload/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Accept multipart/form-data and "pretend" to store it.
  // In production, push to S3, WP Media, etc., then return that URL.
  const form = await req.formData();
  const file = form.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }

  // Create an object URL-ish placeholder (we can’t persist on server here).
  const url = `/api/settings/upload/tmp/${encodeURIComponent(file.name)}`;

  return NextResponse.json({
    ok: true,
    fileName: file.name,
    url,
    size: file.size,
    type: file.type,
  });
}
