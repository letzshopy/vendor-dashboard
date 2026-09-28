"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Store as StoreIcon,
} from "lucide-react";

import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Button,
} from "@/components/ui/button";
import {
  EmptyState,
} from "@/components/ui/empty-state";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

const BRAND_LOGO_URL =
  process.env
    .NEXT_PUBLIC_BRAND_LOGO_URL ||
  "https://letzshopy.in/wp-content/uploads/2025/12/Letzshopy_Logo_TBG.png";

type Store = {
  blog_id: number;
  store_name: string;
  store_url: string;
};

type AuthMeResponse = {
  ok?: boolean;
  email?: string;
  saas_role?: string;
  stores?: Store[];
  error?: string;
};

function displayDomain(
  value: string
): string {
  try {
    return new URL(value)
      .hostname
      .replace(
        /^www\./,
        ""
      );
  } catch {
    return value
      .replace(
        /^https?:\/\//,
        ""
      )
      .replace(
        /\/$/,
        ""
      );
  }
}

function initials(
  value: string
): string {
  const letters =
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase() ||
          ""
      )
      .join("");

  return letters || "LS";
}

export default function SelectStorePage() {
  const [
    stores,
    setStores,
  ] =
    useState<Store[]>(
      []
    );

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    selectingId,
    setSelectingId,
  ] =
    useState<number | null>(
      null
    );

  async function loadStores() {
    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/auth/me",
          {
            cache:
              "no-store",
          }
        );

      const payload =
        (
          await response
            .json()
            .catch(
              () => ({})
            )
        ) as AuthMeResponse;

      if (
        !response.ok ||
        !payload.ok
      ) {
        throw new Error(
          payload.error ||
            "Your session could not be verified."
        );
      }

      setEmail(
        String(
          payload.email ||
            ""
        )
      );

      setStores(
        Array.isArray(
          payload.stores
        )
          ? payload.stores
          : []
      );
    } catch (
      loadError
    ) {
      setError(
        loadError instanceof
        Error
          ? loadError.message
          : "Could not load your stores."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStores();
  }, []);

  const storeCount =
    stores.length;

  const heading =
    useMemo(
      () =>
        storeCount === 1
          ? "Open your store"
          : "Choose a store",
      [storeCount]
    );

  async function chooseStore(
    store: Store
  ) {
    if (selectingId) {
      return;
    }

    const feedbackId =
      "select-store";

    setSelectingId(
      store.blog_id
    );
    setError(null);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Opening store…",
      message:
        store.store_name ||
        displayDomain(
          store.store_url
        ),
    });

    try {
      const response =
        await fetch(
          "/api/tenant/select",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                store
              ),
          }
        );

      const payload =
        (
          await response
            .json()
            .catch(
              () => ({})
            )
        ) as {
          ok?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !payload.ok
      ) {
        throw new Error(
          payload.error ||
            "Could not open this store."
        );
      }

      actionFeedback.success({
        id: feedbackId,
        title:
          "Store selected",
        message:
          "Opening dashboard…",
        durationMs: 1500,
      });

      window.dispatchEvent(
        new Event(
          "letzshopy:navigation-start"
        )
      );

      window.location.assign(
        "/dashboard"
      );
    } catch (
      selectError
    ) {
      const message =
        selectError instanceof
        Error
          ? selectError.message
          : "Could not open this store.";

      setError(message);

      actionFeedback.error({
        id: feedbackId,
        title:
          "Store selection failed",
        message,
        durationMs: 4000,
      });

      setSelectingId(null);
    }
  }

  async function signOut() {
    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
        }
      );
    } finally {
      window.location.assign(
        "/signin"
      );
    }
  }

  return (
    <main className="min-h-dvh bg-[#F3F5FA] px-3 pb-[calc(var(--ls-safe-area-bottom)+1rem)] pt-[calc(var(--ls-safe-area-top)+0.75rem)] text-[#182451] sm:px-5 md:px-8 md:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-var(--ls-safe-area-top)-var(--ls-safe-area-bottom)-1.75rem)] w-full max-w-[1120px] flex-col overflow-hidden rounded-[28px] border border-[#DDE3EE] bg-white shadow-[0_24px_70px_rgba(24,36,81,0.12)] md:min-h-[640px]">
        <header className="flex items-center justify-between gap-3 border-b border-[#25356C] bg-[#182451] px-4 py-4 text-white md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-white px-3 py-2 shadow-sm">
              <img
                src={
                  BRAND_LOGO_URL
                }
                alt="LetzShopy"
                className="h-8 w-auto object-contain md:h-9"
              />
            </div>

            <div className="hidden min-w-0 sm:block">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-indigo-100/65">
                Vendor access
              </div>

              <div className="mt-0.5 truncate text-sm font-extrabold">
                Select Store
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              void signOut()
            }
            className="border border-white/10 bg-[#26366E] text-white hover:bg-[#314784] hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">
              Sign out
            </span>
          </Button>
        </header>

        <div className="grid flex-1 lg:grid-cols-[0.74fr_1.26fr]">
          <aside className="hidden bg-[#26366E] p-7 text-white lg:flex lg:flex-col lg:justify-between xl:p-9">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#314784] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-indigo-100">
                <ShieldCheck className="h-3.5 w-3.5 text-[#20B486]" />
                Secure workspace
              </div>

              <h1 className="mt-5 max-w-sm text-[30px] font-extrabold leading-tight tracking-tight">
                One login.
                <br />
                Your stores.
              </h1>

              <p className="mt-3 max-w-sm text-sm leading-6 text-indigo-100/70">
                Choose the business you want to manage. You can switch stores again whenever needed.
              </p>
            </div>

            <div className="rounded-2xl bg-[#314784] p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20B486] text-white">
                  <Building2 className="h-5 w-5" />
                </span>

                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-100/65">
                    Signed in as
                  </div>
                  <div className="mt-1 truncate text-sm font-bold text-white">
                    {email ||
                      "Vendor account"}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex min-w-0 flex-col p-4 sm:p-6 md:p-8 lg:p-9">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#F15E4A]">
                  Vendor Dashboard
                </div>

                <h2 className="mt-1.5 text-[26px] font-extrabold tracking-tight text-[#182451] md:text-[32px]">
                  {heading}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {storeCount >
                  0
                    ? `${storeCount} store${storeCount === 1 ? "" : "s"} available to this account.`
                    : "Stores linked to your account will appear here."}
                </p>
              </div>

              {!loading ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void loadStores()
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              ) : null}
            </div>

            {error ? (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700"
              >
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-36 w-full rounded-2xl" />
                <Skeleton className="h-36 w-full rounded-2xl" />
                <Skeleton className="h-36 w-full rounded-2xl" />
                <Skeleton className="h-36 w-full rounded-2xl" />
              </div>
            ) : stores.length ===
              0 ? (
              <div className="mt-6">
                <EmptyState
                  icon={
                    StoreIcon
                  }
                  title="No stores found"
                  description="This account does not currently have a store assigned."
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void loadStores()
                      }
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try again
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {stores.map(
                  (
                    store,
                    index
                  ) => {
                    const selecting =
                      selectingId ===
                      store.blog_id;

                    const disabled =
                      selectingId !==
                      null &&
                      !selecting;

                    return (
                      <article
                        key={
                          store.blog_id
                        }
                        className={[
                          "group overflow-hidden rounded-2xl border bg-white transition",
                          selecting
                            ? "border-[#F15E4A] shadow-[0_12px_28px_rgba(241,94,74,0.12)]"
                            : "border-[#DDE3EE] shadow-[0_7px_20px_rgba(38,51,95,0.05)] hover:border-[#AEB9D7] hover:shadow-[0_12px_28px_rgba(38,51,95,0.08)]",
                          disabled
                            ? "opacity-55"
                            : "",
                        ].join(
                          " "
                        )}
                      >
                        <div
                          className={[
                            "h-1.5",
                            index %
                              3 ===
                            0
                              ? "bg-[#F15E4A]"
                              : index %
                                  3 ===
                                  1
                                ? "bg-[#20B486]"
                                : "bg-[#4059A7]",
                          ].join(
                            " "
                          )}
                        />

                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#EEF1FA] text-sm font-extrabold text-[#26366E]">
                              {initials(
                                store.store_name ||
                                  displayDomain(
                                    store.store_url
                                  )
                              )}
                            </span>

                            <div className="min-w-0 flex-1">
                              <h3 className="line-clamp-2 text-[15px] font-extrabold leading-5 text-[#182451]">
                                {store.store_name ||
                                  `Store ${store.blog_id}`}
                              </h3>

                              <p className="mt-1 truncate text-xs text-slate-500">
                                {displayDomain(
                                  store.store_url
                                )}
                              </p>
                            </div>

                            {selecting ? (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#20B486]" />
                            ) : null}
                          </div>

                          <AsyncButton
                            type="button"
                            size="sm"
                            loading={
                              selecting
                            }
                            loadingLabel="Opening…"
                            disabled={
                              disabled
                            }
                            onClick={() =>
                              void chooseStore(
                                store
                              )
                            }
                            className="mt-4 w-full justify-between bg-[#182451] text-white hover:bg-[#26366E]"
                          >
                            Open dashboard
                            <ArrowRight className="h-4 w-4" />
                          </AsyncButton>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}

            <div className="mt-auto pt-6 text-center text-[11px] font-semibold text-slate-400 lg:text-left">
              Secure LetzShopy vendor access
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
