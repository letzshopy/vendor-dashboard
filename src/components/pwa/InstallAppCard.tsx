"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissedFlag = window.localStorage.getItem(
      "letz_pwa_install_card_dismissed"
    );
    if (dismissedFlag === "1") {
      setDismissed(true);
    }

    const checkInstalled = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-expect-error iOS Safari standalone
        window.navigator.standalone === true;

      setIsInstalled(standalone);
    };

    checkInstalled();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setDismissed(true);
      window.localStorage.setItem("letz_pwa_install_card_dismissed", "1");
    };

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

  async function handleInstall() {
    if (!deferredPrompt) return;

    try {
      setInstalling(true);
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } catch (error) {
      console.warn("PWA install prompt failed:", error);
    } finally {
      setInstalling(false);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("letz_pwa_install_card_dismissed", "1");
    }
  }

  if (dismissed || isInstalled) return null;

  const canInstall = !!deferredPrompt;

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <Smartphone className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-900">
              Install LetzShopy App
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              Add your dashboard to your device for faster access.
            </p>

            <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleInstall}
                disabled={!canInstall || installing}
                className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  canInstall
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Download className="h-4 w-4" />
                {installing ? "Installing..." : "Install App"}
              </button>

              <p className="text-xs text-slate-500 sm:text-sm">
                {canInstall
                  ? "Opens like an app on mobile and desktop."
                  : "Install option will appear when supported by your browser."}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Dismiss install banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}