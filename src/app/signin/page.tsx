"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useSearchParams,
} from "next/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  PackageCheck,
  ShieldCheck,
  Store,
} from "lucide-react";

import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Button,
} from "@/components/ui/button";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

const BRAND_LOGO_URL =
  process.env
    .NEXT_PUBLIC_BRAND_LOGO_URL ||
  "https://letzshopy.in/wp-content/uploads/2025/12/Letzshopy_Logo_TBG.png";

function FeatureItem({
  icon,
  title,
  text,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone:
    | "coral"
    | "green"
    | "indigo";
}) {
  const toneClass =
    tone === "coral"
      ? "bg-[#F15E4A]"
      : tone === "green"
        ? "bg-[#20B486]"
        : "bg-[#4059A7]";

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-[#26366E] p-4">
      <span
        className={[
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white",
          toneClass,
        ].join(" ")}
      >
        {icon}
      </span>

      <div className="min-w-0">
        <div className="text-sm font-extrabold text-white">
          {title}
        </div>
        <div className="mt-1 text-xs leading-5 text-indigo-100/70">
          {text}
        </div>
      </div>
    </div>
  );
}

export default function SigninPage() {
  const searchParams =
    useSearchParams();

  const nextPath =
    searchParams.get("next") ||
    "/dashboard";
  const error =
    searchParams.get("error") ||
    "";
  const reset =
    searchParams.get("reset") ||
    "";

  const [
    email,
    setEmail,
  ] =
    useState("");
  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);
  const [
    signingIn,
    setSigningIn,
  ] =
    useState(false);

  const [
    showForgot,
    setShowForgot,
  ] =
    useState(false);
  const [
    forgotEmail,
    setForgotEmail,
  ] =
    useState("");
  const [
    forgotLoading,
    setForgotLoading,
  ] =
    useState(false);
  const [
    forgotDone,
    setForgotDone,
  ] =
    useState(false);
  const [
    forgotError,
    setForgotError,
  ] =
    useState("");

  const decodedError =
    useMemo(() => {
      try {
        return decodeURIComponent(
          error
        );
      } catch {
        return error;
      }
    }, [error]);

  function openForgot() {
    setForgotEmail(
      email
    );
    setForgotDone(false);
    setForgotError("");
    setShowForgot(true);
  }

  async function handleForgotPassword(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setForgotError("");
    setForgotDone(false);

    const normalizedEmail =
      forgotEmail.trim();

    if (!normalizedEmail) {
      const message =
        "Please enter your registered email address.";

      setForgotError(
        message
      );

      actionFeedback.warning({
        id: "signin-forgot-email",
        title:
          "Email required",
        message,
        durationMs: 3000,
      });
      return;
    }

    const feedbackId =
      "signin-forgot-password";

    try {
      setForgotLoading(true);

      actionFeedback.loading({
        id: feedbackId,
        title:
          "Sending reset link…",
        message:
          normalizedEmail,
      });

      await fetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              email:
                normalizedEmail,
            }),
        }
      );

      setForgotDone(true);

      actionFeedback.success({
        id: feedbackId,
        title:
          "Reset request submitted",
        message:
          "Check your inbox and spam folder.",
        durationMs: 3200,
      });
    } catch {
      setForgotDone(true);

      actionFeedback.success({
        id: feedbackId,
        title:
          "Reset request submitted",
        message:
          "Check your inbox and spam folder.",
        durationMs: 3200,
      });
    } finally {
      setForgotLoading(
        false
      );
    }
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#EEF1F8] text-[#182451]">
      <section className="bg-[#182451] px-4 pb-14 pt-[calc(var(--ls-safe-area-top)+1rem)] md:hidden">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_10px_28px_rgba(7,14,42,0.28)]">
            <img
              src={
                BRAND_LOGO_URL
              }
              alt="LetzShopy"
              className="h-10 w-auto object-contain"
            />
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#26366E] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-indigo-100">
            <span className="h-2 w-2 rounded-full bg-[#20B486]" />
            Vendor Dashboard
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1220px] items-center justify-center md:min-h-[calc(100dvh-var(--ls-safe-area-top))] md:px-6 md:py-8 lg:px-8">
        <div className="grid w-full overflow-hidden bg-white md:min-h-[690px] md:rounded-[30px] md:border md:border-[#DDE3EE] md:shadow-[0_26px_80px_rgba(24,36,81,0.14)] lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="relative hidden overflow-hidden bg-[#182451] p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-10">
            <div>
              <div className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-[0_10px_26px_rgba(6,13,40,0.28)]">
                <img
                  src={
                    BRAND_LOGO_URL
                  }
                  alt="LetzShopy"
                  className="h-12 w-auto object-contain xl:h-14"
                />
              </div>

              <div className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#26366E] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-indigo-100">
                <span className="h-2 w-2 rounded-full bg-[#20B486]" />
                Store Operations
              </div>

              <h1 className="mt-4 max-w-lg text-[34px] font-extrabold leading-[1.12] tracking-tight xl:text-[40px]">
                Run your online store from one place.
              </h1>

              <p className="mt-4 max-w-lg text-sm leading-6 text-indigo-100/75">
                Manage products, orders, customers, payments, shipping and reports from your LetzShopy business dashboard.
              </p>

              <div className="mt-7 grid gap-3">
                <FeatureItem
                  icon={
                    <LayoutDashboard className="h-5 w-5" />
                  }
                  title="One business workspace"
                  text="Daily store operations without switching between multiple tools."
                  tone="coral"
                />

                <FeatureItem
                  icon={
                    <PackageCheck className="h-5 w-5" />
                  }
                  title="Built for daily operations"
                  text="From order processing to stock and shipping, keep the next action clear."
                  tone="green"
                />

                <FeatureItem
                  icon={
                    <Store className="h-5 w-5" />
                  }
                  title="Your store. Your control."
                  text="Operate your own ecommerce website with LetzShopy technology behind it."
                  tone="indigo"
                />
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3 rounded-2xl bg-[#26366E] p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20B486] text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>

              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-indigo-100/70">
                  Secure access
                </div>
                <div className="mt-1 text-sm font-bold text-white">
                  Protected vendor sign-in
                </div>
              </div>
            </div>
          </aside>

          <section className="-mt-8 flex min-h-[calc(100dvh-8.25rem-var(--ls-safe-area-top))] items-start justify-center rounded-t-[30px] bg-white px-4 pb-[calc(var(--ls-safe-area-bottom)+1.5rem)] pt-6 md:mt-0 md:min-h-0 md:items-center md:rounded-none md:px-8 md:py-10 lg:px-12 xl:px-16">
            <div className="w-full max-w-[440px]">
              <div className="hidden md:block lg:hidden">
                <div className="inline-flex rounded-2xl border border-[#DDE3EE] bg-white px-4 py-3 shadow-sm">
                  <img
                    src={
                      BRAND_LOGO_URL
                    }
                    alt="LetzShopy"
                    className="h-10 w-auto object-contain"
                  />
                </div>
              </div>

              {!showForgot ? (
                <>
                  <div className="text-center md:text-left">
                    <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#D8DEEA] md:hidden" />

                    <div className="inline-flex items-center gap-2 rounded-full bg-[#FDE9E5] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.07em] text-[#D84F3E]">
                      <LockKeyhole className="h-3.5 w-3.5" />
                      Secure Sign In
                    </div>

                    <h2 className="mt-3 text-[26px] font-extrabold tracking-tight text-[#182451] md:text-[32px]">
                      Welcome back
                    </h2>

                    <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-slate-500 md:mx-0">
                      Sign in to manage your LetzShopy store.
                    </p>
                  </div>

                  <form
                    className="mt-6 space-y-4"
                    method="POST"
                    action="/api/auth/login"
                    onSubmit={() =>
                      setSigningIn(
                        true
                      )
                    }
                  >
                    <input
                      type="hidden"
                      name="next"
                      value={
                        nextPath
                      }
                    />

                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                        Email address
                      </span>

                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={
                            email
                          }
                          onChange={(
                            event
                          ) =>
                            setEmail(
                              event
                                .currentTarget
                                .value
                            )
                          }
                          disabled={
                            signingIn
                          }
                          className="ls-focus-ring h-12 w-full rounded-xl border border-[#CBD3E3] bg-[#F8FAFD] pl-10 pr-3 text-sm font-semibold text-[#182451] placeholder:text-slate-400 focus:border-[#5366B7] focus:bg-white disabled:opacity-60"
                          placeholder="you@example.com"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                          Password
                        </span>

                        <button
                          type="button"
                          onClick={
                            openForgot
                          }
                          disabled={
                            signingIn
                          }
                          className="ls-focus-ring rounded-lg px-1 py-1 text-xs font-extrabold text-[#4059A7] hover:text-[#26366E]"
                        >
                          Forgot password?
                        </button>
                      </span>

                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          id="password"
                          name="password"
                          type={
                            showPassword
                              ? "text"
                              : "password"
                          }
                          autoComplete="current-password"
                          required
                          disabled={
                            signingIn
                          }
                          className="ls-focus-ring h-12 w-full rounded-xl border border-[#CBD3E3] bg-[#F8FAFD] pl-10 pr-12 text-sm font-semibold text-[#182451] placeholder:text-slate-400 focus:border-[#5366B7] focus:bg-white disabled:opacity-60"
                          placeholder="Enter password"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword(
                              (
                                previous
                              ) =>
                                !previous
                            )
                          }
                          disabled={
                            signingIn
                          }
                          className="ls-focus-ring absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-xl text-slate-500 hover:text-[#26366E]"
                          aria-label={
                            showPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-[18px] w-[18px]" />
                          ) : (
                            <Eye className="h-[18px] w-[18px]" />
                          )}
                        </button>
                      </div>
                    </label>

                    {decodedError ? (
                      <div
                        role="alert"
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700"
                      >
                        {
                          decodedError
                        }
                      </div>
                    ) : null}

                    {reset ===
                    "success" ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
                        Password reset successful. Sign in with your new password.
                      </div>
                    ) : null}

                    <AsyncButton
                      type="submit"
                      size="lg"
                      loading={
                        signingIn
                      }
                      loadingLabel="Signing in…"
                      className="mt-1 w-full bg-[#F15E4A] text-white shadow-[0_8px_20px_rgba(241,94,74,0.22)] hover:bg-[#D84F3E]"
                    >
                      Sign in
                    </AsyncButton>
                  </form>

                  <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#F4F6FB] px-3 py-2.5 text-[11px] font-semibold text-slate-500 md:justify-start">
                    <ShieldCheck className="h-4 w-4 text-[#20B486]" />
                    Secure access to your vendor dashboard
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#D8DEEA] md:hidden" />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowForgot(
                        false
                      );
                      setForgotError(
                        ""
                      );
                      setForgotDone(
                        false
                      );
                    }}
                    disabled={
                      forgotLoading
                    }
                    className="-ml-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </Button>

                  <div className="mt-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF1FA] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.07em] text-[#4059A7]">
                      <Mail className="h-3.5 w-3.5" />
                      Password Reset
                    </div>

                    <h2 className="mt-3 text-[26px] font-extrabold tracking-tight text-[#182451] md:text-[30px]">
                      Reset your password
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Enter your registered email address. If the account is eligible, we&apos;ll send a password reset link.
                    </p>
                  </div>

                  <form
                    className="mt-6 space-y-4"
                    onSubmit={
                      handleForgotPassword
                    }
                  >
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                        Registered email
                      </span>

                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          id="forgot-email"
                          type="email"
                          value={
                            forgotEmail
                          }
                          onChange={(
                            event
                          ) =>
                            setForgotEmail(
                              event
                                .currentTarget
                                .value
                            )
                          }
                          disabled={
                            forgotLoading
                          }
                          className="ls-focus-ring h-12 w-full rounded-xl border border-[#CBD3E3] bg-[#F8FAFD] pl-10 pr-3 text-sm font-semibold text-[#182451] placeholder:text-slate-400 focus:border-[#5366B7] focus:bg-white disabled:opacity-60"
                          placeholder="you@example.com"
                        />
                      </div>
                    </label>

                    {forgotError ? (
                      <div
                        role="alert"
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700"
                      >
                        {
                          forgotError
                        }
                      </div>
                    ) : null}

                    {forgotDone ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm leading-6 text-emerald-700">
                        If an eligible LetzShopy account exists for this email, a reset link will be sent. Check your inbox and spam folder.
                      </div>
                    ) : null}

                    <AsyncButton
                      type="submit"
                      size="lg"
                      loading={
                        forgotLoading
                      }
                      loadingLabel="Sending…"
                      className="w-full bg-[#4059A7] text-white hover:bg-[#314784]"
                    >
                      Send reset link
                    </AsyncButton>
                  </form>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
