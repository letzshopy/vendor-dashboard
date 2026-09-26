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
    <section className="overflow-hidden rounded-2xl bg-[#26366E] text-white shadow-[0_14px_34px_rgba(38,54,110,0.18)]">
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(360px,auto)] md:items-center md:p-5">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#314784] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-indigo-100">
                <span className="h-1.5 w-1.5 rounded-full bg-[#20B486]" />
                Store traffic
              </div>

              <h2 className="mt-3 text-lg font-extrabold tracking-tight">
                Website Activity
              </h2>

              <p className="mt-1 max-w-xl text-xs leading-5 text-indigo-100/75">
                Live and today&apos;s visitors from Google Analytics.
              </p>
            </div>

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
              className="ls-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#314784] text-white hover:bg-[#3A518F]"
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

          <Link
            href="/reports?rt=website"
            className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-extrabold text-[#26366E]"
          >
            Open website report
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {data?.ok ===
        false ? (
          <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-3 py-3 text-sm text-rose-100">
            {data.error ||
              "Website activity is temporarily unavailable."}
          </div>
        ) : (
          <div
            aria-live="polite"
            className="grid grid-cols-2 overflow-hidden rounded-xl bg-[#1F2C63]"
          >
            <div className="flex min-w-0 items-center gap-3 border-r border-white/10 px-3 py-3.5">
              <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#20B486] text-white">
                <Radio className="h-5 w-5" />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-white" />
              </span>

              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.07em] text-indigo-100/70">
                  Live now
                </div>

                <div className="mt-0.5 text-2xl font-extrabold">
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

            <div className="flex min-w-0 items-center gap-3 px-3 py-3.5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F15E4A] text-white">
                <Users className="h-5 w-5" />
              </span>

              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.07em] text-indigo-100/70">
                  Visitors today
                </div>

                <div className="mt-0.5 text-2xl font-extrabold">
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
