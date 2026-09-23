"use client";

import {
  BellRing,
  CheckCircle2,
  Loader2,
  ShoppingBag,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type PushConfigResponse = {
  ok?: boolean;
  publicKey?: string;
  error?: string;
};

type PushMessagePayload = {
  type?: string;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  orderId?: number;
  orderNumber?: string;
};

type ServiceWorkerMessage = {
  type?: string;
  payload?: PushMessagePayload;
};

function toApplicationServerKey(
  value: string
): Uint8Array<ArrayBuffer> {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded =
    normalized +
    "=".repeat(
      (4 - (normalized.length % 4)) % 4
    );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function subscriptionPayload(
  subscription: PushSubscription
) {
  const json = subscription.toJSON();

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: json.keys?.p256dh || "",
      auth: json.keys?.auth || "",
    },
  };
}

async function getPushRegistration() {
  await navigator.serviceWorker.register(
    "/sw.js",
    {
      scope: "/",
    }
  );

  return navigator.serviceWorker.ready;
}

async function saveSubscription(
  subscription: PushSubscription
) {
  const response = await fetch(
    "/api/push/subscription",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        subscription:
          subscriptionPayload(subscription),
      }),
    }
  );

  if (!response.ok) {
    const payload: unknown = await response
      .json()
      .catch(() => null);

    const message =
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      typeof (
        payload as Record<string, unknown>
      ).error === "string"
        ? String(
            (
              payload as Record<
                string,
                unknown
              >
            ).error
          )
        : "Unable to enable order notifications.";

    throw new Error(message);
  }
}

