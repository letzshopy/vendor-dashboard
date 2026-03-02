"use client";

import { useEffect } from "react";

/**
 * Muzzles any accidental "product_lookup" writers exposed on window.
 * If some legacy code calls them, it will do nothing.
 */
export default function LookupMuzzle() {
  useEffect(() => {
    const names = [
      "insertOrIgnoreProduct",
      "upsertProductBySku",
      "insertProductLookup",
      "writeProductLookup",
      "saveProductLookup",
      "syncProductLookup",
    ] as const;

    names.forEach((n) => {
      // @ts-ignore
      const prev = window[n];
      // @ts-ignore
      window[n] = async (..._args: any[]) => {
        // eslint-disable-next-line no-console
        if (prev) console.warn(`🔇 Muzzled legacy ${n}() call`);
        return; // swallow
      };
    });
  }, []);

  return null;
}
