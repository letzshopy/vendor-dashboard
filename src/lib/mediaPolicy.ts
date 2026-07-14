export const MEDIA_PURPOSE_SCOPE = {
  product_image: "catalog",
  category_image: "catalog",
  media_library: "catalog",
  profile_logo: "system",
  vendor_upi_qr: "system",
  homepage_banner: "system",
  founder_photo: "system",
  page_image: "system",
  site_image: "system",
} as const;

export type MediaPurpose = keyof typeof MEDIA_PURPOSE_SCOPE;

export type MediaScope = (typeof MEDIA_PURPOSE_SCOPE)[MediaPurpose];

export function isMediaPurpose(value: unknown): value is MediaPurpose {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(MEDIA_PURPOSE_SCOPE, value)
  );
}

export function mediaScopeForPurpose(purpose: MediaPurpose): MediaScope {
  return MEDIA_PURPOSE_SCOPE[purpose];
}
