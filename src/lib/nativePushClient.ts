"use client";

export const NATIVE_PUSH_TOKEN_STORAGE_KEY =
  "ls_native_push_token";

export async function unregisterNativePushBeforeLogout():
  Promise<boolean> {
  if (
    typeof window ===
    "undefined"
  ) {
    return true;
  }

  let token = "";

  try {
    token =
      window.localStorage.getItem(
        NATIVE_PUSH_TOKEN_STORAGE_KEY
      ) || "";
  } catch {
    return false;
  }

  token = token.trim();

  if (!token) {
    return true;
  }

  const controller =
    new AbortController();

  const timeout =
    window.setTimeout(
      () => controller.abort(),
      2500
    );

  try {
    const response =
      await fetch(
        "/api/push/native-device",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              token,
              platform:
                "android",
            }),
          cache: "no-store",
          keepalive: true,
          signal:
            controller.signal,
        }
      );

    if (!response.ok) {
      return false;
    }

    try {
      window.localStorage.removeItem(
        NATIVE_PUSH_TOKEN_STORAGE_KEY
      );
    } catch {
      // Server cleanup already succeeded.
    }

    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(
      timeout
    );
  }
}
