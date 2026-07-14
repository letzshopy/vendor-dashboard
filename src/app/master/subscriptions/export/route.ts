// src/app/master/subscriptions/export/route.ts
import { NextResponse } from "next/server";
import { fetchMasterSubscriptions } from "@/lib/masterOperations";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown) {
  let s = String(v ?? "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .slice(0, 4_096);

  if (/^[=+@-]/.test(s)) {
    s = `'${s}`;
  }

  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  try {
    const data = await fetchMasterSubscriptions();

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

    for (const it of data.items) {
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
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error(
      "Master subscription export failed:",
      error instanceof Error ? error.message : "Unknown export error"
    );

    return NextResponse.json(
      { error: "Failed to export subscriptions." },
      {
        status: 502,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  }
}
