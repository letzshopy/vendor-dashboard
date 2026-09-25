"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  BarChart3,
  Eye,
  Globe2,
  MonitorSmartphone,
  MousePointerClick,
  PackageSearch,
  Radio,
  RefreshCw,
  Users,
} from "lucide-react";

import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Skeleton,
} from "@/components/ui/skeleton";

type WebsiteSummary = {
  activeUsers: number;
  pageViews: number;
  sessions: number;
  events: number;
};

type RealtimeSummary = {
  activeUsers: number;
};

type TopPage = {
  title: string;
  path: string;
  views: number;
  users: number;
};

type DeviceRow = {
  device: string;
  users: number;
};

type WebsiteAnalyticsResponse = {
  ok: boolean;
  propertyId?: string;
  range?: string;
  realtime?:
    RealtimeSummary;
  summary?:
    WebsiteSummary;
  topPages?:
    TopPage[];
  topCategoryPages?:
    TopPage[];
  devices?:
    DeviceRow[];
  error?: string;
};

function formatNumber(
  value:
    | number
    | undefined
) {
  return new Intl.NumberFormat(
    "en-IN"
  ).format(
    value ?? 0
  );
}

function labelDevice(
  device: string
) {
  if (
    device ===
    "desktop"
  ) {
    return "Desktop";
  }

  if (
    device ===
    "mobile"
  ) {
    return "Mobile";
  }

  if (
    device ===
    "tablet"
  ) {
    return "Tablet";
  }

  return (
    device ||
    "Unknown"
  );
}

