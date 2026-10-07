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
    <section className="overflow-hidden rounded-2xl border border-[#E1E6F0] bg-white shadow-[0_8px_24px_rgba(38,51,95,0.05)]">
      <div className="flex items-start gap-3 border-l-4 border-[#4059A7] px-4 py-4 sm:px-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4059A7] text-white">
          <Smartphone className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-base font-extrabold text-[#182451]">
            Install LetzShopy App
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Add the vendor dashboard to this device for quicker access.
          </p>

          <div className="mt-3">
            <button
              type="button"
              onClick={handleInstall}
              disabled={!canInstall || installing}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition ${
                canInstall
                  ? "bg-[#F15E4A] text-white hover:bg-[#D84F3E]"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
              }`}
            >
              <Download className="h-4 w-4" />
              {installing ? "Installing…" : "Install App"}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          aria-label="Dismiss install banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}