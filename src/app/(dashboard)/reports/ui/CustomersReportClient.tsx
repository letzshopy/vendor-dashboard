"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ShoppingBag,
  UserCheck,
  Users,
} from "lucide-react";

import {
  Skeleton,
} from "@/components/ui/skeleton";

type CustomersSummary = {
  registered: number;
  guest: number;
  totalOrders: number;
};

export default function CustomersReportClient() {
  const [
    data,
    setData,
  ] =
    useState<CustomersSummary | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      try {
        const response =
          await fetch(
            "/api/reports/customers/summary",
            {
              cache:
                "no-store",
            }
          );

        const json =
          await response.json();

        if (!cancelled) {
          setData(json);
        }
      } finally {
        if (!cancelled) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalCustomers =
    useMemo(() => {
      return (
        Number(
          data?.registered ||
            0
        ) +
        Number(
          data?.guest ||
            0
        )
      );
    }, [data]);

  const registeredPercent =
    useMemo(() => {
      if (!totalCustomers) {
        return 0;
      }

      return Math.round(
        (
          Number(
            data?.registered ||
              0
          ) /
          totalCustomers
        ) *
          100
      );
    }, [
      data,
      totalCustomers,
    ]);

  const guestPercent =
    useMemo(() => {
      if (!totalCustomers) {
        return 0;
      }

      return Math.round(
        (
          Number(
            data?.guest ||
              0
          ) /
          totalCustomers
        ) *
          100
      );
    }, [
      data,
      totalCustomers,
    ]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {Array.from({
            length: 3,
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
        <Skeleton className="h-56 rounded-xl md:rounded-2xl" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <Metric
          icon={
            <UserCheck className="h-4 w-4" />
          }
          label="Registered"
          value={String(
            data?.registered ??
              0
          )}
        />

        <Metric
          icon={
            <Users className="h-4 w-4" />
          }
          label="Guest"
          value={String(
            data?.guest ??
              0
          )}
        />

        <Metric
          icon={
            <ShoppingBag className="h-4 w-4" />
          }
          label="Orders"
          value={String(
            data?.totalOrders ??
              0
          )}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
        <div className="border-b border-border px-3 py-3 md:px-4">
          <div className="text-sm font-extrabold text-heading">
            Customer mix
          </div>
        </div>

        <div className="space-y-4 p-3 md:p-4">
          <MixRow
            label="Registered customers"
            count={Number(
              data?.registered ??
                0
            )}
            percent={
              registeredPercent
            }
          />

          <MixRow
            label="Guest orders"
            count={Number(
              data?.guest ??
                0
            )}
            percent={
              guestPercent
            }
          />

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <InfoCard
              title="Customer activity"
              value={String(
                totalCustomers
              )}
              note="Registered + guest"
            />

            <InfoCard
              title="Registered share"
              value={`${registeredPercent}%`}
              note="Account customers"
            />

            <div className="col-span-2 md:col-span-1">
              <InfoCard
                title="Guest share"
                value={`${guestPercent}%`}
                note="Guest checkout"
              />
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon:
    React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-3 md:rounded-2xl md:p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="hidden sm:inline-flex">
          {icon}
        </span>

        <div className="truncate text-[10px] font-bold uppercase tracking-wide md:text-[11px]">
          {label}
        </div>
      </div>

      <div className="mt-2 truncate text-lg font-extrabold text-heading md:text-2xl">
        {value}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl bg-surface-soft p-3 md:rounded-2xl md:p-4">
      <div className="text-xs font-bold text-heading md:text-sm">
        {title}
      </div>

      <div className="mt-1.5 text-xl font-extrabold text-heading md:mt-2 md:text-2xl">
        {value}
      </div>

      <div className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
        {note}
      </div>
    </div>
  );
}

function MixRow({
  label,
  count,
  percent,
}: {
  label: string;
  count: number;
  percent: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">
          {label}
        </div>

        <div className="text-sm font-extrabold text-heading">
          {count}
          <span className="ml-1 text-xs font-semibold text-muted-foreground">
            ({percent}%)
          </span>
        </div>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width:
              `${percent}%`,
          }}
        />
      </div>
    </div>
  );
}
