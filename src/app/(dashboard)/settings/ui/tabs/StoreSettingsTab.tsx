"use client";

import {
  BadgePercent,
  Settings2,
} from "lucide-react";
import {
  useSearchParams,
} from "next/navigation";
import {
  useEffect,
  useState,
} from "react";

import type {
  SessionStoreType,
} from "@/lib/session";

import GeneralTab from "./GeneralTab";
import TaxTab from "./TaxTab";

type View =
  | "store"
  | "tax";

export default function StoreSettingsTab({
  storeType = "multisite",
}: {
  storeType?: SessionStoreType;
}) {
  const searchParams =
    useSearchParams();

  const standalone =
    storeType ===
    "standalone";

  const legacyTab =
    searchParams.get("tab");

  const [
    view,
    setView,
  ] =
    useState<View>(
      standalone ||
      legacyTab ===
        "tax"
        ? "tax"
        : "store"
    );

  useEffect(() => {
    if (standalone) {
      setView("tax");
    }
  }, [standalone]);

  return (
    <div className="space-y-4">
      {!standalone ? (
        <div className="grid w-full grid-cols-2 rounded-xl bg-surface-soft p-1 md:inline-flex md:w-auto md:rounded-2xl">
          <button
            type="button"
            onClick={() =>
              setView(
                "store"
              )
            }
            className={[
              "ls-focus-ring inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition md:justify-start md:gap-2 md:rounded-xl md:px-4 md:text-sm",
              view ===
              "store"
                ? "bg-card text-heading shadow-sm"
                : "text-muted-foreground hover:text-heading",
            ].join(
              " "
            )}
          >
            <Settings2 className="h-4 w-4" />
            Store
          </button>

          <button
            type="button"
            onClick={() =>
              setView(
                "tax"
              )
            }
            className={[
              "ls-focus-ring inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition md:justify-start md:gap-2 md:rounded-xl md:px-4 md:text-sm",
              view ===
              "tax"
                ? "bg-card text-heading shadow-sm"
                : "text-muted-foreground hover:text-heading",
            ].join(
              " "
            )}
          >
            <BadgePercent className="h-4 w-4" />
            Tax & GST
          </button>
        </div>
      ) : null}

      <div
        hidden={
          view !==
          "store"
        }
      >
        {!standalone ? (
          <GeneralTab />
        ) : null}
      </div>

      <div
        hidden={
          view !==
          "tax"
        }
      >
        <TaxTab />
      </div>
    </div>
  );
}
