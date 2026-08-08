import type { SessionStoreType } from "./session";

export type StoreFeature =
  | "menu"
  | "payments"
  | "variation_galleries"
  | "general_settings"
  | "profile"
  | "site_setup"
  | "shipping"
  | "welcome_offer"
  | "kyc"
  | "domain_renewal"
  | "subscription_billing"
  | "onboarding"
  | "customer_feedback"
  | "sale_events"
  | "upi"
  | "account_mutation"
  | "storefront_suspend";

const STANDALONE_V1_BLOCKED_FEATURES =
  new Set<StoreFeature>([
    "menu",
    "payments",
    "variation_galleries",
    "general_settings",
    "profile",
    "site_setup",
    "shipping",
    "welcome_offer",
    "kyc",
    "domain_renewal",
    "subscription_billing",
    "onboarding",
    "customer_feedback",
    "sale_events",
    "upi",
    "account_mutation",
    "storefront_suspend",
  ]);

const STANDALONE_V1_ALLOWED_SETTINGS_TABS =
  new Set(["tax", "shipmentFulfillment"]);

const STANDALONE_V1_BLOCKED_PATH_PREFIXES = [
  "/menu",
  "/sales/feedback",
  "/billing/subscription",
  "/subscription-bills",
  "/offers-discounts/sale-events",
  "/offers-discounts/welcome-offer",
] as const;

export function isStoreFeatureAllowed(
  storeType: SessionStoreType | undefined,
  feature: StoreFeature
): boolean {
  return (
    (storeType || "multisite") !== "standalone" ||
    !STANDALONE_V1_BLOCKED_FEATURES.has(feature)
  );
}

export function isStandaloneV1SettingsTabAllowed(
  storeType: SessionStoreType | undefined,
  tab: string
): boolean {
  if ((storeType || "multisite") !== "standalone") {
    return true;
  }

  return STANDALONE_V1_ALLOWED_SETTINGS_TABS.has(
    String(tab || "").trim()
  );
}

export function isStandaloneV1DashboardPathAllowed(
  storeType: SessionStoreType | undefined,
  pathname: string
): boolean {
  if ((storeType || "multisite") !== "standalone") {
    return true;
  }

  const normalized =
    String(pathname || "/").split("?")[0] || "/";

  return !STANDALONE_V1_BLOCKED_PATH_PREFIXES.some(
    (prefix) =>
      normalized === prefix ||
      normalized.startsWith(`${prefix}/`)
  );
}

export function isStandaloneV1NavigationHrefAllowed(
  storeType: SessionStoreType | undefined,
  href: string
): boolean {
  if ((storeType || "multisite") !== "standalone") {
    return true;
  }

  let url: URL;

  try {
    url = new URL(href, "http://local");
  } catch {
    return false;
  }

  if (
    !isStandaloneV1DashboardPathAllowed(
      storeType,
      url.pathname
    )
  ) {
    return false;
  }

  if (url.pathname === "/settings") {
    const tab = url.searchParams.get("tab");

    return (
      !tab ||
      isStandaloneV1SettingsTabAllowed(
        storeType,
        tab
      )
    );
  }

  return true;
}
