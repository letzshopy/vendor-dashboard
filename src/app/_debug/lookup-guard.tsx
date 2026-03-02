"use client";

import { useEffect } from "react";

/**
 * Dev-only guard:
 * 1) Logs the full stack for any error that contains "lookup table".
 * 2) Prevents the app from breaking on that error/rejection.
 * 3) Sniffs fetch responses to find which API (if any) carries that text.
 *
 * Remove this once the offending callsite is fixed.
 */
export default function LookupGuard() {
  useEffect(() => {
    const onErr = (e: ErrorEvent) => {
      const msg = String(e?.error?.message || e?.message || "");
      if (msg.toLowerCase().includes("lookup table")) {
        // Don’t let it crash the UI
        e.preventDefault();
        // Show full origin
        // eslint-disable-next-line no-console
        console.groupCollapsed("🔎 Lookup-table error (window.onerror)");
        // eslint-disable-next-line no-console
        console.error(e.error || e.message, e?.error?.stack || e?.filename);
        console.groupEnd();
      }
    };

    const onRej = (e: PromiseRejectionEvent) => {
      const msg = String(e?.reason?.message || e?.reason || "");
      if (msg.toLowerCase().includes("lookup table")) {
        e.preventDefault();
        // eslint-disable-next-line no-console
        console.groupCollapsed("🔎 Lookup-table rejection (unhandledrejection)");
        // eslint-disable-next-line no-console
        console.error(e.reason, e?.reason?.stack);
        console.groupEnd();
      }
    };

    // fetch sniffer: if any API returns that text, log URL + body
    const prevFetch: typeof fetch = window.fetch.bind(window);

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const res: Response = await prevFetch(input, init);
      try {
        const clone = res.clone();
        const text = await clone.text();
        if (text.toLowerCase().includes("lookup table")) {
          // eslint-disable-next-line no-console
          console.groupCollapsed("🔎 Lookup-table found in fetch response");
          // eslint-disable-next-line no-console
          console.log("URL:", input);
          // eslint-disable-next-line no-console
          console.log("Status:", res.status);
          // eslint-disable-next-line no-console
          console.log("Body:", text.slice(0, 1000));
          console.groupEnd();
          // Stop the cascade by returning a clean OK JSON so UI continues
          return new Response(JSON.stringify({ ok: true, _guard: "lookup" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch {
        // ignore sniffing errors
      }
      return res;
    }) as typeof fetch;

    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);

    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
      window.fetch = prevFetch;
    };
  }, []);

  return null;
}
