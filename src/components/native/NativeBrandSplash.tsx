"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  Capacitor,
} from "@capacitor/core";
import {
  SplashScreen,
} from "@capacitor/splash-screen";

const SPLASH_SESSION_KEY =
  "ls-native-brand-splash-shown";

export default function NativeBrandSplash() {
  const [visible, setVisible] =
    useState(false);
  const [leaving, setLeaving] =
    useState(false);

  useEffect(() => {
    if (
      !Capacitor.isNativePlatform()
    ) {
      return;
    }

    let alreadyShown = false;

    try {
      alreadyShown =
        window.sessionStorage.getItem(
          SPLASH_SESSION_KEY
        ) === "1";

      if (!alreadyShown) {
        window.sessionStorage.setItem(
          SPLASH_SESSION_KEY,
          "1"
        );
      }
    } catch {
      // The animation can still run without session storage.
    }

    if (alreadyShown) {
      void SplashScreen.hide();
      return;
    }

    setVisible(true);

    const nativeHideFrame =
      window.requestAnimationFrame(
        () => {
          window.requestAnimationFrame(
            () => {
              void SplashScreen.hide();
            }
          );
        }
      );

    const leaveTimer =
      window.setTimeout(
        () =>
          setLeaving(true),
        1520
      );

    const hideTimer =
      window.setTimeout(
        () =>
          setVisible(false),
        1770
      );

    return () => {
      window.cancelAnimationFrame(
        nativeHideFrame
      );
      window.clearTimeout(
        leaveTimer
      );
      window.clearTimeout(
        hideTimer
      );
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={[
        "ls-native-brand-splash",
        leaving
          ? "is-leaving"
          : "",
      ].join(" ")}
      aria-hidden="true"
    >
      <div className="ls-native-brand-orb ls-native-brand-orb-a" />
      <div className="ls-native-brand-orb ls-native-brand-orb-b" />

      <div className="ls-native-brand-stage">
        <div className="ls-native-brand-mark-shell">
          <svg
            className="ls-native-brand-mark"
            viewBox="0 0 108 108"
            role="presentation"
          >
            <defs>
              <linearGradient
                id="ls-native-bag-gradient"
                x1="20"
                y1="14"
                x2="92"
                y2="100"
                gradientUnits="userSpaceOnUse"
              >
                <stop
                  offset="0"
                  stopColor="#0B7BFF"
                />
                <stop
                  offset="1"
                  stopColor="#1F63D8"
                />
              </linearGradient>
              <filter
                id="ls-native-bag-shadow"
                x="-30%"
                y="-30%"
                width="160%"
                height="175%"
              >
                <feDropShadow
                  dx="0"
                  dy="6"
                  stdDeviation="5"
                  floodColor="#1F63D8"
                  floodOpacity="0.18"
                />
              </filter>
            </defs>

            <g
              filter="url(#ls-native-bag-shadow)"
            >
              <path
                d="M36 36V27C36 15.5 43.8 8 54 8C64.2 8 72 15.5 72 27V36"
                fill="none"
                stroke="url(#ls-native-bag-gradient)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M26 34H82C86 34 88.5 36.8 89 40.5L93 91C93.6 98 89 102 82 102H26C19 102 14.4 98 15 91L19 40.5C19.5 36.8 22 34 26 34Z"
                fill="url(#ls-native-bag-gradient)"
              />
              <path
                d="M41 56C43.7 49.1 50 45 57.5 45C66.2 45 73.3 50.2 75.5 57.5C82.6 57.5 88 62.4 88 69C88 75.6 82.7 81 75.5 81H43.5C36.3 81 31 75.8 31 69.2C31 63.2 35.2 58.3 41 56Z"
                fill="white"
              />
              <path
                d="M44.5 61C46.8 54.9 51.6 51 57.7 51C64.2 51 69.4 55.2 71.2 61.2C77.2 61.2 82 64.6 82 69C82 73.1 78.7 76 74 76H45C40 76 37 73.2 37 69.2C37 65.2 40 62 44.5 61Z"
                fill="#1F6FE5"
              />
            </g>
          </svg>
        </div>

        <div className="ls-native-brand-copy">
          <div className="ls-native-brand-wordmark">
            letzshopy
          </div>
          <div className="ls-native-brand-tagline">
            YOUR ONLINE STORE, SIMPLIFIED
          </div>
        </div>
      </div>
    </div>
  );
}