function DataList({
  title,
  icon,
  rows,
  emptyText,
}: {
  title: string;
  icon:
    "pages" |
    "products";
  rows: TopPage[];
  emptyText: string;
}) {
  const Icon =
    icon ===
    "products"
      ? PackageSearch
      : BarChart3;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 md:px-4">
        <div className="text-sm font-extrabold text-heading">
          {title}
        </div>

        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      {rows.length ===
      0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <>
          <div className="divide-y divide-border md:hidden">
            {rows.map(
              (
                page
              ) => (
                <div
                  key={`${page.title}-${page.path}`}
                  className="p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-heading">
                      {
                        page.title
                      }
                    </div>

                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {
                        page.path
                      }
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-surface-soft px-3 py-2">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Views
                      </div>
                      <div className="mt-1 text-sm font-extrabold text-heading">
                        {formatNumber(
                          page.views
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg bg-surface-soft px-3 py-2">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Users
                      </div>
                      <div className="mt-1 text-sm font-extrabold text-heading">
                        {formatNumber(
                          page.users
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-soft text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">
                    Page
                  </th>
                  <th className="px-4 py-3 text-right">
                    Views
                  </th>
                  <th className="px-4 py-3 text-right">
                    Users
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (
                    page
                  ) => (
                    <tr
                      key={`${page.title}-${page.path}`}
                      className="border-t border-border"
                    >
                      <td className="px-4 py-3.5">
                        <div className="max-w-[420px] truncate font-semibold text-heading">
                          {
                            page.title
                          }
                        </div>
                        <div className="mt-0.5 max-w-[420px] truncate text-xs text-muted-foreground">
                          {
                            page.path
                          }
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-bold text-heading">
                        {formatNumber(
                          page.views
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right text-foreground">
                        {formatNumber(
                          page.users
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default function WebsiteAnalyticsReportClient() {
  const [
    data,
    setData,
  ] =
    useState<WebsiteAnalyticsResponse | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  async function loadAnalytics(
    isRefresh =
      false
  ) {
    try {
      if (
        isRefresh
      ) {
        setRefreshing(
          true
        );
      } else {
        setLoading(
          true
        );
      }

      const response =
        await fetch(
          "/api/reports/website/summary",
          {
            cache:
              "no-store",
          }
        );

      const json =
        (
          await response.json()
        ) as WebsiteAnalyticsResponse;

      setData(json);
    } catch (
      error
    ) {
      setData({
        ok: false,
        error:
          error instanceof
            Error
            ? error.message
            : "Unable to load website analytics.",
      });
    } finally {
      setLoading(
        false
      );

      setRefreshing(
        false
      );
    }
  }

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const summary =
    data?.summary;

  const realtime =
    data?.realtime;

  const totalDeviceUsers =
    useMemo(() => {
      return (
        data?.devices ??
        []
      ).reduce(
        (
          total,
          item
        ) =>
          total +
          item.users,
        0
      );
    }, [
      data?.devices,
    ]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
          {Array.from({
            length: 5,
          }).map(
            (
              _,
              index
            ) => (
              <Skeleton
                key={
                  index
                }
                className="h-24 rounded-xl md:h-28 md:rounded-2xl"
              />
            )
          )}
        </div>

        <Skeleton className="h-64 rounded-xl md:rounded-2xl" />
      </div>
    );
  }

  if (
    !data?.ok
  ) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 md:rounded-2xl">
        <div className="text-sm font-extrabold text-rose-700">
          Website analytics could not be loaded.
        </div>

        <p className="mt-1 text-sm text-rose-600">
          {data?.error ||
            "Please check GA4 API connection."}
        </p>

        <AsyncButton
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          loading={
            refreshing
          }
          loadingLabel="Retrying…"
          onClick={() =>
            void loadAnalytics(
              true
            )
          }
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </AsyncButton>
      </div>
    );
  }

  const cards = [
    {
      label:
        "Live users",
      value:
        realtime?.activeUsers,
      icon: Radio,
      note:
        "Realtime",
      live: true,
    },
    {
      label:
        "Active users",
      value:
        summary?.activeUsers,
      icon: Users,
      note:
        "Last 7 days",
      live: false,
    },
    {
      label:
        "Page views",
      value:
        summary?.pageViews,
      icon: Eye,
      note:
        "Last 7 days",
      live: false,
    },
    {
      label:
        "Sessions",
      value:
        summary?.sessions,
      icon:
        Activity,
      note:
        "Last 7 days",
      live: false,
    },
    {
      label: "Events",
      value:
        summary?.events,
      icon:
        MousePointerClick,
      note:
        "Tracked actions",
      live: false,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="hidden md:block">
          <div className="flex items-center gap-2 text-sm font-extrabold text-heading">
            <Globe2 className="h-4 w-4 text-primary" />
            Store traffic
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Google Analytics — last 7 days.
          </p>
        </div>

        <AsyncButton
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          loading={
            refreshing
          }
          loadingLabel="Refreshing…"
          onClick={() =>
            void loadAnalytics(
              true
            )
          }
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </AsyncButton>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
        {cards.map(
          (
            card
          ) => {
            const Icon =
              card.icon;

            return (
              <div
                key={
                  card.label
                }
                className={[
                  "min-w-0 rounded-xl border p-3 md:rounded-2xl md:p-4",
                  card.live
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-border bg-card",
                ].join(
                  " "
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={[
                      "grid h-8 w-8 place-items-center rounded-lg",
                      card.live
                        ? "bg-white text-emerald-700"
                        : "bg-secondary text-secondary-foreground",
                    ].join(
                      " "
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  {card.live ? (
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      LIVE
                    </span>
                  ) : null}
                </div>

                <div className="mt-2 text-xl font-extrabold tracking-tight text-heading md:text-2xl">
                  {formatNumber(
                    card.value
                  )}
                </div>

                <div className="mt-0.5 truncate text-xs font-bold text-foreground md:text-sm">
                  {
                    card.label
                  }
                </div>

                <div className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">
                  {
                    card.note
                  }
                </div>
              </div>
            );
          }
        )}

        <div className="col-span-2 md:hidden">
          <div className="rounded-xl bg-surface-soft px-3 py-2.5 text-xs text-muted-foreground">
            Website activity is shown for the last 7 days, with live users updated from GA4.
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataList
          title="Top pages"
          icon="pages"
          rows={
            data.topPages ??
            []
          }
          emptyText="No page data available yet."
        />

        <DataList
          title="Top category views"
          icon="products"
          rows={
            data.topCategoryPages ??
            []
          }
          emptyText="No category data available yet."
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 md:px-4">
          <div className="text-sm font-extrabold text-heading">
            Device split
          </div>

          <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="grid gap-3 p-3 md:grid-cols-2 md:p-4">
          {(data.devices ??
            []).length ===
          0 ? (
            <div className="rounded-xl bg-surface-soft p-4 text-sm text-muted-foreground">
              No device data available yet.
            </div>
          ) : (
            (
              data.devices ??
              []
            ).map(
              (
                device
              ) => {
                const percent =
                  totalDeviceUsers >
                  0
                    ? Math.round(
                        (
                          device.users /
                          totalDeviceUsers
                        ) *
                          100
                      )
                    : 0;

                return (
                  <div
                    key={
                      device.device
                    }
                    className="rounded-xl bg-surface-soft p-3 md:p-4"
                  >
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-foreground">
                        {labelDevice(
                          device.device
                        )}
                      </span>

                      <span className="font-extrabold text-heading">
                        {formatNumber(
                          device.users
                        )}{" "}
                        users
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width:
                            `${percent}%`,
                        }}
                      />
                    </div>

                    <div className="mt-1 text-right text-[11px] font-semibold text-muted-foreground">
                      {
                        percent
                      }
                      %
                    </div>
                  </div>
                );
              }
            )
          )}
        </div>
      </section>
    </div>
  );
}
