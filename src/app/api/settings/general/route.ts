import {
  proxySettingsGet,
  proxySettingsPatch,
} from "@/lib/settingsProxy";

const WORDPRESS_PATH =
  "/wp-json/letz/v1/general-settings";

export async function GET() {
  const cacheBustedPath =
    `${WORDPRESS_PATH}?_ls_nocache=${Date.now()}`;

  return proxySettingsGet(
    cacheBustedPath,
    "general settings"
  );
}

export async function PATCH(
  request: Request
) {
  return proxySettingsPatch(
    request,
    WORDPRESS_PATH,
    "general settings"
  );
}
