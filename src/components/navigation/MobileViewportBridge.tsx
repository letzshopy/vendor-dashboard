"use client";

import {
  useEffect,
} from "react";

const KEYBOARD_THRESHOLD_PX =
  120;

export default function MobileViewportBridge() {
  useEffect(() => {
    if (
      typeof window ===
        "undefined"
    ) {
      return;
    }

    const root =
      document.documentElement;
    const body =
      document.body;

    function updateViewport() {
      const viewport =
        window.visualViewport;

      const visualHeight =
        viewport?.height ||
        window.innerHeight;

      const offsetTop =
        viewport?.offsetTop ||
        0;

      const keyboardInset =
        Math.max(
          0,
          window.innerHeight -
            visualHeight -
            offsetTop
        );

      const keyboardOpen =
        window.innerWidth <
          768 &&
        keyboardInset >
          KEYBOARD_THRESHOLD_PX;

      root.style.setProperty(
        "--ls-visual-viewport-height",
        `${Math.round(
          visualHeight
        )}px`
      );

      root.style.setProperty(
        "--ls-keyboard-inset",
        keyboardOpen
          ? `${Math.round(
              keyboardInset
            )}px`
          : "0px"
      );

      body.classList.toggle(
        "ls-keyboard-open",
        keyboardOpen
      );
    }

    updateViewport();

    window.addEventListener(
      "resize",
      updateViewport,
      {
        passive: true,
      }
    );

    window.visualViewport?.addEventListener(
      "resize",
      updateViewport,
      {
        passive: true,
      }
    );

    window.visualViewport?.addEventListener(
      "scroll",
      updateViewport,
      {
        passive: true,
      }
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateViewport
      );

      window.visualViewport?.removeEventListener(
        "resize",
        updateViewport
      );

      window.visualViewport?.removeEventListener(
        "scroll",
        updateViewport
      );

      body.classList.remove(
        "ls-keyboard-open"
      );

      root.style.removeProperty(
        "--ls-visual-viewport-height"
      );

      root.style.removeProperty(
        "--ls-keyboard-inset"
      );
    };
  }, []);

  return null;
}
