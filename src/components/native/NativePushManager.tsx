"use client";

import {
  BellRing,
  Loader2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Capacitor,
  type PluginListenerHandle,
} from "@capacitor/core";
import {
  PushNotifications,
  type ActionPerformed,
  type PushNotificationSchema,
  type Token,
} from "@capacitor/push-notifications";

import {
  actionFeedback,
} from "@/lib/actionFeedback";

const TOKEN_STORAGE_KEY =
  "ls_native_push_token";
const PROMPT_DISMISSED_KEY =
  "ls_native_push_prompt_dismissed";

function safeInternalPath(
  value: unknown
): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "";
  }

  return value;
}

async function saveNativeToken(
  token: string
) {
  const response = await fetch(
    "/api/push/native-device",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        token,
        platform: "android",
      }),
    }
  );

  const payload: unknown =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      typeof (
        payload as Record<
          string,
          unknown
        >
      ).error === "string"
        ? String(
            (
              payload as Record<
                string,
                unknown
              >
            ).error
          )
        : "Unable to register this device for notifications.";

    throw new Error(message);
  }

  try {
    window.localStorage.setItem(
      TOKEN_STORAGE_KEY,
      token
    );
  } catch {
    // Token registration already succeeded.
  }
}

export default function NativePushManager() {
  const [supported, setSupported] =
    useState(false);
  const [permission, setPermission] =
    useState<
      | "prompt"
      | "prompt-with-rationale"
      | "granted"
      | "denied"
    >("prompt");
  const [busy, setBusy] =
    useState(false);
  const [dismissed, setDismissed] =
    useState(false);
  const [error, setError] =
    useState("");

  const handlesRef =
    useRef<
      PluginListenerHandle[]
    >([]);

  const registerDevice =
    useCallback(async () => {
      setBusy(true);
      setError("");

      try {
        await PushNotifications.register();
      } catch (registrationError) {
        setBusy(false);

        setError(
          registrationError
            instanceof Error
            ? registrationError.message
            : "Notification registration failed."
        );
      }
    }, []);

  useEffect(() => {
    if (
      !Capacitor.isNativePlatform() ||
      Capacitor.getPlatform() !==
        "android"
    ) {
      return;
    }

    setSupported(true);

    try {
      setDismissed(
        window.localStorage.getItem(
          PROMPT_DISMISSED_KEY
        ) === "1"
      );
    } catch {
      // Ignore local storage failures.
    }

    let cancelled = false;

    void (async () => {
      try {
        const registrationHandle =
          await PushNotifications.addListener(
            "registration",
            (token: Token) => {
              void (async () => {
                try {
                  await saveNativeToken(
                    token.value
                  );

                  if (
                    !cancelled
                  ) {
                    setBusy(false);
                    setPermission(
                      "granted"
                    );
                    setDismissed(
                      true
                    );
                    setError("");

                    actionFeedback.success({
                      id:
                        "native-push-enabled",
                      title:
                        "Order alerts enabled",
                      message:
                        "This phone can now receive LetzShopy notifications.",
                      durationMs:
                        3000,
                    });
                  }
                } catch (
                  saveError
                ) {
                  if (
                    !cancelled
                  ) {
                    setBusy(false);
                    setError(
                      saveError
                        instanceof Error
                        ? saveError.message
                        : "Unable to save notification registration."
                    );
                  }
                }
              })();
            }
          );

        const errorHandle =
          await PushNotifications.addListener(
            "registrationError",
            (registrationError) => {
              if (cancelled) {
                return;
              }

              setBusy(false);
              setError(
                registrationError
                  .error ||
                  "Notification registration failed."
              );
            }
          );

        const receivedHandle =
          await PushNotifications.addListener(
            "pushNotificationReceived",
            (
              notification:
                PushNotificationSchema
            ) => {
              window.dispatchEvent(
                new CustomEvent(
                  "letzshopy:refresh-notifications"
                )
              );

              actionFeedback.info({
                id:
                  "native-push-received",
                title:
                  notification.title ||
                  "LetzShopy notification",
                message:
                  notification.body ||
                  "Open the app to view details.",
                durationMs:
                  5000,
              });
            }
          );

        const actionHandle =
          await PushNotifications.addListener(
            "pushNotificationActionPerformed",
            (
              action:
                ActionPerformed
            ) => {
              window.dispatchEvent(
                new CustomEvent(
                  "letzshopy:refresh-notifications"
                )
              );

              const target =
                safeInternalPath(
                  action.notification
                    .data?.url
                );

              if (target) {
                window.location.assign(
                  target
                );
              }
            }
          );

        handlesRef.current.push(
          registrationHandle,
          errorHandle,
          receivedHandle,
          actionHandle
        );

        try {
          await PushNotifications.createChannel(
            {
              id: "orders",
              name:
                "Order alerts",
              description:
                "New orders and payment alerts from LetzShopy",
              importance: 5,
              visibility: 1,
              vibration: true,
            }
          );
        } catch {
          // Android may already have the channel.
        }

        const current =
          await PushNotifications.checkPermissions();

        if (cancelled) {
          return;
        }

        setPermission(
          current.receive
        );

        if (
          current.receive ===
          "granted"
        ) {
          await registerDevice();
        }
      } catch (
        bootstrapError
      ) {
        if (!cancelled) {
          setBusy(false);
          setError(
            bootstrapError
              instanceof Error
              ? bootstrapError.message
              : "Notification setup could not be checked."
          );
        }
      }
    })();

    return () => {
      cancelled = true;

      for (
        const handle
        of handlesRef.current
      ) {
        void handle.remove();
      }

      handlesRef.current = [];
    };
  }, [registerDevice]);

  const enableNotifications =
    useCallback(async () => {
      if (
        !supported ||
        busy
      ) {
        return;
      }

      setBusy(true);
      setError("");

      try {
        const result =
          await PushNotifications.requestPermissions();

        setPermission(
          result.receive
        );

        if (
          result.receive !==
          "granted"
        ) {
          setBusy(false);
          setError(
            result.receive ===
              "denied"
              ? "Notifications are blocked. Enable them from Android App Info > Notifications."
              : "Notification permission was not granted."
          );
          return;
        }

        await registerDevice();
      } catch (
        permissionError
      ) {
        setBusy(false);
        setError(
          permissionError
            instanceof Error
            ? permissionError.message
            : "Unable to enable notifications."
        );
      }
    }, [
      busy,
      registerDevice,
      supported,
    ]);

  const dismissPrompt =
    useCallback(() => {
      setDismissed(true);

      try {
        window.localStorage.setItem(
          PROMPT_DISMISSED_KEY,
          "1"
        );
      } catch {
        // Ignore local storage failures.
      }
    }, []);

  const showPrompt =
    supported &&
    !dismissed &&
    permission !== "granted";

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-[5.75rem] z-[175] mx-auto max-w-md rounded-[24px] border border-[#D8E4F3] bg-white p-4 shadow-[0_24px_60px_rgba(23,35,60,0.24)] md:bottom-5">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#EEF5FF] text-[#1F63D8]">
          <BellRing className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-[#17233C]">
            Turn on order alerts
          </div>
          <p className="mt-1 text-xs leading-5 text-[#6B748A]">
            Get a phone notification for new orders and important payment actions, even when LetzShopy is closed.
          </p>
        </div>

        <button
          type="button"
          aria-label="Not now"
          onClick={
            dismissPrompt
          }
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#94A3B8] hover:bg-slate-100"
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
        disabled={busy}
        onClick={() =>
          void enableNotifications()
        }
        className="ls-focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#1F63D8] px-4 text-sm font-extrabold text-white shadow-sm disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <BellRing className="h-4 w-4" />
        )}
        Enable notifications
      </button>
    </div>
  );
}
