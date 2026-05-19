"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Smartphone,
  MonitorSmartphone,
  CheckCircle2,
  Info,
} from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent.toLowerCase();
  const isIos =
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isSafari =
    /safari/.test(ua) && !/crios|fxios|edgios|chrome|android/.test(ua);

  return isIos && isSafari;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export default function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const iosMode = useMemo(() => isIosSafari(), []);
  const canPrompt = !!deferredPrompt && !installed;
  const showCard = !installed && (!dismissed || iosMode || canPrompt);

  async function handleInstall() {
    if (!deferredPrompt) return;

    try {
      setInstalling(true);
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;

      if (result.outcome === "accepted") {
        setInstalled(true);
      } else {
        setDismissed(true);
      }
    } catch (e) {
      console.error("PWA install prompt failed:", e);
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }

  if (installed) {
    return (
      <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 shadow-sm shadow-slate-200/60 md:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
            <CheckCircle2 className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              LetzShopy App installed
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Your dashboard is installed and can open like an app from your
              home screen or desktop.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!showCard) return null;

  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-gradient-to-br from-[#eef2ff] via-white to-[#f4ecff] p-4 shadow-sm shadow-slate-200/60 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#4b5dff] text-white shadow-sm">
            <MonitorSmartphone className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Install LetzShopy App
              </h2>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#6b46ff] shadow-sm">
                Faster access
              </span>
            </div>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Add this dashboard to your phone or desktop for a cleaner
              app-like experience with quicker access.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] text-slate-600 shadow-sm">
                <Smartphone className="h-3.5 w-3.5" />
                Mobile friendly
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] text-slate-600 shadow-sm">
                <Download className="h-3.5 w-3.5" />
                Home screen access
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {canPrompt ? (
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="inline-flex items-center justify-center rounded-2xl bg-[#4b5dff] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f50eb] disabled:opacity-60"
            >
              {installing ? "Installing…" : "Install App"}
            </button>
          ) : iosMode ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4b5dff]" />
                <div>
                  <div className="font-medium text-slate-900">
                    Install on iPhone / iPad
                  </div>
                  <div className="mt-1 text-[13px] leading-5 text-slate-600">
                    Tap <span className="font-medium">Share</span> in Safari,
                    then choose{" "}
                    <span className="font-medium">Add to Home Screen</span>.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}