"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

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

              <div className="mt-10 h-1 w-12 rounded-full bg-[#18A6C9]" />

              <h1 className="mt-5 max-w-md text-[34px] font-extrabold leading-[1.12] tracking-tight">
                Set a new password.
                <br />
                Continue securely.
              </h1>

              <p className="mt-4 max-w-sm text-sm leading-6 text-indigo-100/70">
                Choose a new password for your LetzShopy vendor account.
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

              <Link
                href="/signin"
                className="ls-focus-ring -ml-2 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#4059A7] hover:bg-[#EEF1FA]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>

              <div className="mt-4">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#18A6C9]">
                  Password reset
                </div>

                <h2 className="mt-2 text-[30px] font-extrabold tracking-tight text-[#182451] md:text-[34px]">
                  Create new password
                </h2>

                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  Use at least 8 characters and confirm the same password below.
                </p>
              </div>

              {invalidLink ? (
                <div className="mt-7 space-y-3">
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700"
                  >
                    Invalid or expired reset link.
                  </div>

                  <Link
                    href="/forgot-password"
                    className="ls-focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#182451] px-4 text-sm font-extrabold text-white hover:bg-[#26366E]"
                  >
                    Request a new reset link
                  </Link>
                </div>
              ) : done ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20B486] text-white">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>

                    <div>
                      <div className="text-sm font-extrabold text-emerald-800">
                        Password updated
                      </div>
                      <p className="mt-1 text-xs leading-5 text-emerald-700">
                        Redirecting you to sign in…
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                      New password
                    </span>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

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
                        className="ls-focus-ring h-12 w-full rounded-xl border border-[#CBD3E3] bg-white pl-10 pr-12 text-sm font-semibold text-[#182451] placeholder:text-slate-400 focus:border-[#5366B7] focus:ring-2 focus:ring-[#5366B7]/10 disabled:bg-[#F8FAFD] disabled:opacity-70"
                        placeholder="Enter new password"
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
                        className="ls-focus-ring absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-xl text-slate-500 hover:text-[#26366E]"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-[18px] w-[18px]" />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" />
                        )}
                      </button>
                    </div>

                    <p
                      id="password-requirements"
                      className="mt-1.5 text-[11px] text-slate-400"
                    >
                      8–256 characters
                    </p>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                      Confirm password
                    </span>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        id="confirm-password"
                        name="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        minLength={MIN_PASSWORD_LENGTH}
                        maxLength={MAX_PASSWORD_LENGTH}
                        autoComplete="new-password"
                        required
                        disabled={loading}
                        className="ls-focus-ring h-12 w-full rounded-xl border border-[#CBD3E3] bg-white pl-10 pr-12 text-sm font-semibold text-[#182451] placeholder:text-slate-400 focus:border-[#5366B7] focus:ring-2 focus:ring-[#5366B7]/10 disabled:bg-[#F8FAFD] disabled:opacity-70"
                        placeholder="Confirm new password"
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
                        className="ls-focus-ring absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-xl text-slate-500 hover:text-[#26366E]"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-[18px] w-[18px]" />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" />
                        )}
                      </button>
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

                  <button
                    type="submit"
                    disabled={
                      loading ||
                      done ||
                      !newPassword ||
                      !confirmPassword
                    }
                    className="ls-focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#182451] px-4 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(24,36,81,0.16)] transition hover:bg-[#26366E] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Saving…" : "Reset password"}
                  </button>
                </form>
              )}

              <div className="mt-5 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                <ShieldCheck className="h-4 w-4 text-[#20B486]" />
                Reset details are removed from the browser address after opening.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}