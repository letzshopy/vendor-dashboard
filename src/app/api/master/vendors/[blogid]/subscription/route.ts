import { NextResponse } from "next/server";

const MASTER_WP_URL = process.env.MASTER_WP_URL!;
const MASTER_API_KEY = process.env.MASTER_API_KEY!;

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ blogid: string }> }
) {
  try {
    const { blogid } = await params;
    const body = await req.text();

    const res = await fetch(
      `${MASTER_WP_URL.replace(/\/$/, "")}/wp-json/letz/v1/master-vendors/${blogid}`,
      {
        method: "PUT",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${MASTER_API_KEY}`,
          "X-Letz-Master-Key": MASTER_API_KEY,
          "Content-Type": "application/json",
        },
        body,
      }
    );

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update subscription" },
      { status: 500 }
    );
  }
}