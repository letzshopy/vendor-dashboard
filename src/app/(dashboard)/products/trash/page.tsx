import Link from "next/link";
import { getWooClient } from "@/lib/woo";
import TrashClient from "./TrashClient";
import { ArrowLeft, Trash2 } from "lucide-react";

type P = {
  id: number;
  name: string;
  sku?: string;
  date_created?: string;
  images?: { id: number; src: string; name?: string }[];
  categories?: { id: number; name: string }[];
  type?: "simple" | "variable" | "grouped";
  catalog_visibility?: "visible" | "catalog" | "search" | "hidden";
};

export const dynamic = "force-dynamic";

async function getTrashed(): Promise<P[]> {
  try {
    const woo = await getWooClient();

    const PER_PAGE = 100;
    const MAX_PAGES = 10;
    const all: P[] = [];

    let page = 1;
    while (page <= MAX_PAGES) {
      const { data } = await woo.get<P[]>("/products", {
        params: {
          status: "trash",
          per_page: PER_PAGE,
          page,
          orderby: "date",
          order: "desc",
        },
      });

      const rows = Array.isArray(data) ? data : [];
      if (rows.length === 0) break;

      all.push(...rows);

      if (rows.length < PER_PAGE) break;
      page++;
    }

    return all;
  } catch {
    return [];
  }
}

export default async function TrashPage() {
  const items = await getTrashed();

  return (
    <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#fff7f7] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700">
              <Trash2 className="h-3.5 w-3.5" />
              Trash Bin
            </div>

            <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
              Deleted products
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Restore products back to your catalog or permanently remove them.
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <TrashClient initial={items} />
      </div>
    </main>
  );
}