import { requireStoreFeature } from "@/lib/storeCapabilityServer";
import {
  proxySettingsGet,
  proxySettingsPatch,
} from "@/lib/settingsProxy";

const WORDPRESS_PATH =
  "/wp-json/letz/v1/profile-settings";

export async function GET() {
  const storeFeatureError = await requireStoreFeature("profile");
  if (storeFeatureError) return storeFeatureError;

  return proxySettingsGet(
    WORDPRESS_PATH,
    "profile settings"
  );
}

export async function PATCH(
  request: Request
) {
  const storeFeatureError = await requireStoreFeature("profile");
  if (storeFeatureError) return storeFeatureError;

  return proxySettingsPatch(
    request,
    WORDPRESS_PATH,
    "profile settings"
  );
}
