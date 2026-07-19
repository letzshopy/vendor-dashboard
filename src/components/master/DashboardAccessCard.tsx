"use client";

import { useState } from "react";

type Props = {
  blogid: number;
  locked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  unlockedAt?: string;
  unlockedBy?: string;
  storefrontSuspended: boolean;
  storefrontSuspendedAt?: string;
  storefrontSuspendedBy?: string;
  storefrontRestoredAt?: string;
  storefrontRestoredBy?: string;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function errorText(
  value: unknown,
  fallback: string
): string {
  return isRecord(value) &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}

export default function DashboardAccessCard({
  blogid,
  locked,
  lockedAt,
  lockedBy,
  unlockedAt,
  unlockedBy,
  storefrontSuspended,
  storefrontSuspendedAt,
  storefrontSuspendedBy,
  storefrontRestoredAt,
  storefrontRestoredBy,
}: Props) {
  const [saving, setSaving] = useState<
    "" | "dashboard" | "storefront"
  >("");

  const [
    currentLocked,
    setCurrentLocked,
  ] = useState(locked);

  const [
    currentStorefrontSuspended,
    setCurrentStorefrontSuspended,
  ] = useState(storefrontSuspended);

  const [message, setMessage] =
    useState("");

  async function updateDashboard(
    nextLocked: boolean
  ) {
    setSaving("dashboard");
    setMessage("");

    try {
      const response = await fetch(
        `/api/master/vendors/${blogid}/dashboard-access`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            locked: nextLocked,
          }),
        }
      );

      const result: unknown = await response
        .json()
        .catch(() => null);

      if (
        !response.ok ||
        !isRecord(result) ||
        result.ok !== true
      ) {
        throw new Error(
          errorText(
            result,
            "Failed to update dashboard access."
          )
        );
      }

      setCurrentLocked(nextLocked);
      setMessage(
        nextLocked
          ? "Dashboard locked."
          : "Dashboard unlocked."
      );

      window.location.reload();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update dashboard access."
      );
    } finally {
      setSaving("");
    }
  }

  async function updateStorefront(
    suspended: boolean
  ) {
    setSaving("storefront");
    setMessage("");

    try {
      const response = await fetch(
        `/api/master/vendors/${blogid}/storefront-access`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            suspended,
          }),
        }
      );

      const result: unknown = await response
        .json()
        .catch(() => null);

      if (
        !response.ok ||
        !isRecord(result) ||
        result.ok !== true
      ) {
        throw new Error(
          errorText(
            result,
            "Failed to update storefront access."
          )
        );
      }

      setCurrentStorefrontSuspended(
        suspended
      );

      setMessage(
        suspended
          ? "Storefront suspended."
          : "Storefront restored."
      );

      window.location.reload();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update storefront access."
      );
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="space-y-5 rounded-2xl border border-white/10 bg-white p-4 shadow-sm">
      <section>
        <div className="mb-3 font-semibold text-slate-900">
          Dashboard Access
        </div>

        <div className="space-y-2 text-sm text-slate-900">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Status
            </span>
            <span
              className={
                currentLocked
                  ? "font-medium text-red-600"
                  : "font-medium text-emerald-600"
              }
            >
              {currentLocked
                ? "Locked"
                : "Unlocked"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Locked at
            </span>
            <span>{lockedAt || "-"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Locked by
            </span>
            <span>{lockedBy || "-"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Last unlocked
            </span>
            <span>{unlockedAt || "-"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Unlocked by
            </span>
            <span>{unlockedBy || "-"}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void updateDashboard(
              !currentLocked
            )
          }
          disabled={saving !== ""}
          className={
            currentLocked
              ? "mt-4 rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-60"
              : "mt-4 rounded-xl bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-60"
          }
        >
          {saving === "dashboard"
            ? "Saving..."
            : currentLocked
              ? "Unlock Dashboard"
              : "Lock Dashboard"}
        </button>
      </section>

      <section className="border-t border-slate-200 pt-5">
        <div className="mb-3 font-semibold text-slate-900">
          Live Storefront
        </div>

        <div className="space-y-2 text-sm text-slate-900">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Status
            </span>
            <span
              className={
                currentStorefrontSuspended
                  ? "font-medium text-red-600"
                  : "font-medium text-emerald-600"
              }
            >
              {currentStorefrontSuspended
                ? "Suspended"
                : "Live"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Suspended at
            </span>
            <span>
              {storefrontSuspendedAt ||
                "-"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Suspended by
            </span>
            <span>
              {storefrontSuspendedBy ||
                "-"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Last restored
            </span>
            <span>
              {storefrontRestoredAt ||
                "-"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">
              Restored by
            </span>
            <span>
              {storefrontRestoredBy ||
                "-"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void updateStorefront(
              !currentStorefrontSuspended
            )
          }
          disabled={saving !== ""}
          className={
            currentStorefrontSuspended
              ? "mt-4 rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-60"
              : "mt-4 rounded-xl bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
          }
        >
          {saving === "storefront"
            ? "Saving..."
            : currentStorefrontSuspended
              ? "Restore Storefront"
              : "Suspend Storefront"}
        </button>
      </section>

      {message ? (
        <div className="text-xs text-slate-500">
          {message}
        </div>
      ) : null}
    </div>
  );
}
