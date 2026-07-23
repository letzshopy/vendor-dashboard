import { getGa4Client, getGa4PropertyIdForTenant } from "@/lib/ga4";
import {
  privateReportJson,
  reportErrorResponse,
  safeText,
} from "@/lib/reportPolicy";
import { getTenantFromCookies } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ga4Row = {
  dimensionValues?: Array<{ value?: string | null } | null> | null;
  metricValues?: Array<{ value?: string | null } | null> | null;
};

function metricValue(row: Ga4Row | undefined, index: number): number {
  const value = Number(row?.metricValues?.[index]?.value ?? 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function selectedStoreHostname(storeUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(storeUrl);
  } catch {
    throw new TypeError("Invalid selected store URL");
  }

  if (!(["http:", "https:"] as string[]).includes(parsed.protocol) || !parsed.hostname) {
    throw new TypeError("Invalid selected store URL");
  }
  return parsed.hostname.toLowerCase();
}

export async function GET() {
  try {
    const tenant = await getTenantFromCookies();
    if (!tenant) throw new TypeError("No verified vendor store is selected");

    const hostname = selectedStoreHostname(tenant.store_url);
    const analyticsDataClient = getGa4Client();
    const propertyId = getGa4PropertyIdForTenant(tenant.blog_id, hostname);
    const property = `properties/${propertyId}`;

    const [realtimeResponse] =
      await analyticsDataClient.runRealtimeReport({
        property,
        metrics: [{ name: "activeUsers" }],
      });

    const realtimeRow =
      realtimeResponse.rows?.[0] as Ga4Row | undefined;
    const hostnameFilter = {
      filter: {
        fieldName: "hostName",
        stringFilter: {
          matchType: "EXACT" as const,
          value: hostname,
          caseSensitive: false,
        },
      },
    };

    const [summaryResponse] = await analyticsDataClient.runReport({
      property,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      metrics: [
        { name: "activeUsers" },
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "eventCount" },
      ],
      dimensionFilter: hostnameFilter,
    });
    const summaryRow = summaryResponse.rows?.[0] as Ga4Row | undefined;

    const [topPagesResponse] = await analyticsDataClient.runReport({
      property,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "pageTitle" }, { name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
      dimensionFilter: hostnameFilter,
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    });
    const topPages = topPagesResponse.rows?.map((row) => {
      const typed = row as Ga4Row;
      return {
        title: safeText(typed.dimensionValues?.[0]?.value, 300) || "Untitled",
        path: safeText(typed.dimensionValues?.[1]?.value, 1_000) || "/",
        views: metricValue(typed, 0),
        users: metricValue(typed, 1),
      };
    }) ?? [];

    const [topCategoriesResponse] = await analyticsDataClient.runReport({
      property,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "pageTitle" }, { name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            hostnameFilter,
            {
              filter: {
                fieldName: "pagePath",
                stringFilter: {
                  matchType: "BEGINS_WITH" as const,
                  value: "/product-category/",
                  caseSensitive: false,
                },
              },
            },
          ],
        },
      },
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    });
    const topCategoryPages = topCategoriesResponse.rows?.map((row) => {
      const typed = row as Ga4Row;
      return {
        title: safeText(typed.dimensionValues?.[0]?.value, 300) || "Untitled category",
        path: safeText(typed.dimensionValues?.[1]?.value, 1_000) || "/product-category/",
        views: metricValue(typed, 0),
        users: metricValue(typed, 1),
      };
    }) ?? [];

    const [deviceResponse] = await analyticsDataClient.runReport({
      property,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }],
      dimensionFilter: hostnameFilter,
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    });
    const devices = deviceResponse.rows?.map((row) => {
      const typed = row as Ga4Row;
      return {
        device: safeText(typed.dimensionValues?.[0]?.value, 50) || "unknown",
        users: metricValue(typed, 0),
      };
    }) ?? [];

    return privateReportJson({
      ok: true,
      propertyId,
      hostname,
      range: "last_7_days",
      // GA4 Realtime does not support hostName filtering. Returning shared
      // property-wide realtime data here would expose other vendors' traffic.
      realtime: { activeUsers: 0, available: false },
      summary: {
        activeUsers: metricValue(summaryRow, 0),
        pageViews: metricValue(summaryRow, 1),
        sessions: metricValue(summaryRow, 2),
        events: metricValue(summaryRow, 3),
      },
      topPages,
      topCategoryPages,
      devices,
    });
  } catch (error: unknown) {
    return reportErrorResponse(error, "Unable to load website analytics");
  }
}
