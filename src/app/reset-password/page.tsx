"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const BRAND_LOGO_URL =
  process.env.NEXT_PUBLIC_BRAND_LOGO_URL ||
  "https://letzshopy.in/wp-content/uploads/2025/12/Letzshopy_Logo_TBG.png";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 256;
const MAX_EMAIL_LENGTH = 254;
const MIN_TOKEN_LENGTH = 8;
const MAX_TOKEN_LENGTH = 2_048;
const REDIRECT_DELAY_MS = 1_400;

type ResetCredentials = {
  email: string;
  token: string;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readErrorMessage(value: unknown): string {
  if (
    isRecord(value) &&
    typeof value.error === "string" &&
    value.error.trim()
  ) {
    return value.error;
  }

  return "Could not reset password.";
}

function normalizeInitialCredentials(
  emailValue: string | null,
  tokenValue: string | null
): ResetCredentials {
  return {
    email: (emailValue || "").trim().toLowerCase(),
    token: (tokenValue || "").trim(),
  };
}

function hasValidCredentials(credentials: ResetCredentials): boolean {
  const { email, token } = credentials;

  return (
    email.length > 0 &&
    email.length <= MAX_EMAIL_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    token.length >= MIN_TOKEN_LENGTH &&
    token.length <= MAX_TOKEN_LENGTH &&
    !/[\u0000-\u001f\u007f]/.test(token)
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [credentials] = useState<ResetCredentials>(() =>
    normalizeInitialCredentials(
      searchParams.get("email"),
      searchParams.get("token")
    )
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const invalidLink = useMemo(
    () => !hasValidCredentials(credentials),
    [credentials]
  );

  useEffect(() => {
    /*
     * Preserve the credentials in component state, then remove them from the
     * visible address bar so they are less likely to be copied, bookmarked,
     * or retained in browser history.
     */
    if (
      searchParams.has("email") ||
      searchParams.has("token")
    ) {
      router.replace(pathname, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!done) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      router.replace("/signin?reset=success");
    }, REDIRECT_DELAY_MS);

    return () => {
      window.clearTimeout(redirectTimer);
    };
  }, [done, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (invalidLink) {
      setError("Invalid or expired reset link.");
      return;
    }

    if (
      newPassword.length < MIN_PASSWORD_LENGTH ||
      newPassword.length > MAX_PASSWORD_LENGTH
    ) {
      setError(
        `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`
      );
      return;
    }

    if (/[\u0000-\u001f\u007f]/.test(newPassword)) {
      setError("Password contains an unsupported control character.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          email: credentials.email,
          token: credentials.token,
          new_password: newPassword,
        }),
      });

      const payload: unknown = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(readErrorMessage(payload));
      }

      setNewPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not reset password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef2ff_0%,#f8fafc_45%,#f8fafc_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <div className="mb-8 text-center">
            <img
              src={BRAND_LOGO_URL}
              alt="LetzShopy"
              className="mx-auto h-12 w-auto object-contain"
            />

            <h1 className="mt-5 text-2xl font-semibold text-slate-900">
              Reset your password
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Create a new password for your LetzShopy vendor
              account.
            </p>
          </div>

          {invalidLink ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              Invalid or expired reset link.
            </div>
          ) : done ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              Password reset successful. Redirecting to sign in...
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-slate-700"
                >
                  New password
                </label>

                <div className="relative">
                  <input
                    id="new-password"
                    name="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(event.target.value)
                    }
                    minLength={MIN_PASSWORD_LENGTH}
                    maxLength={MAX_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    aria-describedby="password-requirements"
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Enter a new password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword((previous) => !previous)
                    }
                    disabled={loading}
                    aria-label={
                      showNewPassword
                        ? "Hide new password"
                        : "Show new password"
                    }
                    aria-pressed={showNewPassword}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {showNewPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>

                <p
                  id="password-requirements"
                  className="text-xs text-slate-500"
                >
                  Use between 8 and 256 characters.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Confirm new password
                </label>

                <div className="relative">
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type={
                      showConfirmPassword ? "text" : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    minLength={MIN_PASSWORD_LENGTH}
                    maxLength={MAX_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Confirm the new password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) => !previous
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmed password"
                        : "Show confirmed password"
                    }
                    aria-pressed={showConfirmPassword}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  done ||
                  !newPassword ||
                  !confirmPassword
                }
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#7c3aed] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:from-[#5b21b6] hover:to-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Saving..." : "Reset password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}