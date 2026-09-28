"use client";

import {
  useEffect,
} from "react";
import {
  App,
} from "@capacitor/app";
import {
  Capacitor,
  type PluginListenerHandle,
} from "@capacitor/core";

import {
  LETZSHOPY_NATIVE_BACK_EVENT,
} from "@/lib/nativeNavigation";

const DASHBOARD_HOST =
  "dashboard.letzshopy.in";

function routeNativeUrl(
  rawUrl: string
) {
  try {
    const incoming =
      new URL(rawUrl);

    if (
      incoming.hostname !==
      DASHBOARD_HOST
    ) {
      return;
    }

    const nextPath =
      `${incoming.pathname}${incoming.search}${incoming.hash}`;

    const currentPath =
      `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (
      nextPath &&
      nextPath !==
        currentPath
    ) {
      window.location.assign(
        nextPath
      );
    }
  } catch {
    // Ignore malformed external URLs.
  }
}

export default function CapacitorNativeBridge() {
  useEffect(() => {
    if (
      !Capacitor.isNativePlatform()
    ) {
      return;
    }

    let disposed =
      false;

    const handles:
      PluginListenerHandle[] =
      [];

    void (async () => {
      const backHandle =
        await App.addListener(
          "backButton",
          ({
            canGoBack,
          }) => {
            const backEvent =
              new Event(
                LETZSHOPY_NATIVE_BACK_EVENT,
                {
                  cancelable:
                    true,
                }
              );

            const notHandled =
              window.dispatchEvent(
                backEvent
              );

            if (
              !notHandled
            ) {
              return;
            }

            if (
              canGoBack &&
              window.history
                .length >
                1
            ) {
              window.history.back();
              return;
            }

            if (
              Capacitor.getPlatform() ===
              "android"
            ) {
              void App.minimizeApp();
            }
          }
        );

      if (disposed) {
        void backHandle.remove();
      } else {
        handles.push(
          backHandle
        );
      }

      const urlHandle =
        await App.addListener(
          "appUrlOpen",
          ({
            url,
          }) => {
            routeNativeUrl(
              url
            );
          }
        );

      if (disposed) {
        void urlHandle.remove();
      } else {
        handles.push(
          urlHandle
        );
      }
    })();

    return () => {
      disposed = true;

      handles.forEach(
        (handle) => {
          void handle.remove();
        }
      );
    };
  }, []);

  return null;
}
