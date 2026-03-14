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

    // ✅ When locked, allow any Settings tab/page
    const isAllowed = pathname.startsWith("/settings");

    if (!isAllowed) {
      router.replace("/settings?tab=account");
    }
  }, [locked, pathname, router]);

  return null;
}
