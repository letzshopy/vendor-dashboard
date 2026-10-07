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
      <div className="grid w-full grid-cols-2 rounded-xl bg-surface-soft p-1 md:inline-flex md:w-auto md:rounded-2xl">
        <button
          type="button"
          onClick={() =>
            setView(
              "profile"
            )
          }
          className={[
            "ls-focus-ring inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition md:justify-start md:gap-2 md:rounded-xl md:px-4 md:text-sm",
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
            "ls-focus-ring inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition md:justify-start md:gap-2 md:rounded-xl md:px-4 md:text-sm",
            view ===
            "account"
              ? "bg-card text-heading shadow-sm"
              : "text-muted-foreground hover:text-heading",
          ].join(
            " "
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          <span className="md:hidden">Account</span>
          <span className="hidden md:inline">Account & Security</span>
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
