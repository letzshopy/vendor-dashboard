"use client";

import { useEffect, useMemo, useState } from "react";
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
  realtime?: RealtimeSummary;
  summary?: WebsiteSummary;
  topPages?: TopPage[];
  topCategoryPages?: TopPage[];
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

function DataTable({
  title,
  description,
  icon,
  rows,
  emptyText,
}: {
  title: string;
  description: string;
  icon: "pages" | "products";
  rows: TopPage[];
  emptyText: string;
}) {
  const Icon = icon === "products" ? PackageSearch : BarChart3;

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <Icon className="h-5 w-5 text-slate-400" />
      </div>

      <div className="overflow-hidden rounded-[18px] border border-slate-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-3 py-3 font-semibold">Page</th>
              <th className="px-3 py-3 text-right font-semibold">Views</th>
              <th className="px-3 py-3 text-right font-semibold">Users</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-6 text-center text-sm text-slate-500"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((page) => (
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
  );
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
  const realtime = data?.realtime;

  const totalDeviceUsers = useMemo(() => {
    return (data?.devices ?? []).reduce((total, item) => total + item.users, 0);
  }, [data?.devices]);

  if (loading) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="h-5 w-44 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((item) => (
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
      label: "Live Users Now",
      value: realtime?.activeUsers,
      icon: Radio,
      note: "Realtime",
      badge: "Live",
    },
    {
      label: "Active Users",
      value: summary?.activeUsers,
      icon: Users,
      note: "Last 7 days",
      badge: "GA4",
    },
    {
      label: "Page Views",
      value: summary?.pageViews,
      icon: Eye,
      note: "Total page visits",
      badge: "GA4",
    },
    {
      label: "Sessions",
      value: summary?.sessions,
      icon: Activity,
      note: "Visitor sessions",
      badge: "GA4",
    },
    {
      label: "Events",
      value: summary?.events,
      icon: MousePointerClick,
      note: "Tracked actions",
      badge: "GA4",
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
            Google Analytics report for the last 7 days with live visitor count.
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          const isLive = card.badge === "Live";

          return (
            <div
              key={card.label}
              className={`rounded-[24px] border p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${
                isLive
                  ? "border-emerald-200 bg-emerald-50/80"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div
                  className={`rounded-2xl p-2.5 ${
                    isLive
                      ? "bg-white text-emerald-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    isLive
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {card.badge}
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

      <div className="grid gap-4 xl:grid-cols-2">
        <DataTable
          title="Top pages"
          description="Most visited pages from Google Analytics."
          icon="pages"
          rows={data.topPages ?? []}
          emptyText="No page data available yet."
        />

                <DataTable
          title="Top category views"
          description="Product category pages visited by customers."
          icon="products"
          rows={data.topCategoryPages ?? []}
          emptyText="No category view data available yet."
        />
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

        <div className="grid gap-4 md:grid-cols-2">
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
                <div key={device.device} className="rounded-[18px] bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {labelDevice(device.device)}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(device.users)} users
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
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
  );
}
