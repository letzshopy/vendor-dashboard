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
  LockKeyhole,
  Mail,
  ShieldCheck,
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

    const normalizedEmail =
      forgotEmail.trim();

    setForgotError("");
    setForgotDone(false);

    if (!normalizedEmail) {
      const message =
        "Enter your registered email address.";

      setForgotError(
        message
      );

      actionFeedback.warning({
        id: "signin-forgot-email",
        title: "Email required",
        message,
        durationMs: 3000,
      });
      return;
    }

    const feedbackId =
      "signin-forgot-password";

    setForgotLoading(
      true
    );

    actionFeedback.loading({
      id: feedbackId,
      title: "Sending reset link…",
      message: normalizedEmail,
    });

    try {
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
        title: "Reset request submitted",
        message:
          "Check your inbox and spam folder.",
        durationMs: 3200,
      });
    } catch {
      setForgotDone(true);

      actionFeedback.success({
        id: feedbackId,
        title: "Reset request submitted",
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
    <main className="min-h-dvh bg-[#F3F5FA] text-[#182451]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1180px] items-stretch md:px-6 md:py-8 lg:px-8">
        <div className="grid w-full overflow-hidden bg-white md:rounded-[28px] md:border md:border-[#DEE4EF] md:shadow-[0_24px_70px_rgba(24,36,81,0.12)] lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="relative hidden bg-[#182451] p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-10">
            <div>
              <div className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-[0_8px_24px_rgba(6,13,40,0.24)]">
                <img
                  src={BRAND_LOGO_URL}
                  alt="LetzShopy"
                  className="h-12 w-auto object-contain"
                />
              </div>

              <div className="mt-10 h-1 w-12 rounded-full bg-[#F15E4A]" />

              <h1 className="mt-5 max-w-md text-[34px] font-extrabold leading-[1.12] tracking-tight">
                Your store.
                <br />
                One dashboard.
              </h1>

              <p className="mt-4 max-w-sm text-sm leading-6 text-indigo-100/72">
                Manage your LetzShopy business securely from one place.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-100/72">
              <ShieldCheck className="h-4 w-4 text-[#20B486]" />
              Secure vendor access
            </div>
          </aside>

          <section className="relative flex min-h-dvh items-center justify-center px-4 pb-[calc(var(--ls-safe-area-bottom)+1.5rem)] pt-[calc(var(--ls-safe-area-top)+1rem)] md:min-h-0 md:px-8 md:py-10 lg:px-14 xl:px-20">
            <div className="w-full max-w-[420px]">
              <div className="mb-8 flex justify-center lg:hidden">
                <div className="rounded-2xl border border-[#DDE3EE] bg-white px-4 py-3 shadow-sm">
                  <img
                    src={BRAND_LOGO_URL}
                    alt="LetzShopy"
                    className="h-11 w-auto object-contain"
                  />
                </div>
              </div>

              {!showForgot ? (
                <>
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F15E4A]">
                      Vendor Dashboard
                    </div>

                    <h2 className="mt-2 text-[30px] font-extrabold tracking-tight text-[#182451] md:text-[34px]">
                      Sign in
                    </h2>

                    <p className="mt-1.5 text-sm leading-6 text-slate-500">
                      Continue to your LetzShopy dashboard.
                    </p>
                  </div>

                  <form
                    className="mt-7 space-y-4"
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
                      value={nextPath}
                    />

                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                        Email
                      </span>

                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(event) =>
                            setEmail(
                              event.currentTarget
                                .value
                            )
                          }
                          disabled={signingIn}
                          className="ls-focus-ring h-12 w-full rounded-xl border border-[#CBD3E3] bg-white pl-10 pr-3 text-sm font-semibold text-[#182451] placeholder:text-slate-400 focus:border-[#5366B7] focus:ring-2 focus:ring-[#5366B7]/10 disabled:opacity-60"
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
                          onClick={openForgot}
                          disabled={signingIn}
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
                          disabled={signingIn}
                          className="ls-focus-ring h-12 w-full rounded-xl border border-[#CBD3E3] bg-white pl-10 pr-12 text-sm font-semibold text-[#182451] placeholder:text-slate-400 focus:border-[#5366B7] focus:ring-2 focus:ring-[#5366B7]/10 disabled:opacity-60"
                          placeholder="Enter password"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword(
                              (previous) =>
                                !previous
                            )
                          }
                          disabled={signingIn}
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
                        {decodedError}
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
                      loading={signingIn}
                      loadingLabel="Signing in…"
                      className="mt-1 w-full bg-[#182451] text-white shadow-[0_8px_18px_rgba(24,36,81,0.16)] hover:bg-[#26366E]"
                    >
                      Sign in
                    </AsyncButton>
                  </form>

                  <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-400 md:justify-start">
                    <ShieldCheck className="h-4 w-4 text-[#20B486]" />
                    Secure vendor access
                  </div>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowForgot(false);
                      setForgotError("");
                      setForgotDone(false);
                    }}
                    disabled={forgotLoading}
                    className="-ml-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>

                  <div className="mt-5">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#4059A7]">
                      Password reset
                    </div>

                    <h2 className="mt-2 text-[28px] font-extrabold tracking-tight text-[#182451] md:text-[32px]">
                      Reset password
                    </h2>

                    <p className="mt-1.5 text-sm leading-6 text-slate-500">
                      Enter your registered email address.
                    </p>
                  </div>

                  <form
                    className="mt-7 space-y-4"
                    onSubmit={handleForgotPassword}
                  >
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                        Email
                      </span>

                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          id="forgot-email"
                          type="email"
                          value={forgotEmail}
                          onChange={(event) =>
                            setForgotEmail(
                              event.currentTarget
                                .value
                            )
                          }
                          disabled={forgotLoading}
                          className="ls-focus-ring h-12 w-full rounded-xl border border-[#CBD3E3] bg-white pl-10 pr-3 text-sm font-semibold text-[#182451] placeholder:text-slate-400 focus:border-[#5366B7] focus:ring-2 focus:ring-[#5366B7]/10 disabled:opacity-60"
                          placeholder="you@example.com"
                        />
                      </div>
                    </label>

                    {forgotError ? (
                      <div
                        role="alert"
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700"
                      >
                        {forgotError}
                      </div>
                    ) : null}

                    {forgotDone ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm leading-6 text-emerald-700">
                        If an eligible account exists, a reset link will be sent. Check your inbox and spam folder.
                      </div>
                    ) : null}

                    <AsyncButton
                      type="submit"
                      size="lg"
                      loading={forgotLoading}
                      loadingLabel="Sending…"
                      className="w-full bg-[#182451] text-white hover:bg-[#26366E]"
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
