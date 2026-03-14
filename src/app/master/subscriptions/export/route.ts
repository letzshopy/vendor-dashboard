// src/app/master/subscriptions/export/route.ts
import { NextResponse } from "next/server";
import { getMasterWpBaseUrl } from "@/lib/wpClient";

type SubItem = {
  blogId: number;
  siteName: string;
  siteUrl: string;
  plan: string;
  billingCycle: string;
  billingStatus: string;
  createdOn: string;
  nextRenewalDate: string;
  autopayEnabled: boolean;
  daysToRenewal: number | null;
  tag: string;
};

export const dynamic = "force-dynamic";

function masterHeaders() {
  const key = process.env.MASTER_API_KEY;
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(key ? { Authorization: `Bearer ${key}`, "X-Letz-Master-Key": key } : {}),
  };
}

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  try {
    // ✅ master-only base URL (never tenant)
    const MASTER_WP_URL = getMasterWpBaseUrl();

    const url = `${MASTER_WP_URL.replace(/\/$/, "")}/wp-json/letz/v1/master-subscriptions`;

    const res = await fetch(url, {
      headers: masterHeaders(),
      cache: "no-store",
    });

    const text = await res.text();

    if (!res.ok) {
      return new NextResponse(
        `Export failed: ${res.status}\n${text.slice(0, 2000)}`,
        { status: 500 }
      );
    }

    const json = JSON.parse(text) as { items: SubItem[] };

    const headers = [
      "blogId",
      "siteName",
      "siteUrl",
      "plan",
      "billingCycle",
      "billingStatus",
      "createdOn",
      "nextRenewalDate",
      "daysToRenewal",
      "tag",
      "autopayEnabled",
    ];

    const rows = [headers.join(",")];

    for (const it of json.items || []) {
      rows.push(
        [
          it.blogId,
          it.siteName,
          it.siteUrl,
          it.plan,
          it.billingCycle,
          it.billingStatus,
          it.createdOn,
          it.nextRenewalDate,
          it.daysToRenewal ?? "",
          it.tag,
          it.autopayEnabled ? "YES" : "NO",
        ]
          .map(csvEscape)
          .join(",")
      );
    }

    const csv = rows.join("\n");
    const filename = `letzshopy-subscriptions-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Export failed", { status: 500 });
  }
}