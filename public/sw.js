self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Minimal fetch handler keeps the dashboard installable as a PWA.
});

function safeNotificationPayload(raw) {
  const value =
    raw && typeof raw === "object"
      ? raw
      : {};

  const title =
    typeof value.title === "string" &&
    value.title.trim()
      ? value.title.trim().slice(0, 120)
      : "LetzShopy";

  const body =
    typeof value.body === "string"
      ? value.body.trim().slice(0, 240)
      : "";

  const url =
    typeof value.url === "string" &&
    value.url.startsWith("/")
      ? value.url
      : "/dashboard";

  const tag =
    typeof value.tag === "string" &&
    value.tag.trim()
      ? value.tag.trim().slice(0, 120)
      : "letzshopy-notification";

  return {
    type:
      value.type === "new_order"
        ? "new_order"
        : "test",
    title,
    body,
    url,
    tag,
    orderId:
      Number.isSafeInteger(value.orderId) &&
      value.orderId > 0
        ? value.orderId
        : undefined,
    orderNumber:
      typeof value.orderNumber === "string"
        ? value.orderNumber.slice(0, 64)
        : undefined,
  };
}

self.addEventListener("push", (event) => {
  let rawPayload = {};

  try {
    rawPayload = event.data
      ? event.data.json()
      : {};
  } catch {
    rawPayload = {};
  }

  const payload =
    safeNotificationPayload(rawPayload);

  const notifyPromise =
    self.registration.showNotification(
      payload.title,
      {
        body: payload.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: payload.tag,
        renotify: false,
        silent: false,
        vibrate: [180, 90, 180, 90, 260],
        data: {
          url: payload.url,
          type: payload.type,
          orderId: payload.orderId,
          orderNumber: payload.orderNumber,
        },
      }
    );

  const informOpenClients =
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type:
              "LETZ_ORDER_PUSH_RECEIVED",
            payload,
          });
        }
      });

  event.waitUntil(
    Promise.all([
      notifyPromise,
      informOpenClients,
    ])
  );
});

async function openNotificationTarget(
  targetUrl
) {
  // On Android, opening the in-scope URL first gives Chrome the best
  // chance to foreground the installed PWA instead of navigating a
  // stale background client that may remain invisible to the user.
  try {
    const opened =
      await self.clients.openWindow(targetUrl);

    if (opened && "focus" in opened) {
      await opened.focus();
      return;
    }
  } catch {
    // Fall back to an existing controlled window below.
  }

  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of windows) {
    let sameOrigin = false;

    try {
      sameOrigin =
        new URL(client.url).origin ===
        self.location.origin;
    } catch {
      sameOrigin = false;
    }

    if (!sameOrigin) {
      continue;
    }

    try {
      if (
        "navigate" in client &&
        client.url !== targetUrl
      ) {
        await client.navigate(targetUrl);
      }

      await client.focus();
      return;
    } catch {
      // Try another same-origin client.
    }
  }
}

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const data =
      event.notification.data &&
      typeof event.notification.data ===
        "object"
        ? event.notification.data
        : {};

    const path =
      typeof data.url === "string" &&
      data.url.startsWith("/")
        ? data.url
        : "/dashboard";

    const targetUrl = new URL(
      path,
      self.location.origin
    ).href;

    event.waitUntil(
      openNotificationTarget(targetUrl)
    );
  }
);
