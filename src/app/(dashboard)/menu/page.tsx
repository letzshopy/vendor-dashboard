"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ChevronRight,
  FolderTree,
  LayoutList,
  MenuSquare,
  PanelTop,
} from "lucide-react";

type MenuKey = "primary" | "footer_discover" | "footer_info";

const MENUS: {
  key: MenuKey;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "primary",
    label: "Primary Menu",
    desc: "Main storefront navigation and mobile off-canvas menu.",
    icon: PanelTop,
  },
  {
    key: "footer_discover",
    label: "Footer - Discover",
    desc: "Links shown in the footer discover section.",
    icon: FolderTree,
  },
  {
    key: "footer_info",
    label: "Footer - Information",
    desc: "Links shown in the footer information section.",
    icon: LayoutList,
  },
];

export default function MenuPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/menu/primary");
  }, [router]);

  return (
    <main className="mx-auto max-w-7xl px-3 py-3 md:px-4 md:py-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#faf6ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
          <MenuSquare className="h-3.5 w-3.5" />
          Menu Builder
        </div>

        <div className="mt-3">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
            Choose Menu
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Select which storefront menu you want to manage.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {MENUS.map((menu) => {
          const Icon = menu.icon;

          return (
            <Link
              key={menu.key}
              href={`/menu/${menu.key}`}
              className="group rounded-[26px] border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:border-violet-300 hover:bg-violet-50/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-50 text-violet-700 shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>

                <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:text-violet-500" />
              </div>

              <div className="mt-4">
                <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
                  {menu.label}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {menu.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}