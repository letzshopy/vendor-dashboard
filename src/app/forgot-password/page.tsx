"use client";

import Link from "next/link";
import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import {
  useSearchParams,
} from "next/navigation";
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

const BRAND_LOGO_URL =
  process.env
    .NEXT_PUBLIC_BRAND_LOGO_URL ||
  "https://letzshopy.in/wp-content/uploads/2025/12/Letzshopy_Logo_TBG.png";

const MAX_EMAIL_LENGTH =
  254;

function validEmail(
  value: string
): boolean {
  return (
    value.length > 0 &&
    value.length <=
      MAX_EMAIL_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value
    )
  );
}

export default function ForgotPasswordPage() {
  const searchParams =
    useSearchParams();

  const initialEmail =
    useMemo(
      () =>
        (
          searchParams.get(
            "email"
          ) || ""
        )
          .trim()
          .toLowerCase(),
      [searchParams]
    );

  const [
    email,
    setEmail,
  ] =
    useState(
      initialEmail
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    submitted,
    setSubmitted,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    setError("");
    setSubmitted(false);

    if (
      !validEmail(
        normalizedEmail
      )
    ) {
      const message =
        "Enter a valid registered email address.";

      setError(message);

      actionFeedback.warning({
        id:
          "forgot-password-email",
        title:
          "Valid email required",
        message,
        durationMs: 3000,
      });

      return;
    }

    const feedbackId =
      "forgot-password-request";

    setLoading(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Sending reset link…",
      message:
        normalizedEmail,
    });

    try {
      await fetch(
        "/api/auth/forgot-password",
        {
          method:
            "POST",
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

      setSubmitted(true);

      actionFeedback.success({
        id: feedbackId,
        title:
          "Reset request submitted",
        message:
          "Check your inbox and spam folder.",
        durationMs: 3200,
      });
    } catch {
      /*
       * Keep the public response generic so the UI never reveals whether
       * a vendor account exists for this address.
       */
      setSubmitted(true);

      actionFeedback.success({
        id: feedbackId,
        title:
          "Reset request submitted",
        message:
          "Check your inbox and spam folder.",
        durationMs: 3200,
      });
    } finally {
      setLoading(false);
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
                  src={
                    BRAND_LOGO_URL
                  }
                  alt="LetzShopy"
                  className="h-12 w-auto object-contain"
                />
              </div>

              <div className="mt-10 h-1 w-12 rounded-full bg-[#F15E4A]" />

              <h1 className="mt-5 max-w-md text-[34px] font-extrabold leading-[1.12] tracking-tight">
                Recover access.
                <br />
                Get back to work.
              </h1>

              <p className="mt-4 max-w-sm text-sm leading-6 text-indigo-100/70">
                Request a secure reset link for your LetzShopy vendor account.
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
                    src={
                      BRAND_LOGO_URL
                    }
                    alt="LetzShopy"
                    className="h-11 w-auto object-contain"
                  />
                </div>
              </div>

              <Link
                href="/signin"
                className="ls-focus-ring -ml-2 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#4059A7] hover:bg-[#EEF1FA]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>

              <div className="mt-4">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F15E4A]">
                  Password recovery
                </div>

                <h2 className="mt-2 text-[30px] font-extrabold tracking-tight text-[#182451] md:text-[34px]">
                  Forgot password?
                </h2>

                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  Enter your registered email address and we&apos;ll send reset instructions.
                </p>
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
                className="mt-7 space-y-4"
              >
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                    Email
                  </span>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="email"
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
                      autoComplete="email"
                      readOnly={
                        loading
                      }
                      className="ls-focus-ring h-12 w-full rounded-xl border border-[#CBD3E3] bg-white pl-10 pr-3 text-sm font-semibold text-[#182451] placeholder:text-slate-400 focus:border-[#5366B7] focus:ring-2 focus:ring-[#5366B7]/10 read-only:bg-[#F8FAFD] read-only:opacity-80"
                      placeholder="you@example.com"
                    />
                  </div>
                </label>

                {error ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700"
                  >
                    {error}
                  </div>
                ) : null}

                {submitted ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm leading-6 text-emerald-700"
                  >
                    If an eligible LetzShopy account exists for this email, a reset link will be sent. Check your inbox and spam folder.
                  </div>
                ) : null}

                <AsyncButton
                  type="submit"
                  size="lg"
                  loading={
                    loading
                  }
                  loadingLabel="Sending…"
                  className="w-full bg-[#182451] text-white hover:bg-[#26366E]"
                >
                  Send reset link
                </AsyncButton>
              </form>

              <div className="mt-5 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                <ShieldCheck className="h-4 w-4 text-[#20B486]" />
                For security, account existence is never disclosed.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
