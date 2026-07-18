"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  locked: boolean;
};

export default function LockedDashboardRedirect({ locked }: Props) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (!locked) return;

    const isAllowed =
      pathname.startsWith("/settings") ||
      pathname.startsWith("/billing/subscription") ||
      pathname.startsWith("/subscription-bills");

    if (!isAllowed) {
      router.replace("/billing/subscription");
    }
  }, [locked, pathname, router]);

  return null;
}