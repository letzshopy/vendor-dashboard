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

import {
  actionFeedback,
} from "@/lib/actionFeedback";

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
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const loadMetrics =
    useCallback(
      async (
        isRefresh = false
      ) => {
        const feedbackId =
          "dashboard-website-refresh";

        try {
          if (isRefresh) {
            setRefreshing(true);
            actionFeedback.loading({
              id: feedbackId,
              title:
                "Refreshing website activity…",
            });
          } else {
            setLoading(true);
          }

          const response =
            await fetch(
              "/api/metrics/website",
              {
                cache:
                  "no-store",
              }
            );

          const parsed =
            (
              await response
                .json()
                .catch(
                  () => null
                )
            ) as
              | WebsiteMetricsResponse
              | null;

          if (
            !response.ok ||
            !parsed?.ok
          ) {
            throw new Error(
              parsed?.error ||
                "Website activity is temporarily unavailable."
            );
          }

          setData(parsed);

          if (isRefresh) {
            actionFeedback.success({
              id: feedbackId,
              title:
                "Website activity refreshed",
              durationMs: 2200,
            });
          }
        } catch (
          error
        ) {
          const message =
            error instanceof
            Error
              ? error.message
              : "Website activity is temporarily unavailable.";

          setData({
            ok: false,
            error:
              message,
          });

          if (isRefresh) {
            actionFeedback.error({
              id: feedbackId,
              title:
                "Could not refresh website activity",
              message,
              durationMs: 4200,
            });
          }
        } finally {
          setLoading(false);
          setRefreshing(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    void loadMetrics();

    const timer =
      window.setInterval(
        () => {
          void loadMetrics();
        },
        60_000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [loadMetrics]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E1E6F0] bg-white shadow-[0_8px_24px_rgba(38,51,95,0.06)]">
      <div className="p-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-5 md:p-4">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#4059A7]">
                Store traffic
              </div>

              <h2 className="mt-0.5 truncate text-[16px] font-extrabold tracking-tight text-[#182451] md:text-lg">
                Website Activity
              </h2>

              <p className="mt-1 hidden text-xs text-muted-foreground md:block">
                Live and today&apos;s visitors from Google Analytics.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 md:hidden">
              <Link
                href="/reports?rt=website"
                className="ls-focus-ring inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-extrabold text-[#4059A7]"
              >
                Report
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <button
                type="button"
                onClick={() =>
                  void loadMetrics(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                aria-label="Refresh website activity"
                className="ls-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF1FA] text-[#4059A7]"
              >
                <RefreshCw
                  className={[
                    "h-4 w-4",
                    refreshing
                      ? "animate-spin"
                      : "",
                  ].join(
                    " "
                  )}
                />
              </button>
            </div>
          </div>

          <div className="mt-3 hidden items-center gap-2 md:flex">
            <Link
              href="/reports?rt=website"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#182451] px-3 text-xs font-extrabold text-white"
            >
              Open website report
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <button
              type="button"
              onClick={() =>
                void loadMetrics(
                  true
                )
              }
              disabled={
                refreshing
              }
              aria-label="Refresh website activity"
              className="ls-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF1FA] text-[#4059A7]"
            >
              <RefreshCw
                className={[
                  "h-4 w-4",
                  refreshing
                    ? "animate-spin"
                    : "",
                ].join(
                  " "
                )}
              />
            </button>
          </div>
        </div>

        {data?.ok ===
        false ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 md:mt-0 md:max-w-sm">
            {data.error ||
              "Website activity is temporarily unavailable."}
          </div>
        ) : (
          <div
            aria-live="polite"
            className="mt-3 grid grid-cols-2 gap-2 md:mt-0 md:min-w-[330px]"
          >
            <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-[#F1FBF7] px-3 py-2.5">
              <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#20B486] text-white">
                <Radio className="h-4 w-4" />
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white" />
              </span>

              <div className="min-w-0">
                <div className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-emerald-700/70">
                  Live now
                </div>

                <div className="mt-0.5 text-xl font-extrabold text-[#182451]">
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

            <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-[#FFF3F0] px-3 py-2.5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#18A6C9] text-white">
                <Users className="h-4 w-4" />
              </span>

              <div className="min-w-0">
                <div className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-[#11748C]/75">
                  Visitors today
                </div>

                <div className="mt-0.5 text-xl font-extrabold text-[#182451]">
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
      </div>
    </section>
  );
}
