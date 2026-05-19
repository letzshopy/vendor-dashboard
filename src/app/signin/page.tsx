"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  ArrowLeft,
  ShieldCheck,
  Store,
  LayoutDashboard,
} from "lucide-react";

const BRAND_LOGO_URL =
  process.env.NEXT_PUBLIC_BRAND_LOGO_URL ||
  "https://letzshopy.in/wp-content/uploads/2025/12/Letzshopy_Logo_TBG.png";

export default function SigninPage() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const error = searchParams.get("error") || "";
  const reset = searchParams.get("reset") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const decodedError = useMemo(() => {
    try {
      return decodeURIComponent(error);
    } catch {
      return error;
    }
  }, [error]);

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotError("");
    setForgotDone(false);

    if (!forgotEmail.trim()) {
      setForgotError("Please enter your registered email address.");
      return;
    }

    try {
      setForgotLoading(true);

      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      setForgotDone(true);
    } catch {
      setForgotDone(true);
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef2ff_0%,#f8fafc_45%,#f8fafc_100%)] px-4 py-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.08)] lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left branding panel */}
          <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#24346b] via-[#31418a] to-[#7c3aed] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-16 right-0 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="inline-flex rounded-3xl bg-white/95 px-5 py-4 shadow-xl shadow-black/15">
                <div className="flex flex-col">
                  <img
                    src={BRAND_LOGO_URL}
                    alt="LetzShopy"
                    className="h-16 w-auto object-contain"
                  />
                  
                </div>
              </div>

              <div className="mt-10 max-w-lg">
                <h1 className="text-4xl font-semibold leading-tight">
                  Manage your store with a clean, modern vendor dashboard.
                </h1>
                <p className="mt-5 text-[15px] leading-7 text-indigo-100/90">
                  Orders, products, customers, billing, support, and store
                  settings in one place—built for independent online sellers.
                </p>
              </div>

              <div className="mt-8 grid gap-3">
                <FeatureItem
                  icon={<LayoutDashboard className="h-4 w-4" />}
                  title="Everything in one dashboard"
                  text="Catalog, sales, support, reports, and store settings without switching tools."
                />
                <FeatureItem
                  icon={<Store className="h-4 w-4" />}
                  title="Built for growing sellers"
                  text="Designed for independent brands, resellers, and vendors managing daily operations."
                />
              </div>
            </div>

            <div className="relative z-10 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-indigo-100/85">
                <ShieldCheck className="h-4 w-4" />
                Secure access
              </div>
              <div className="mt-3 text-sm leading-6 text-white/90">
                Your dashboard access is protected with session-based sign-in
                and account-level security controls.
              </div>
            </div>
          </div>

          {/* Right form panel */}
          <div className="flex items-center justify-center p-5 sm:p-8 lg:p-10">
            <div className="w-full max-w-md">
              <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
                <div className="mb-5 lg:hidden">
                  <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-col items-center">
                      <img
                        src={BRAND_LOGO_URL}
                        alt="LetzShopy"
                        className="h-12 w-auto object-contain"
                      />
                      
                    </div>
                  </div>
                </div>

                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Sign in to LetzShopy Vendor
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Enter your registered email and password to access your vendor
                  dashboard.
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                {!showForgot ? (
                  <form
                    className="space-y-4"
                    method="POST"
                    action="/api/auth/login"
                  >
                    <input type="hidden" name="next" value={nextPath} />

                    <div className="space-y-1.5">
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Email address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="you@letzshopy.in"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="password"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Password
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            setShowForgot(true);
                            setForgotDone(false);
                            setForgotError("");
                          }}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Forgot password?
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          required
                          className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-700"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    {decodedError && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {decodedError}
                      </div>
                    )}

                    {reset === "success" && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        Password reset successful. Please sign in with your new
                        password.
                      </div>
                    )}

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#7c3aed] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:from-[#5b21b6] hover:to-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30"
                    >
                      Sign in
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgot(false);
                        setForgotError("");
                        setForgotDone(false);
                      }}
                      className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                    >
                      <ArrowLeft size={16} />
                      Back to sign in
                    </button>

                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        Reset your password
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Enter your registered email address. If it exists,
                        we&apos;ll send a password reset link.
                      </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleForgotPassword}>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="forgot-email"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Registered email
                        </label>

                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="forgot-email"
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-10 py-3.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="you@letzshopy.in"
                          />
                        </div>
                      </div>

                      {forgotError && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {forgotError}
                        </div>
                      )}

                      {forgotDone && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          Password reset email sent to registered email id.
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#7c3aed] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:from-[#5b21b6] hover:to-[#6d28d9] disabled:opacity-60"
                      >
                        {forgotLoading ? "Sending..." : "Send reset link"}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              <p className="mt-5 text-center text-xs leading-5 text-slate-400 lg:text-left">
                By continuing, you access your secure vendor dashboard for store
                management and billing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/12 text-white">
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm leading-6 text-indigo-100/85">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}