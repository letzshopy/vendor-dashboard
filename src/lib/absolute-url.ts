// src/lib/absolute-url.ts
import { headers } from "next/headers";

export function getBaseUrl() {
  // In Next 15, the typings can show headers() as Promise-like in some contexts.
  // We know at runtime this behaves like a Headers/ReadonlyHeaders object,
  // so we cast it to keep this helper synchronous.
  const h = headers() as unknown as Headers;

  const proto = h.get("x-forwarded-proto") ?? "http";
  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    "localhost:3000";

  return `${proto}://${host}`;
}
