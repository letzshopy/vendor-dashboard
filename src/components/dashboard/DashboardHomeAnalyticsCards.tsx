"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
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

function formatNumber(
  value: number | undefined
): string {
  return new Intl.NumberFormat(
    "en-IN"
  ).format(
    value ?? 0
  );
}

export default function DashboardHomeAnalyticsCards() {
  const [
    data,
    setData,
  ] =
    useState<WebsiteMetricsResponse | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const loadMetrics =
    useCallback(
      async (
        isRefresh = false
      ) => {
        try {
          if (isRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          const response =
            await fetch(
              "/api/metrics/website",
              {
                cache: "no-store",
              }
            );

          const parsed =
            (
              await response
                .json()
                .catch(() => null)
            ) as
              | WebsiteMetricsResponse
              | null;

          if (
            !response.ok ||
            !parsed?.ok
          ) {
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
      },
      []
    );

  useEffect(() => {
    void loadMetrics();

    const timer =
      window.setInterval(
        () => {
          void loadMetrics(true);
        },
        60_000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [loadMetrics]);

  return (
    <section className="rounded-2xl border border-[#DFE5F1] bg-[linear-gradient(120deg,#F2F4FB_0%,#FFFFFF_55%,#FFF6F3_100%)] px-4 py-4 shadow-[0_8px_24px_rgba(38,51,95,0.04)] md:px-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(320px,auto)] md:items-center">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-[#26335F]">
                Website Activity
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Live and today&apos;s visitors from Google Analytics.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadMetrics(true)
              }
              disabled={refreshing}
              aria-label="Refresh website activity"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-slate-400 md:hidden"
            >
              <RefreshCw
                className={[
                  "h-4 w-4",
                  refreshing
                    ? "animate-spin"
                    : "",
                ].join(" ")}
              />
            </button>
          </div>

          <Link
            href="/reports?rt=website"
            className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs font-bold text-[#5366B7]"
          >
            Open website report
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {data?.ok === false ? (
          <p className="border-l-2 border-rose-400 pl-3 text-sm text-rose-700">
            {data.error ||
              "Website activity is temporarily unavailable."}
          </p>
        ) : (
          <div
            aria-live="polite"
            className="grid grid-cols-2 divide-x divide-[#D9DEEC] rounded-xl bg-white/75 px-2 py-3"
          >
            <div className="flex min-w-0 items-center gap-3 px-3">
              <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Radio className="h-5 w-5" />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500" />
              </span>

              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-slate-500">
                  Live now
                </div>

                <div className="mt-0.5 text-2xl font-extrabold text-[#26335F]">
                  {loading
                    ? "…"
                    : formatNumber(
                        data
                          ?.realtime
                          ?.activeUsers
                      )}
                </div>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3 px-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF1FA] text-[#5366B7]">
                <Users className="h-5 w-5" />
              </span>

              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-slate-500">
                  Visitors today
                </div>

                <div className="mt-0.5 text-2xl font-extrabold text-[#26335F]">
                  {loading
                    ? "…"
                    : formatNumber(
                        data
                          ?.today
                          ?.activeUsers
                      )}
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            void loadMetrics(true)
          }
          disabled={refreshing}
          aria-label="Refresh website activity"
          className="absolute hidden"
        >
          <RefreshCw />
        </button>
      </div>
    </section>
  );
}
