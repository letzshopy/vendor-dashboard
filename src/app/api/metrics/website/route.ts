import { getGa4Client, getGa4PropertyIdForTenant } from "@/lib/ga4";
import {
  privateReportJson,
  reportErrorResponse,
} from "@/lib/reportPolicy";
import { getTenantFromCookies } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ga4Row = {
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

  if (
    !(["http:", "https:"] as string[]).includes(parsed.protocol) ||
    !parsed.hostname
  ) {
    throw new TypeError("Invalid selected store URL");
  }

  return parsed.hostname.toLowerCase();
}

export async function GET() {
  try {
    const tenant = await getTenantFromCookies();

    if (!tenant) {
      throw new TypeError("No verified vendor store is selected");
    }

    const hostname = selectedStoreHostname(tenant.store_url);
    const analyticsDataClient = getGa4Client();
    const propertyId = getGa4PropertyIdForTenant(
      tenant.blog_id,
      hostname,
    );
    const property = `properties/${propertyId}`;

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

    const [realtimeResult, todayResult] = await Promise.all([
      analyticsDataClient.runRealtimeReport({
        property,
        metrics: [{ name: "activeUsers" }],
      }),
      analyticsDataClient.runReport({
        property,
        dateRanges: [{ startDate: "today", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
        dimensionFilter: hostnameFilter,
      }),
    ]);

    const [realtimeResponse] = realtimeResult;
    const [todayResponse] = todayResult;
    const realtimeRow = realtimeResponse.rows?.[0] as Ga4Row | undefined;
    const todayRow = todayResponse.rows?.[0] as Ga4Row | undefined;

    return privateReportJson({
      ok: true,
      propertyId,
      hostname,
      realtime: {
        activeUsers: metricValue(realtimeRow, 0),
      },
      today: {
        activeUsers: metricValue(todayRow, 0),
      },
      refreshedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return reportErrorResponse(
      error,
      "Unable to load website activity metrics",
    );
  }
}
