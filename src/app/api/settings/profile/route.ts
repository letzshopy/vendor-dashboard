import {
  proxySettingsGet,
  proxySettingsPatch,
} from "@/lib/settingsProxy";

const WORDPRESS_PATH =
  "/wp-json/letz/v1/profile-settings";

export async function GET() {
  return proxySettingsGet(
    WORDPRESS_PATH,
    "profile settings"
  );
}

export async function PATCH(
  request: Request
) {
  return proxySettingsPatch(
    request,
    WORDPRESS_PATH,
    "profile settings"
  );
}
