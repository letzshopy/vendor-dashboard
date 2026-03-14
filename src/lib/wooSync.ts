// src/lib/wooSync.ts
import { getWooClient } from "@/lib/woo";

/**
 * Map our general > products settings to Woo options via /settings API.
 * We split updates across Woo "general" and "products" groups.
 */
export async function syncWooGeneralProducts(products: {
  currency?: string;
  priceDecimals?: number;
  weightUnit?: string;
  dimensionUnit?: string;
  reviewsEnabled?: boolean;
  manageStock?: boolean;
  notifyLowStock?: boolean;
  notifyNoStock?: boolean;
  stockEmailRecipient?: string;
  lowStockThreshold?: number;
  hideOutOfStock?: boolean;
  stockDisplayFormat?: "no_amount" | "always" | "low_amount";
}) {
  const woo = await getWooClient();

  // Build payloads (skip undefined)
  const generalUpdates: Array<{ id: string; value: any }> = [];
  const productsUpdates: Array<{ id: string; value: any }> = [];

  const yn = (b?: boolean) => (b ? "yes" : "no");

  // GENERAL group
  if (products.currency != null)
    generalUpdates.push({ id: "woocommerce_currency", value: products.currency });

  if (products.weightUnit != null)
    generalUpdates.push({ id: "woocommerce_weight_unit", value: products.weightUnit });

  if (products.dimensionUnit != null)
    generalUpdates.push({
      id: "woocommerce_dimension_unit",
      value: products.dimensionUnit,
    });

  if (products.priceDecimals != null)
    generalUpdates.push({
      id: "woocommerce_price_num_decimals",
      value: String(products.priceDecimals),
    });

  // PRODUCTS group
  if (products.reviewsEnabled != null)
    productsUpdates.push({
      id: "woocommerce_enable_reviews",
      value: yn(products.reviewsEnabled),
    });

  if (products.manageStock != null)
    productsUpdates.push({
      id: "woocommerce_manage_stock",
      value: yn(products.manageStock),
    });

  if (products.notifyLowStock != null)
    productsUpdates.push({
      id: "woocommerce_notify_low_stock",
      value: yn(products.notifyLowStock),
    });

  if (products.notifyNoStock != null)
    productsUpdates.push({
      id: "woocommerce_notify_no_stock",
      value: yn(products.notifyNoStock),
    });

  if (products.stockEmailRecipient != null)
    productsUpdates.push({
      id: "woocommerce_stock_email_recipient",
      value: products.stockEmailRecipient,
    });

  if (products.lowStockThreshold != null)
    productsUpdates.push({
      id: "woocommerce_notify_low_stock_amount",
      value: String(products.lowStockThreshold),
    });

  if (products.hideOutOfStock != null)
    productsUpdates.push({
      id: "woocommerce_hide_out_of_stock_items",
      value: yn(products.hideOutOfStock),
    });

  if (products.stockDisplayFormat != null) {
    productsUpdates.push({
      id: "woocommerce_stock_format",
      value: products.stockDisplayFormat,
    });
  }

  // nothing to do
  if (!generalUpdates.length && !productsUpdates.length) {
    return { ok: true as const };
  }

  const calls: Promise<any>[] = [];
  if (generalUpdates.length) {
    calls.push(woo.put("/settings/general/batch", { update: generalUpdates }));
  }
  if (productsUpdates.length) {
    calls.push(woo.put("/settings/products/batch", { update: productsUpdates }));
  }

  const results = await Promise.allSettled(calls);

  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "rejected") {
      const e: any = r.reason;
      errors.push(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Woo settings batch failed"
      );
    }
  }

  if (errors.length) {
    return { ok: false as const, errors };
  }

  return { ok: true as const };
}