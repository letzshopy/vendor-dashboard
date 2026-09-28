import type {
  CapacitorConfig,
} from "@capacitor/cli";

const productionUrl =
  "https://dashboard.letzshopy.in";

const configuredUrl =
  process.env
    .CAPACITOR_SERVER_URL
    ?.trim();

const serverUrl =
  configuredUrl ||
  productionUrl;

const config: CapacitorConfig = {
  appId:
    "in.letzshopy.vendor",
  appName:
    "LetzShopy Vendor",
  webDir:
    "capacitor-web",
  server: {
    url: serverUrl,
    cleartext:
      serverUrl.startsWith(
        "http://"
      ),
  },
  android: {
    allowMixedContent:
      false,
    backgroundColor:
      "#F8F9FC",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration:
        900,
      launchAutoHide:
        true,
      backgroundColor:
        "#182451",
      showSpinner:
        false,
    },
    StatusBar: {
      style:
        "LIGHT",
      backgroundColor:
        "#182451",
    },
    Keyboard: {
      resize:
        "native",
      resizeOnFullScreen:
        true,
    },
  },
};

export default config;
