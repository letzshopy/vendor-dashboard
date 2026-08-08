import "server-only";

import { NextResponse } from "next/server";

import {
  isStoreFeatureAllowed,
  type StoreFeature,
} from "./storeCapabilities";
import { getTenantFromCookies } from "./tenant";

export async function isCurrentStoreFeatureAllowed(
  feature: StoreFeature
): Promise<boolean> {
  const tenant = await getTenantFromCookies();

  return Boolean(
    tenant &&
      isStoreFeatureAllowed(
        tenant.store_type,
        feature
      )
  );
}

export async function requireStoreFeature(
  feature: StoreFeature
): Promise<NextResponse | null> {
  const tenant = await getTenantFromCookies();

  if (!tenant) {
    return NextResponse.json(
      { error: "Unauthorized." },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store, private",
        },
      }
    );
  }

  if (
    !isStoreFeatureAllowed(
      tenant.store_type,
      feature
    )
  ) {
    return NextResponse.json(
      {
        error:
          "This feature is not enabled for this standalone store yet.",
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store, private",
        },
      }
    );
  }

  return null;
}

export async function assertStoreFeatureAvailable(
  feature: StoreFeature
): Promise<void> {
  const tenant = await getTenantFromCookies();

  if (!tenant) {
    throw new Error(
      "No verified vendor store is selected."
    );
  }

  if (
    !isStoreFeatureAllowed(
      tenant.store_type,
      feature
    )
  ) {
    throw new Error(
      "This feature is not enabled for this standalone store yet."
    );
  }
}
