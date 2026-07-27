// src/app/(dashboard)/offers-discounts/sale-events/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSaleEvent,
  deleteSaleEvent,
  updateSaleEvent,
  type SaleEventPayload,
  type SalePricingType,
} from "@/lib/saleEventsApi";

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "1";
}

function jsonValue<T>(formData: FormData, key: string, fallback: T): T {
  try {
    const raw = value(formData, key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function pricingTypeValue(formData: FormData): SalePricingType {
  const type = value(formData, "pricing_type");
  if (type === "fixed_amount" || type === "manual" || type === "free_shipping") return type;
  return "percentage";
}

function payloadFromFormData(formData: FormData): SaleEventPayload {
  const pricingType = pricingTypeValue(formData);

  return {
    title: value(formData, "title"),
    start_date: value(formData, "start_date"),
    end_date: value(formData, "end_date"),
    category_ids: jsonValue<number[]>(formData, "category_ids_json", []),
    explicit_product_ids: jsonValue<number[]>(
      formData,
      "explicit_product_ids_json",
      []
    ),
    excluded_product_ids: jsonValue<number[]>(
      formData,
      "excluded_product_ids_json",
      []
    ),
    pricing_type: pricingType,
    discount_value:
      pricingType === "free_shipping"
        ? 0
        : Number(value(formData, "discount_value") || 0),
    manual_prices:
      pricingType === "manual"
        ? jsonValue<Record<string, number>>(
            formData,
            "manual_prices_json",
            {}
          )
        : {},
    free_shipping: pricingType === "free_shipping",
    homepage_visible: boolValue(formData, "homepage_visible"),
    promotional_copy: value(formData, "promotional_copy"),
  };
}

export async function createSaleEventAction(formData: FormData) {
  await createSaleEvent(payloadFromFormData(formData));
  revalidatePath("/offers-discounts/sale-events");
  redirect("/offers-discounts/sale-events");
}

export async function updateSaleEventAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) return;

  await updateSaleEvent(id, payloadFromFormData(formData));
  revalidatePath("/offers-discounts/sale-events");
  revalidatePath(`/offers-discounts/sale-events/${id}`);
  redirect("/offers-discounts/sale-events");
}

export async function deleteSaleEventAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) return;

  await deleteSaleEvent(id);
  revalidatePath("/offers-discounts/sale-events");
  redirect("/offers-discounts/sale-events");
}
