"use client";

import { useEffect, useRef, useState } from "react";

const WA = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "";
const BOT = (process.env.NEXT_PUBLIC_SUPPORT_BOT_ENABLED || "true") === "true";
const STORE = process.env.NEXT_PUBLIC_SITE_URL || "";

type IntentKey = "ORDER" | "SHIPPING" | "PAYMENT" | "PRODUCT" | "SUBSCRIPTION" | "HUMAN";

const INTENTS: Record<IntentKey, string> = {
  ORDER: "Order issue",
  SHIPPING: "Shipping status / NDR / RTS",
  PAYMENT: "Payment failed or pending",
  PRODUCT: "Help listing product / categories",
  SUBSCRIPTION: "Subscription or billing",
  HUMAN: "Talk to a support agent",
};

// wa.me expects digits only (no +)
function waUrl(message: string) {
  const text = encodeURIComponent(message);
  const number = WA.replace(/\D/g, ""); // keep digits only
  return `https://wa.me/${number}?text=${text}`;
}

export default function WhatsappFab() {
  const [open, setOpen] = useState(false);

  // A single container ref wrapping BOTH the button and the sheet,
  // so clicks on the button don't count as "outside"
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = containerRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function handleIntent(key: IntentKey) {
    const intro = BOT ? "Hi LetzShopy Support! I need help with:" : "Hi LetzShopy Support!";
    const msg = `${intro}\n- ${INTENTS[key]}\n\nMy store URL: ${STORE}\n(Please reply)`;
    window.open(waUrl(msg), "_blank");
    setOpen(false);
  }

  if (!WA) return null;

  return (
    <div ref={containerRef} className="fixed z-50 bottom-5 right-5">
      {/* FAB Button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="WhatsApp Support"
        className="h-14 w-14 rounded-full shadow-lg grid place-items-center text-white bg-green-600 hover:bg-green-700"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.52 3.48A11.9 11.9 0 0 0 12.06 0C5.53 0 .22 5.31.22 11.84c0 2.09.56 4.13 1.63 5.93L0 24l6.4-1.78a11.76 11.76 0 0 0 5.67 1.44h.01c6.53 0 11.84-5.31 11.84-11.84 0-3.16-1.23-6.13-3.4-8.32zM12.08 21.3h-.01a9.56 9.56 0 0 1-4.87-1.34l-.35-.21-3.8 1.06 1.02-3.7-.23-.38a9.49 9.49 0 0 1-1.46-5.08c0-5.28 4.29-9.56 9.57-9.56 2.56 0 4.96 1 6.77 2.8a9.5 9.5 0 0 1 2.8 6.76c0 5.28-4.29 9.65-9.61 9.65zm5.46-7.15c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.29-.78.98-.96 1.18-.18.19-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.64-2.05-.17-.29-.02-.45.13-.6.13-.13.3-.34.45-.51.15-.17.2-.29.3-.49.1-.2.05-.37-.03-.52-.08-.15-.68-1.64-.94-2.25-.25-.6-.51-.52-.68-.53h-.58c-.2 0-.52.07-.79.37-.27.29-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.09 4.48.71.31 1.26.5 1.69.64.71.23 1.36.2 1.87.12.57-.08 1.78-.73 2.03-1.43.25-.7.25-1.3.17-1.43-.07-.13-.27-.2-.57-.35z"/>
        </svg>
      </button>

      {/* Quick Intent Sheet */}
      {open && (
        <div className="mt-3 w-80 max-w-[90vw] rounded-xl border bg-white shadow-xl">
          <div className="p-3 border-b">
            <div className="font-medium">Need help?</div>
            <div className="text-xs text-slate-500">Choose a quick topic or talk to a human.</div>
          </div>
          <div className="p-2">
            {(
              [
                ["ORDER","📦"],
                ["SHIPPING","🚚"],
                ["PAYMENT","💳"],
                ["PRODUCT","🧺"],
                ["SUBSCRIPTION","🧾"],
                ["HUMAN","👩‍💼"],
              ] as [IntentKey, string][]
            ).map(([k, icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => handleIntent(k)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
              >
                <span className="w-5 text-center">{icon}</span>
                <span>{INTENTS[k]}</span>
              </button>
            ))}
          </div>
          <div className="px-3 pb-3 text-xs text-slate-500">
            WhatsApp to {WA}
          </div>
        </div>
      )}
    </div>
  );
}
