"use client";

import { useSearchParams } from "next/navigation";

const BRAND_LOGO_URL =
  process.env.NEXT_PUBLIC_BRAND_LOGO_URL ||
  "https://letzshopy.in/wp-content/uploads/2025/12/Letzshopy_Logo_TBG.png";

export default function SigninPage() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/orders";
  const error = searchParams.get("error") || "";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-auto mb-3">
            <img
              src={BRAND_LOGO_URL}
              alt="LetzShopy"
              className="h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Sign in to LetzShopy Vendor
          </h1>
          <p className="mt-1 text-sm text-slate-500 text-center">
            Enter your email and password to access your vendor dashboard.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <form className="space-y-4" method="POST" action="/api/auth/login">
            <input type="hidden" name="next" value={nextPath} />

            <div className="space-y-1">
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
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="you@letzshopy.in"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {decodeURIComponent(error)}
              </p>
            )}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-lg bg-[#7c3aed] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7c3aed]"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}