export default function OrderPushManager() {
  const [supported, setSupported] =
    useState(false);
  const [configured, setConfigured] =
    useState(false);
  const [enabled, setEnabled] =
    useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] =
    useState(false);
  const [banner, setBanner] =
    useState<PushMessagePayload | null>(null);
  const bannerTimerRef =
    useRef<number | null>(null);

  const clearBannerTimer = useCallback(() => {
    if (bannerTimerRef.current !== null) {
      window.clearTimeout(
        bannerTimerRef.current
      );
      bannerTimerRef.current = null;
    }
  }, []);

  const showBanner = useCallback(
    (payload: PushMessagePayload) => {
      clearBannerTimer();
      setBanner(payload);

      bannerTimerRef.current =
        window.setTimeout(() => {
          setBanner(null);
          bannerTimerRef.current = null;
        }, 9000);
    },
    [clearBannerTimer]
  );

  useEffect(() => {
    return () => clearBannerTimer();
  }, [clearBannerTimer]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasSupport =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    setSupported(hasSupport);

    let cancelled = false;

    async function bootstrap() {
      try {
        const configResponse = await fetch(
          "/api/push/config",
          {
            cache: "no-store",
          }
        );

        const config: PushConfigResponse =
          await configResponse
            .json()
            .catch(() => ({}));

        if (
          cancelled ||
          !configResponse.ok ||
          !config.ok ||
          !config.publicKey
        ) {
          if (!cancelled) {
            setError(
              config.error ||
                "Order push notifications are not configured."
            );
          }
          return;
        }

        setConfigured(true);

        if (!hasSupport) {
          if (!cancelled) {
            setError(
              "This browser cannot receive background order notifications. Open LetzShopy in Chrome and install it as an app."
            );
          }
          return;
        }

        const registration =
          await getPushRegistration();
        const existing =
          await registration.pushManager.getSubscription();

        if (
          Notification.permission ===
            "granted" &&
          existing
        ) {
          await saveSubscription(existing);

          if (!cancelled) {
            setEnabled(true);
          }
        }
      } catch {
        if (!cancelled) {
          setError(
            "Order notification setup could not be checked."
          );
        }
      }
    }

    void bootstrap();

    const onWorkerMessage = (
      event: MessageEvent<ServiceWorkerMessage>
    ) => {
      const message = event.data;

      if (
        message?.type !==
          "LETZ_ORDER_PUSH_RECEIVED" ||
        !message.payload
      ) {
        return;
      }

      showBanner(message.payload);

      window.dispatchEvent(
        new CustomEvent(
          "letzshopy:refresh-notifications"
        )
      );
    };

    navigator.serviceWorker.addEventListener(
      "message",
      onWorkerMessage
    );

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener(
        "message",
        onWorkerMessage
      );
    };
  }, [showBanner]);

  const enableNotifications =
    useCallback(async () => {
      if (
        !supported ||
        !configured ||
        busy
      ) {
        return;
      }

      setBusy(true);
      setError("");

      try {
        const configResponse = await fetch(
          "/api/push/config",
          {
            cache: "no-store",
          }
        );
        const config: PushConfigResponse =
          await configResponse
            .json()
            .catch(() => ({}));

        if (
          !configResponse.ok ||
          !config.publicKey
        ) {
          throw new Error(
            config.error ||
              "Order push notifications are not configured."
          );
        }

        const permission =
          await Notification.requestPermission();

        if (permission !== "granted") {
          throw new Error(
            permission === "denied"
              ? "Notifications are blocked in this browser. Enable them from your browser or phone settings."
              : "Notification permission was not granted."
          );
        }

        const registration =
          await getPushRegistration();

        let subscription =
          await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription =
            await registration.pushManager.subscribe(
              {
                userVisibleOnly: true,
                applicationServerKey:
                  toApplicationServerKey(
                    config.publicKey
                  ),
              }
            );
        }

        await saveSubscription(subscription);

        setEnabled(true);
        setDismissed(false);

        const testResponse = await fetch(
          "/api/push/test",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              subscription:
                subscriptionPayload(
                  subscription
                ),
            }),
          }
        );

        if (!testResponse.ok) {
          setError(
            "Order alerts are enabled. The test alert could not be delivered yet."
          );
        }
      } catch (enableError) {
        setError(
          enableError instanceof Error
            ? enableError.message
            : "Unable to enable order notifications."
        );
      } finally {
        setBusy(false);
      }
    }, [busy, configured, supported]);

  const dismissPrompt = useCallback(() => {
    setDismissed(true);

    try {
      sessionStorage.setItem(
        "letz-push-prompt-dismissed",
        "1"
      );
    } catch {
      // Ignore storage failures.
    }
  }, []);

  useEffect(() => {
    try {
      if (
        sessionStorage.getItem(
          "letz-push-prompt-dismissed"
        ) === "1"
      ) {
        setDismissed(true);
      }
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const notificationPermission =
    typeof Notification !== "undefined"
      ? Notification.permission
      : "default";

  const showPrompt =
    !enabled &&
    !dismissed &&
    (configured || Boolean(error)) &&
    notificationPermission !== "denied";

  return (
    <>
      {showPrompt ? (
        <div className="fixed inset-x-3 bottom-[5.75rem] z-[150] mx-auto max-w-md rounded-[24px] border border-indigo-100 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.24)] md:bottom-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <BellRing className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-950">
                Never miss a new order
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Receive a phone notification when a customer places an order, even when the PWA is closed.
              </p>
            </div>

            <button
              type="button"
              aria-label="Dismiss notification prompt"
              onClick={dismissPrompt}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            disabled={
              busy ||
              !supported ||
              !configured
            }
            onClick={() =>
              void enableNotifications()
            }
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#5366B7] px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BellRing className="h-4 w-4" />
            )}
            Enable order notifications
          </button>
        </div>
      ) : null}

      {banner ? (
        <div className="fixed inset-x-3 top-3 z-[170] mx-auto max-w-md overflow-hidden rounded-[22px] border border-emerald-100 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.28)]">
          <button
            type="button"
            onClick={() => {
              const target =
                typeof banner.url === "string" &&
                banner.url.startsWith("/")
                  ? banner.url
                  : "/orders";

              window.location.href = target;
            }}
            className="flex w-full items-start gap-3 p-4 text-left"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              {banner.type === "new_order" ? (
                <ShoppingBag className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-950">
                {banner.title ||
                  "LetzShopy notification"}
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                {banner.body ||
                  "Tap to view details."}
              </div>
            </div>
          </button>

          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => {
              clearBannerTimer();
              setBanner(null);
            }}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </>
  );
}
