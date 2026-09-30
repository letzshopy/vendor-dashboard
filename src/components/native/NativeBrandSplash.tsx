"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

declare global {
  interface Window {
    LetzShopyBrand?: {
      ready?: () => void;
    };
  }
}

export default function NativeBrandSplash() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    void SplashScreen.hide();

    const signalNativeReady = () => {
      try {
        window.LetzShopyBrand?.ready?.();
      } catch {
        // Native splash overlay includes a fallback timeout.
      }
    };

    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(signalNativeReady);
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
    };
  }, []);

  return null;
}
