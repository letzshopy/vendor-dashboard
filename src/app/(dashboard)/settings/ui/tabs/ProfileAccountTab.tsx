"use client";

import {
  ShieldCheck,
  User,
} from "lucide-react";
import {
  useSearchParams,
} from "next/navigation";
import {
  useState,
} from "react";

import AccountTab from "./AccountTab";
import ProfileTab from "./ProfileTab";

type View =
  | "profile"
  | "account";

export default function ProfileAccountTab() {
  const searchParams =
    useSearchParams();

  const legacyTab =
    searchParams.get("tab");

  const [
    view,
    setView,
  ] =
    useState<View>(
      legacyTab ===
        "account"
        ? "account"
        : "profile"
    );

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-2xl bg-surface-soft p-1">
        <button
          type="button"
          onClick={() =>
            setView(
              "profile"
            )
          }
          className={[
            "ls-focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition",
            view ===
            "profile"
              ? "bg-card text-heading shadow-sm"
              : "text-muted-foreground hover:text-heading",
          ].join(
            " "
          )}
        >
          <User className="h-4 w-4" />
          Profile
        </button>

        <button
          type="button"
          onClick={() =>
            setView(
              "account"
            )
          }
          className={[
            "ls-focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition",
            view ===
            "account"
              ? "bg-card text-heading shadow-sm"
              : "text-muted-foreground hover:text-heading",
          ].join(
            " "
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          Account & Security
        </button>
      </div>

      <div
        hidden={
          view !==
          "profile"
        }
      >
        <ProfileTab />
      </div>

      <div
        hidden={
          view !==
          "account"
        }
      >
        <AccountTab />
      </div>
    </div>
  );
}
