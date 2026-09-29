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
      "#F8FAFC",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration:
        650,
      launchAutoHide:
        true,
      backgroundColor:
        "#F8FAFC",
      showSpinner:
        false,
    },
    StatusBar: {
      style:
        "LIGHT",
      backgroundColor:
        "#F8FAFC",
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
