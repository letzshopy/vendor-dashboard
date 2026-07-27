"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Radio,
  RefreshCw,
  Users,
} from "lucide-react";

type WebsiteMetricsResponse = {
  ok?: boolean;
  realtime?: {
    activeUsers?: number;
  };
  today?: {
    activeUsers?: number;
  };
  error?: string;
};

function formatNumber(value: number | undefined): string {
  return new Intl.NumberFormat("en-IN").format(value ?? 0);
}

export default function DashboardHomeAnalyticsCards() {
  const [data, setData] = useState<WebsiteMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadMetrics(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/metrics/website", {
        cache: "no-store",
      });
      const parsed = (await response.json().catch(() => null)) as
        | WebsiteMetricsResponse
        | null;

      if (!response.ok || !parsed?.ok) {
        setData({
          ok: false,
          error:
            parsed?.error ||
            "Website activity is temporarily unavailable.",
        });
        return;
      }

      setData(parsed);
    } catch (error) {
      setData({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Website activity is temporarily unavailable.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadMetrics();

    const timer = window.setInterval(() => {
      void loadMetrics(true);
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="dashboard-home-analytics min-w-0 rounded-[26px] border border-slate-200/70 bg-white p-4 shadow-sm shadow-slate-200/60 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-950">
            Website activity
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Live and today&apos;s visitors from Google Analytics.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => loadMetrics(true)}
            disabled={refreshing}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Refresh website activity"
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>

          <Link
            href="/reports?rt=website"
            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            Full report
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 animate-pulse rounded-[22px] bg-slate-100" />
          <div className="h-28 animate-pulse rounded-[22px] bg-slate-100" />
        </div>
      ) : data?.ok ? (
        <div className="grid grid-cols-2 gap-3" aria-live="polite">
          <div className="min-w-0 rounded-[22px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                <Radio className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Live
              </span>
            </div>
            <div className="mt-4 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
              {formatNumber(data.realtime?.activeUsers)}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-700">
              Live users now
            </div>
          </div>

          <div className="min-w-0 rounded-[22px] border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                <Users className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                Today
              </span>
            </div>
            <div className="mt-4 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
              {formatNumber(data.today?.activeUsers)}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-700">
              Total visitors today
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <div className="font-semibold">Website activity unavailable</div>
          <p className="mt-1 text-xs leading-5 text-amber-700">
            {data?.error || "Please check the GA4 connection."}
          </p>
        </div>
      )}
    </section>
  );
}
