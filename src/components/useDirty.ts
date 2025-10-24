// src/components/useDirty.ts
"use client";

import { useEffect, useMemo, useRef } from "react";

export function useDirty<T extends object>(initial: T, current: T) {
  // snapshot initial only once
  const initRef = useRef<T>(initial);
  // shallow-ish compare via JSON — simple and robust for forms
  const dirty = useMemo(
    () => JSON.stringify(current) !== JSON.stringify(initRef.current),
    [current]
  );
  // allow resetting initial after a successful save:
  const reset = (next: T) => {
    initRef.current = next;
  };
  return { dirty, reset };
}
