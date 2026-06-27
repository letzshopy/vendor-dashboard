import { NextResponse } from "next/server";
import { getGa4Client, getTemplateGa4PropertyId } from "@/lib/ga4";

export const dynamic = "force-dynamic";

function metricValue(row: any, index: number): number {
  const raw = row?.metricValues?.[index]?.value ?? "0";
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export async function GET() {
  try {
    const analyticsDataClient = getGa4Client();
    const propertyId = getTemplateGa4PropertyId();

    const [summaryResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: "7daysAgo",
          endDate: "today",
        },
      ],
      metrics: [
        { name: "activeUsers" },
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "eventCount" },
      ],
    });

    const summaryRow = summaryResponse.rows?.[0];

    const [topPagesResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: "7daysAgo",
          endDate: "today",
        },
      ],
      dimensions: [
        { name: "pageTitle" },
        { name: "pagePath" },
      ],
      metrics: [
        { name: "screenPageViews" },
        { name: "activeUsers" },
      ],
      orderBys: [
        {
          metric: {
            metricName: "screenPageViews",
          },
          desc: true,
        },
      ],
      limit: 10,
    });

    const topPages =
      topPagesResponse.rows?.map((row) => ({
        title: row.dimensionValues?.[0]?.value || "Untitled",
        path: row.dimensionValues?.[1]?.value || "/",
        views: metricValue(row, 0),
        users: metricValue(row, 1),
      })) ?? [];

    const [deviceResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: "7daysAgo",
          endDate: "today",
        },
      ],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [
        {
          metric: {
            metricName: "activeUsers",
          },
          desc: true,
        },
      ],
    });

    const devices =
      deviceResponse.rows?.map((row) => ({
        device: row.dimensionValues?.[0]?.value || "unknown",
        users: metricValue(row, 0),
      })) ?? [];

    return NextResponse.json({
      ok: true,
      propertyId,
      range: "last_7_days",
      summary: {
        activeUsers: summaryRow ? metricValue(summaryRow, 0) : 0,
        pageViews: summaryRow ? metricValue(summaryRow, 1) : 0,
        sessions: summaryRow ? metricValue(summaryRow, 2) : 0,
        events: summaryRow ? metricValue(summaryRow, 3) : 0,
      },
      topPages,
      devices,
    });
  } catch (error) {
    console.error("GA4 summary error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load GA4 website analytics.",
      },
      { status: 500 }
    );
  }
}