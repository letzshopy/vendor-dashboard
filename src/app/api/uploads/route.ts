// src/app/api/uploads/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  const ext = (file.type && file.type.split("/")[1]) || "bin";
  const id = crypto.randomUUID();
  const filename = `${id}.${ext}`;

  // Save to /public/uploads
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const filepath = path.join(uploadsDir, filename);
  await fs.writeFile(filepath, buffer);

  const url = `/uploads/${filename}`; // served by Next static
  return NextResponse.json({ url, filename, size: buffer.length, mime: file.type || "application/octet-stream" });
}
