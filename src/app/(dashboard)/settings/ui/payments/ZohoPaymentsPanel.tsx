"use client";

import {
  CheckCircle2,
  Copy,
  Loader2,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

type ReportingStatus = {
  connected: boolean;
  callbackUrl: string;
};

export default function ZohoPaymentsPanel() {
  const [
    reporting,
    setReporting,
  ] = useState<ReportingStatus>({
    connected: false,
    callbackUrl: "",
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    connecting,
    setConnecting,
  ] = useState(false);

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const loadStatus =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/payments/zoho/reporting",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const payload =
          (await response
            .json()
            .catch(() => null)) as
            | {
                ok?: boolean;
                connected?: boolean;
                callbackUrl?: string;
                error?: string;
              }
            | null;

        if (
          !response.ok ||
          !payload ||
          payload.ok !== true
        ) {
          throw new Error(
            payload?.error ||
              "Settlement reporting status is unavailable."
          );
        }

        setReporting({
          connected:
            payload.connected === true,
          callbackUrl:
            String(
              payload.callbackUrl ||
                ""
            ),
        });
      } catch (statusError) {
        setError(
          statusError instanceof Error
            ? statusError.message
            : "Settlement reporting status is unavailable."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function copyCallback() {
    if (
      !reporting.callbackUrl
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        reporting.callbackUrl
      );
      setCopied(true);
      window.setTimeout(
        () => setCopied(false),
        1600
      );
    } catch {
      setCopied(false);
    }
  }

  async function connectReporting() {
    setConnecting(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/payments/zoho/reporting",
          {
            method: "POST",
            cache: "no-store",
          }
        );

      const payload =
        (await response
          .json()
          .catch(() => null)) as
          | {
              ok?: boolean;
              authorizationUrl?: string;
              error?: string;
            }
          | null;

      if (
        !response.ok ||
        !payload ||
        payload.ok !== true ||
        !payload.authorizationUrl
      ) {
        throw new Error(
          payload?.error ||
            "Unable to start Zoho settlement authorization."
        );
      }

      window.location.assign(
        payload.authorizationUrl
      );
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Unable to start Zoho settlement authorization."
      );
      setConnecting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-2xl bg-surface-soft px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
          <ShieldCheck className="h-4 w-4" />
        </span>

        <div className="min-w-0">
          <div className="text-sm font-bold text-heading">
            Zoho Payments online payments
          </div>

          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Secure checkout with automatic WooCommerce payment confirmation.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border px-4 py-3">
        <WalletCards className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-heading">
            Settlement tracking
          </div>

          {loading ? (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking authorization…
            </div>
          ) : reporting.connected ? (
            <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected for payment and payout reporting.
            </div>
          ) : (
            <>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                A one-time read-only Zoho authorization is required to show payout status, payout date and settlement bank reference.
              </p>

              {reporting.callbackUrl ? (
                <div className="mt-2 rounded-xl bg-surface-soft px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Add this Redirect URI in Zoho API Console
                  </div>

                  <div className="mt-1 flex items-start gap-2">
                    <code className="min-w-0 flex-1 break-all text-[10px] leading-4 text-foreground">
                      {reporting.callbackUrl}
                    </code>

                    <button
                      type="button"
                      onClick={
                        copyCallback
                      }
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                      aria-label="Copy Zoho reporting redirect URI"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {copied ? (
                    <div className="mt-1 text-[10px] font-semibold text-emerald-700">
                      Copied
                    </div>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  void connectReporting()
                }
                disabled={
                  connecting ||
                  !reporting.callbackUrl
                }
                className="mt-2 inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-60"
              >
                {connecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Enable settlement tracking
              </button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          {error}
        </div>
      ) : null}

      <p className="text-xs leading-5 text-muted-foreground">
        Gateway credentials and OAuth tokens stay securely in WordPress and Zoho. They are never shown in the vendor dashboard.
      </p>
    </div>
  );
}
