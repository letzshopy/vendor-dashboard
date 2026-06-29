import { NextResponse } from "next/server";
import { getGa4Client, getTemplateGa4PropertyId } from "@/lib/ga4";

export const dynamic = "force-dynamic";

type Ga4Row = {
  dimensionValues?: Array<{ value?: string | null } | null> | null;
  metricValues?: Array<{ value?: string | null } | null> | null;
};

function metricValue(row: Ga4Row | undefined, index: number): number {
  const raw = row?.metricValues?.[index]?.value ?? "0";
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export async function GET() {
  try {
    const analyticsDataClient = getGa4Client();
    const propertyId = getTemplateGa4PropertyId();

    const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: "activeUsers" }],
    });

    const realtimeRow = realtimeResponse.rows?.[0] as Ga4Row | undefined;

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

    const summaryRow = summaryResponse.rows?.[0] as Ga4Row | undefined;

    const [topPagesResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: "7daysAgo",
          endDate: "today",
        },
      ],
      dimensions: [{ name: "pageTitle" }, { name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
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
      topPagesResponse.rows?.map((row) => {
        const typedRow = row as Ga4Row;

        return {
          title: typedRow.dimensionValues?.[0]?.value || "Untitled",
          path: typedRow.dimensionValues?.[1]?.value || "/",
          views: metricValue(typedRow, 0),
          users: metricValue(typedRow, 1),
        };
      }) ?? [];

    const [topProductsResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: "7daysAgo",
          endDate: "today",
        },
      ],
      dimensions: [{ name: "pageTitle" }, { name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
      dimensionFilter: {
        filter: {
          fieldName: "pagePath",
          stringFilter: {
            matchType: "BEGINS_WITH",
            value: "/product/",
            caseSensitive: false,
          },
        },
      },
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

    const topProductPages =
      topProductsResponse.rows?.map((row) => {
        const typedRow = row as Ga4Row;

        return {
          title: typedRow.dimensionValues?.[0]?.value || "Untitled product",
          path: typedRow.dimensionValues?.[1]?.value || "/product/",
          views: metricValue(typedRow, 0),
          users: metricValue(typedRow, 1),
        };
      }) ?? [];

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
      deviceResponse.rows?.map((row) => {
        const typedRow = row as Ga4Row;

        return {
          device: typedRow.dimensionValues?.[0]?.value || "unknown",
          users: metricValue(typedRow, 0),
        };
      }) ?? [];

    return NextResponse.json({
      ok: true,
      propertyId,
      range: "last_7_days",
      realtime: {
        activeUsers: metricValue(realtimeRow, 0),
      },
      summary: {
        activeUsers: metricValue(summaryRow, 0),
        pageViews: metricValue(summaryRow, 1),
        sessions: metricValue(summaryRow, 2),
        events: metricValue(summaryRow, 3),
      },
      topPages,
      topProductPages,
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