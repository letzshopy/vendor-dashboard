"use client";

import {
  usePathname,
  useSearchParams,
} from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
} from "react";

const MIN_VISIBLE_MS = 220;

export default function NavigationProgress() {
  const pathname =
    usePathname() || "/";
  const searchParams =
    useSearchParams();
  const locationKey =
    `${pathname}?${searchParams.toString()}`;

  const [active, setActive] =
    useState(false);
  const startedAtRef =
    useRef(0);
  const previousLocationRef =
    useRef(locationKey);

  useEffect(() => {
    function startProgress() {
      startedAtRef.current =
        performance.now();

      setActive(true);
    }

    function onClick(
      event: MouseEvent
    ) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target =
        event.target as
          | HTMLElement
          | null;

      const anchor =
        target?.closest(
          "a[href]"
        ) as HTMLAnchorElement | null;

      if (
        !anchor ||
        anchor.hasAttribute(
          "download"
        ) ||
        (
          anchor.target &&
          anchor.target !== "_self"
        )
      ) {
        return;
      }

      const rawHref =
        anchor.getAttribute(
          "href"
        );

      if (
        !rawHref ||
        rawHref.startsWith("#") ||
        rawHref.startsWith(
          "mailto:"
        ) ||
        rawHref.startsWith(
          "tel:"
        )
      ) {
        return;
      }

      let nextUrl: URL;

      try {
        nextUrl = new URL(
          anchor.href,
          window.location.href
        );
      } catch {
        return;
      }

      if (
        nextUrl.origin !==
        window.location.origin
      ) {
        return;
      }

      const currentUrl =
        new URL(
          window.location.href
        );

      if (
        nextUrl.pathname ===
          currentUrl.pathname &&
        nextUrl.search ===
          currentUrl.search &&
        nextUrl.hash ===
          currentUrl.hash
      ) {
        return;
      }

      startProgress();
    }

    function onProgrammaticNavigation() {
      startProgress();
    }

    document.addEventListener(
      "click",
      onClick,
      true
    );

    window.addEventListener(
      "letzshopy:navigation-start",
      onProgrammaticNavigation
    );

    return () => {
      document.removeEventListener(
        "click",
        onClick,
        true
      );

      window.removeEventListener(
        "letzshopy:navigation-start",
        onProgrammaticNavigation
      );
    };
  }, []);

  useEffect(() => {
    if (
      previousLocationRef.current ===
      locationKey
    ) {
      return;
    }

    previousLocationRef.current =
      locationKey;

    const elapsed =
      performance.now() -
      startedAtRef.current;

    const remaining =
      Math.max(
        0,
        MIN_VISIBLE_MS - elapsed
      );

    const timer =
      window.setTimeout(
        () =>
          setActive(false),
        remaining
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [locationKey]);

  if (!active) {
    return null;
  }

  return (
    <div
      className="ls-navigation-progress"
      role="progressbar"
      aria-label="Loading page"
      aria-valuetext="Loading"
    >
      <span />
    </div>
  );
}
