"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Eye,
  Globe2,
  MonitorSmartphone,
  MousePointerClick,
  RefreshCw,
  Users,
} from "lucide-react";

type WebsiteSummary = {
  activeUsers: number;
  pageViews: number;
  sessions: number;
  events: number;
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
  summary?: WebsiteSummary;
  topPages?: TopPage[];
  devices?: DeviceRow[];
  error?: string;
};

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat("en-IN").format(value ?? 0);
}

function labelDevice(device: string) {
  if (device === "desktop") return "Desktop";
  if (device === "mobile") return "Mobile";
  if (device === "tablet") return "Tablet";
  return device || "Unknown";
}

export default function WebsiteAnalyticsReportClient() {
  const [data, setData] = useState<WebsiteAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadAnalytics(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/reports/website/summary", {
        cache: "no-store",
      });

      const json = (await response.json()) as WebsiteAnalyticsResponse;

      setData(json);
    } catch (error) {
      setData({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load website analytics.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const summary = data?.summary;

  const totalDeviceUsers = useMemo(() => {
    return (data?.devices ?? []).reduce((total, item) => total + item.users, 0);
  }, [data?.devices]);

  if (loading) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="h-5 w-44 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-[22px] bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className="rounded-[24px] border border-red-100 bg-red-50 p-5">
        <div className="text-sm font-semibold text-red-700">
          Website analytics could not be loaded.
        </div>
        <p className="mt-2 text-sm text-red-600">
          {data?.error || "Please check GA4 API connection."}
        </p>
        <button
          type="button"
          onClick={() => loadAnalytics(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const cards = [
    {
      label: "Active Users",
      value: summary?.activeUsers,
      icon: Users,
      note: "Last 7 days",
    },
    {
      label: "Page Views",
      value: summary?.pageViews,
      icon: Eye,
      note: "Total page visits",
    },
    {
      label: "Sessions",
      value: summary?.sessions,
      icon: Activity,
      note: "Visitor sessions",
    },
    {
      label: "Events",
      value: summary?.events,
      icon: MousePointerClick,
      note: "Tracked actions",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[24px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700 shadow-sm">
            <Globe2 className="h-3.5 w-3.5" />
            Website Analytics
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
            Store traffic overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Google Analytics report for the last 7 days.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadAnalytics(true)}
          disabled={refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-700">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  GA4
                </span>
              </div>

              <div className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                {formatNumber(card.value)}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-600">
                {card.label}
              </div>
              <div className="mt-1 text-xs text-slate-400">{card.note}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Top pages
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Most visited pages from Google Analytics.
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-slate-400" />
          </div>

          <div className="overflow-hidden rounded-[18px] border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-semibold">Page</th>
                  <th className="px-3 py-3 text-right font-semibold">
                    Views
                  </th>
                  <th className="px-3 py-3 text-right font-semibold">
                    Users
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data.topPages ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-6 text-center text-sm text-slate-500"
                    >
                      No page data available yet.
                    </td>
                  </tr>
                ) : (
                  (data.topPages ?? []).map((page) => (
                    <tr key={`${page.title}-${page.path}`}>
                      <td className="min-w-0 px-3 py-3">
                        <div className="max-w-[420px] truncate font-medium text-slate-800">
                          {page.title}
                        </div>
                        <div className="mt-0.5 max-w-[420px] truncate text-xs text-slate-400">
                          {page.path}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-800">
                        {formatNumber(page.views)}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600">
                        {formatNumber(page.users)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Device split
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Visitors by device category.
              </p>
            </div>
            <MonitorSmartphone className="h-5 w-5 text-slate-400" />
          </div>

          <div className="space-y-4">
            {(data.devices ?? []).length === 0 ? (
              <div className="rounded-[18px] bg-slate-50 p-4 text-sm text-slate-500">
                No device data available yet.
              </div>
            ) : (
              (data.devices ?? []).map((device) => {
                const percent =
                  totalDeviceUsers > 0
                    ? Math.round((device.users / totalDeviceUsers) * 100)
                    : 0;

                return (
                  <div key={device.device}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {labelDevice(device.device)}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatNumber(device.users)} users
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-900"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="mt-1 text-right text-xs text-slate-400">
                      {percent}%
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        This is currently connected to the Template Store test GA4 property. For
        live vendors, each store will have its own GA4 property ID so reports do
        not mix between vendors.
      </div>
    </div>
  );
}