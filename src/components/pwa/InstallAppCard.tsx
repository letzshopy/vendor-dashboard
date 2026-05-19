"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Smartphone,
  MonitorSmartphone,
  CheckCircle2,
  Share2,
  X,
} from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedDismiss = sessionStorage.getItem("letz_pwa_install_dismissed");
    if (savedDismiss === "yes") {
      setDismissed(true);
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error ios safari
      window.navigator.standalone === true;

    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari =
      /safari/.test(ua) && !/chrome|crios|fxios|edgios|android/.test(ua);

    if (!isStandalone && isIos && isSafari) {
      setShowIosHint(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowIosHint(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;

    try {
      setInstalling(true);
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } finally {
      setInstalling(false);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("letz_pwa_install_dismissed", "yes");
    }
  }

  if (isInstalled || dismissed) return null;

  return (
    <div className="overflow-hidden rounded-[28px] border border-indigo-100 bg-gradient-to-br from-[#eef2ff] via-white to-[#f5ecff] shadow-sm shadow-slate-200/60">
      <div className="flex items-start justify-between gap-3 p-4 md:p-5">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4b5dff] to-[#8b5cff] text-white shadow-sm">
            <MonitorSmartphone className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              Install LetzShopy App
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Add your vendor dashboard to the home screen for faster access and
              an app-like experience.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-600"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 border-t border-white/70 bg-white/50 p-4 md:grid-cols-[1fr_auto] md:items-center md:p-5">
        <div className="grid gap-2 sm:grid-cols-3">
          <Feature text="Quick dashboard access" />
          <Feature text="Opens like an app" />
          <Feature text="Useful on mobile and desktop" />
        </div>

        {deferredPrompt ? (
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4b5dff] to-[#8b5cff] px-4 py-3 text-sm font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {installing ? "Installing…" : "Install app"}
          </button>
        ) : showIosHint ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-medium">
              <Smartphone className="h-4 w-4" />
              Install on iPhone / iPad
            </div>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              Tap <span className="font-semibold">Share</span>{" "}
              <Share2 className="mx-1 inline h-3.5 w-3.5" />
              then choose <span className="font-semibold">Add to Home Screen</span>.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
            Install option will appear when supported by your browser.
          </div>
        )}
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      <span>{text}</span>
    </div>
  );
}