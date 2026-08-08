import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import {
  proxySettingsGet,
  proxySettingsPatch,
} from "@/lib/settingsProxy";

const WORDPRESS_PATH =
  "/wp-json/letz/v1/site-setup";

export async function GET() {
  const storeFeatureError = await requireStoreFeature("site_setup");
  if (storeFeatureError) return storeFeatureError;

  return proxySettingsGet(
    WORDPRESS_PATH,
    "site setup settings"
  );
}

export async function PATCH(
  request: Request
) {
  const storeFeatureError = await requireStoreFeature("site_setup");
  if (storeFeatureError) return storeFeatureError;

  return proxySettingsPatch(
    request,
    WORDPRESS_PATH,
    "site setup settings"
  );
}
