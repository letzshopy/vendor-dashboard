# LetzShopy Vendor Dashboard — Final Android / Capacitor Audit

Branch: `audit/capacitor-android-final`

This audit is the release-readiness pass after the module-by-module mobile polish.

## Status legend

- ✅ Ready in the web application
- 🟡 Needs native/Android validation or wrapper work
- 🔴 Release blocker

## 1. App shell and viewport

- ✅ Mobile-first dashboard shell exists.
- ✅ Safe-area CSS variables are used for top/bottom/left/right insets.
- ✅ Bottom navigation, drawers and floating actions account for the bottom safe area.
- ✅ Final audit adds `viewport-fit=cover` through Next.js viewport metadata.
- ✅ Portrait PWA manifest and theme/background colours are configured.
- 🔴 This repository is currently a responsive/PWA Next.js application, not a Capacitor native project.
  - No `@capacitor/*` packages are present.
  - No `capacitor.config.*` exists.
  - No `android/` or `ios/` project exists.
  - Before Play Store packaging, the native wrapper architecture must be created or identified.

## 2. Navigation and Android back

- ✅ Dashboard route navigation has a unified top-edge progress indicator.
- ✅ Unsaved-change navigation guard handles links and browser history.
- ✅ Shared BottomSheet/ConfirmDialog components are touch friendly and safe-area aware.
- 🟡 Android hardware-back behaviour must be tested in the actual native shell.
- 🟡 Custom overlays such as the mobile More menu/sidebar should close before the app exits or navigates away.

## 3. Keyboard and forms

- ✅ Responsive forms use mobile-sized inputs and touch targets.
- ✅ Shared drawers use the Base UI virtual-keyboard provider.
- 🟡 Validate Android IME behaviour on Product Wizard, Order forms, Settings, Search, Forgot/Reset Password and Select Store.
- 🟡 Confirm sticky save bars remain visible above the keyboard where appropriate.

## 4. Files, uploads and camera/gallery

- ✅ Media/Product uploads use browser file inputs and unified loading feedback.
- 🟡 Validate camera/gallery picker permissions and return flow inside the Android wrapper.
- 🟡 Validate multi-image upload memory/performance on a physical Android device.

## 5. PDF and file downloads

- 🟡 Packing slips are generated in-browser with jsPDF and downloaded through a Blob + temporary `<a download>`.
- 🟡 Invoice/report download flows must be checked in Android WebView.
- 🔴 If the native WebView does not persist Blob downloads reliably, implement a Capacitor Filesystem/Share bridge before release.

## 6. External intents

- 🟡 WhatsApp support currently uses `window.open(https://wa.me/...)`.
- 🟡 Store/external links must be validated to open the intended external app/browser rather than replacing the dashboard WebView.
- 🟡 A native Browser/App Launcher bridge may be required in the final Capacitor shell.

## 7. Notifications

- ✅ Current PWA/Web Push implementation works through Service Worker + PushManager where the browser supports it.
- 🔴 This is not yet native Android push. Capacitor Android packaging should use native push notifications (FCM / Capacitor Push Notifications) if notifications are required when the native app is closed.
- 🟡 Keep the existing web-push path for browser/PWA users unless intentionally replaced.

## 8. Authentication/session

- ✅ Sign In, Forgot Password, Reset Password and Select Store have mobile layouts.
- ✅ Session and tenant cookies remain server-authoritative.
- 🟡 Test session expiry, logout, store switching and password-reset deep links inside the native shell.
- 🟡 Confirm reset/deep links route into the installed Android app only if that behaviour is desired.

## 9. Common Trash / Media Trash

- ✅ Product and Order trash UI and restore/delete workflows are implemented.
- ✅ Media Trash UI and dashboard proxy are implemented.
- 🟡 Media Trash requires the corresponding WordPress runtime endpoints to be deployed before end-to-end restore/permanent-delete works on live stores.

## 10. Final device matrix

Before release, run at minimum:

- 360×640 Android phone
- 390×844 Android phone
- 425×642 current design-validation viewport
- Physical Android device with gesture navigation
- Physical Android device with 3-button navigation
- Keyboard open/close on long forms
- Slow network / offline transition
- Session expiry during an active form
- File upload, PDF generation, WhatsApp, notification permission and logout

## Audit conclusion so far

The vendor dashboard UI is broadly mobile-ready, but Play Store / Capacitor release readiness is not complete until the native wrapper, hardware-back behaviour, external intents, file downloads and native push strategy are validated or implemented.
